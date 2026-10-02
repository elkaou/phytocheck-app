"""Tests de régression pour les métadonnées mises à jour par la conversion E-Phy."""

import tempfile
import unittest
import json
from pathlib import Path

from scripts import convert_ephy_to_json as converter


class UpdateTermsDatabaseDateTests(unittest.TestCase):
    def test_updates_the_database_date_in_markdown_and_html_terms(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            markdown_terms = root / "TERMS_OF_SERVICE.md"
            html_terms = root / "terms-of-service.html"

            markdown_terms.write_text(
                "**Date actuelle de la base** : 21/01/2026\n",
                encoding="utf-8",
            )
            html_terms.write_text(
                "<p><strong>Date actuelle de la base</strong> : 15/04/2026</p>\n",
                encoding="utf-8",
            )

            original_markdown_terms = converter.TERMS_OF_SERVICE
            original_html_terms = converter.TERMS_OF_SERVICE_HTML
            try:
                converter.TERMS_OF_SERVICE = markdown_terms
                converter.TERMS_OF_SERVICE_HTML = html_terms

                converter.update_terms_database_date("30/08/2026")
            finally:
                converter.TERMS_OF_SERVICE = original_markdown_terms
                converter.TERMS_OF_SERVICE_HTML = original_html_terms

            self.assertIn("**Date actuelle de la base** : 30/08/2026", markdown_terms.read_text(encoding="utf-8"))
            self.assertIn("<strong>Date actuelle de la base</strong> : 30/08/2026</p>", html_terms.read_text(encoding="utf-8"))


class UpdateManifestTests(unittest.TestCase):
    def test_preserves_article_53_metadata_when_ephy_is_refreshed(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            local_manifest = root / "assets" / "data" / "manifest.json"
            local_manifest.parent.mkdir(parents=True)
            remote_manifest = root / "phytocheck-data" / "manifest.json"
            remote_manifest.parent.mkdir(parents=True)
            emergency = {
                "updated_at": "2026-10-02T11:49:03Z",
                "count": 60,
                "active_source_count": 60,
            }
            local_manifest.write_text(
                json.dumps({"version": "1.0", "emergency_authorizations": emergency}),
                encoding="utf-8",
            )
            remote_manifest.write_text(
                json.dumps({"version": "1.0", "emergency_authorizations": emergency}),
                encoding="utf-8",
            )

            original_root = converter.PROJECT_ROOT
            original_search_paths = converter.MANIFEST_SEARCH_PATHS
            try:
                converter.PROJECT_ROOT = root
                converter.MANIFEST_SEARCH_PATHS = [remote_manifest]
                converter.update_manifest("02/10/2026", 17218, 2540, 18556)
            finally:
                converter.PROJECT_ROOT = original_root
                converter.MANIFEST_SEARCH_PATHS = original_search_paths

            for manifest_path in (local_manifest, remote_manifest):
                manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                self.assertEqual(manifest["updated_at"], "02/10/2026")
                self.assertEqual(manifest["products_count"], 17218)
                self.assertEqual(manifest["risks_count"], 2540)
                self.assertEqual(manifest["usages_count"], 18556)
                self.assertEqual(manifest["emergency_authorizations"], emergency)


class UpdateDataBatchTests(unittest.TestCase):
    def test_uses_a_single_line_python_zip_extraction_command_for_cmd(self):
        batch_file = converter.PROJECT_ROOT / "update_data.bat"
        content = batch_file.read_text(encoding="utf-8")

        self.assertIn(
            "python -c \"import zipfile; z=zipfile.ZipFile(r'%ZIP_FILE%'); z.extract('produits_utf8.csv', '.'); z.extract('produits_phrases_de_risque_utf8.csv', '.'); z.close()\"",
            content,
        )
        self.assertNotIn("import zipfile, sys\n", content)

    def test_uses_github_remote_only_when_it_targets_the_official_repository(self):
        batch_file = converter.PROJECT_ROOT / "update_data.bat"
        content = batch_file.read_text(encoding="utf-8")

        self.assertIn("set APP_REMOTE=origin", content)
        self.assertIn("git remote get-url github", content)
        self.assertIn("github.com/elkaou/phytocheck-app", content)
        self.assertIn("if not errorlevel 1 set APP_REMOTE=github", content)


if __name__ == "__main__":
    unittest.main()
