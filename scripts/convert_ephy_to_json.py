#!/usr/bin/env python3
"""
convert_ephy_to_json.py
=======================
Convertit les deux fichiers CSV E-PHY en JSON pour l'application PhytoCheck.
Intègre également les produits PCP (Permis de Commerce Parallèle) si le CSV est présent.

Usage :
    python scripts/convert_ephy_to_json.py [--products CSV] [--risks CSV] [--pcp CSV] [--out-dir DIR]

Fichiers CSV attendus (téléchargeables sur https://ephy.anses.fr) :
    - Produits phytopharmaceutiques : "produits_utf8.csv"
    - Phrases de risque :             "produits_phrases_de_risque_utf8.csv"
    - Permis de commerce parallèle :  "permis_de_commerce_parallele_utf8.csv" (optionnel)

Sorties générées dans assets/data/ :
    - products.json
    - risk-phrases.json

Le script met également à jour automatiquement :
    - DB_UPDATE_DATE dans lib/product-service.ts
    - BUNDLE_MANIFEST dans lib/data-context.tsx
    - manifest.json dans le dépôt phytocheck-data (GitHub Pages)
"""

import csv
import json
import os
import sys
import re
import argparse
from datetime import date
from pathlib import Path

# ── Chemins par défaut (relatifs à la racine du projet) ──────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_PRODUCTS_CSV = PROJECT_ROOT / "produits_utf8.csv"
DEFAULT_RISKS_CSV = PROJECT_ROOT / "produits_phrases_de_risque_utf8.csv"
DEFAULT_PCP_CSV = PROJECT_ROOT / "permis_de_commerce_parallele_utf8.csv"
OUT_DIR = PROJECT_ROOT / "assets" / "data"
PRODUCT_SERVICE = PROJECT_ROOT / "lib" / "product-service.ts"

# Chemins possibles pour le dépôt phytocheck-data (manifest GitHub Pages)
# Le script cherche automatiquement dans les emplacements courants
MANIFEST_SEARCH_PATHS = [
    PROJECT_ROOT.parent / "phytocheck-data" / "manifest.json",  # dossier frère
    Path.home() / "phytocheck-data" / "manifest.json",           # home
    Path("C:/phytocheck-data/manifest.json"),                     # Windows absolu
    Path("D:/phytocheck-data/manifest.json"),                     # Windows D:
]

# Chemin vers data-context.tsx (pour mettre à jour BUNDLE_MANIFEST)
DATA_CONTEXT = PROJECT_ROOT / "lib" / "data-context.tsx"

# ── Colonnes du CSV produits (produits_utf8.csv) ─────────────────────────────
# Séparateur : point-virgule
COL_AMM          = "numero AMM"
COL_NOM          = "nom produit"
COL_NOMS_SEC     = "seconds noms commerciaux"
COL_TITULAIRE    = "titulaire"
COL_GAMME        = "gamme usage"
COL_SUBSTANCES   = "Substances actives"
COL_FONCTIONS    = "fonctions"
COL_FORMULATION  = "formulations"
COL_ETAT         = "Etat d\u2019autorisation"  # apostrophe typographique (U+2019)
# Variantes observées dans les CSV E-Phy selon l'encodage :
COL_ETAT_VARIANTS = [
    "Etat d\u2019autorisation",   # apostrophe typographique correcte
    "Etat d'autorisation",     # apostrophe ASCII simple
    "Etat d\u00e2\u20ac\u2122autorisation",  # UTF-8 mal interprété (â€™)
    "Etat dautorisation",      # sans apostrophe
]
COL_DATE_RETRAIT = "Date de retrait du produit"
COL_DATE_AUTH    = "Date de première autorisation"

# ── Colonnes du CSV risques (produits_phrases_de_risque_utf8.csv) ────────────
# Séparateur : point-virgule
COL_AMM_RISK     = "numero AMM"
COL_PHRASE_CODE  = "Libellé court phrase de risque "   # espace intentionnel (nom réel dans CSV)
COL_PHRASE_LIB   = "Libellé long phrase de risque"


def parse_args():
    parser = argparse.ArgumentParser(description="Convertit les CSV E-PHY en JSON pour PhytoCheck")
    parser.add_argument("--products", default=str(DEFAULT_PRODUCTS_CSV),
                        help=f"Chemin vers le CSV produits (défaut: {DEFAULT_PRODUCTS_CSV.name})")
    parser.add_argument("--risks", default=str(DEFAULT_RISKS_CSV),
                        help=f"Chemin vers le CSV risques (défaut: {DEFAULT_RISKS_CSV.name})")
    parser.add_argument("--pcp", default=str(DEFAULT_PCP_CSV),
                        help=f"Chemin vers le CSV PCP (défaut: {DEFAULT_PCP_CSV.name})")
    parser.add_argument("--out-dir", default=str(OUT_DIR),
                        help=f"Dossier de sortie des JSON (défaut: {OUT_DIR})")
    parser.add_argument("--no-update-ts", action="store_true",
                        help="Ne pas mettre à jour product-service.ts automatiquement")
    parser.add_argument("--no-pcp", action="store_true",
                        help="Ne pas intégrer les produits PCP même si le CSV est présent")
    return parser.parse_args()


def open_csv(filepath):
    """Ouvre un CSV E-PHY avec encodage UTF-8 et séparateur point-virgule."""
    return open(filepath, encoding="utf-8-sig", newline="")


def normalize_row(row):
    """Normalise les clés d'une ligne CSV (strip espaces/BOM)."""
    return {k.strip().lstrip("\ufeff"): (v.strip() if v else "") for k, v in row.items()}


def find_col(row, *candidates):
    """Cherche la première clé candidate présente dans la ligne (insensible à la casse et aux espaces)."""
    row_lower = {k.strip().lower(): k for k in row.keys()}
    for c in candidates:
        key = row_lower.get(c.strip().lower())
        if key is not None:
            return row.get(key, "")
    return ""


def get_etat(row):
    """Récupère la valeur de la colonne état en testant toutes les variantes connues du nom."""
    for variant in COL_ETAT_VARIANTS:
        val = row.get(variant, None)
        if val is not None:
            return val.strip()
    # Recherche insensible à la casse en dernier recours
    for key in row.keys():
        normalized = key.strip().lower().replace("\u2019", "'").replace("\u00e2\u20ac\u2122", "'")
        if "etat" in normalized and "autorisation" in normalized:
            return row[key].strip()
    return ""


def find_pcp_etat_column(fieldnames):
    """Trouver la colonne d'état d'autorisation dans le CSV PCP."""
    for col in fieldnames:
        if "tat" in col.lower() and "autor" in col.lower():
            return col
    return None


def convert_products(csv_path):
    """Lit le CSV produits E-PHY et retourne une liste de dicts."""
    print(f"  Fichier : {csv_path}")
    products = []

    with open_csv(csv_path) as f:
        reader = csv.DictReader(f, delimiter=";")
        headers = reader.fieldnames or []
        print(f"  Colonnes détectées : {[h.strip() for h in headers[:8]]}...")

        for row in reader:
            row = normalize_row(row)

            amm = row.get(COL_AMM, "").strip()
            if not amm:
                continue

            # Normaliser l'état : "RETIRE" ou "AUTORISE"
            etat = get_etat(row).upper()
            if "RETIR" in etat:
                etat = "RETIRE"
            elif etat:
                etat = "AUTORISE"

            products.append({
                "amm": amm,
                "nom": row.get(COL_NOM, ""),
                "nomsSecondaires": row.get(COL_NOMS_SEC, ""),
                "titulaire": row.get(COL_TITULAIRE, ""),
                "gammeUsage": row.get(COL_GAMME, ""),
                "substancesActives": row.get(COL_SUBSTANCES, ""),
                "fonctions": row.get(COL_FONCTIONS, ""),
                "formulation": row.get(COL_FORMULATION, ""),
                "etat": etat,
                "dateRetrait": row.get(COL_DATE_RETRAIT, ""),
                "dateAutorisation": row.get(COL_DATE_AUTH, ""),
            })

    return products


def convert_pcp(csv_path, ephy_products):
    """
    Lit le CSV PCP (Permis de Commerce Parallèle) et retourne une liste de dicts.
    Les infos (substances, fonctions, formulation) sont récupérées depuis le produit
    de référence français dans ephy_products.
    """
    print(f"  Fichier : {csv_path}")

    # Index des produits E-Phy par AMM
    amm_index = {p["amm"]: p for p in ephy_products}
    existing_amms = set(amm_index.keys())

    # Lire et regrouper par N° Permis (un produit PCP peut avoir plusieurs lignes)
    pcp_by_permis = {}
    total_rows = 0

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        etat_col = find_pcp_etat_column(reader.fieldnames or [])
        if not etat_col:
            print("  ERREUR: Colonne 'Etat d'autorisation' non trouvée dans le CSV PCP !")
            return []

        for row in reader:
            total_rows += 1
            permis = row.get("N° Permis", "").strip()
            if not permis:
                continue

            if permis not in pcp_by_permis:
                pcp_by_permis[permis] = {
                    "nom": row.get("Nom du produit", "").strip(),
                    "permis": permis,
                    "etat": row.get(etat_col, "").strip(),
                    "titulaire": row.get("Détenteur PCP", "").strip(),
                    "ref_nom": row.get("Produit de référence français", "").strip(),
                    "ref_amm": row.get("N° AMM de référence français", "").strip(),
                    "noms_importes": set(),
                }

            nom_importe = row.get("Nom du produit importé", "").strip()
            if nom_importe:
                pcp_by_permis[permis]["noms_importes"].add(nom_importe)

    print(f"  {total_rows} lignes CSV, {len(pcp_by_permis)} produits PCP uniques")

    # Construire les produits PCP
    pcp_products = []
    with_ref = 0
    no_ref = 0
    skipped = 0

    for permis, entry in pcp_by_permis.items():
        # Ne pas ajouter si le permis existe déjà comme AMM dans E-Phy
        if permis in existing_amms:
            skipped += 1
            continue

        # Chercher le produit de référence
        ref_amm = entry.get("ref_amm", "")
        ref_product = amm_index.get(ref_amm)

        if ref_product:
            with_ref += 1
            substances = ref_product.get("substancesActives", "")
            fonctions = ref_product.get("fonctions", "")
            formulation = ref_product.get("formulation", "")
            date_autorisation = ref_product.get("dateAutorisation", "")
        else:
            no_ref += 1
            substances = ""
            fonctions = ""
            formulation = ""
            date_autorisation = ""

        # Construire les noms secondaires
        # On met uniquement le produit de référence français en nom secondaire,
        # PAS les noms des produits importés étrangers (ex: BELKAR importé d'Allemagne
        # ne doit pas apparaître comme nom secondaire de HALOPI)
        noms_secondaires_parts = []
        ref_nom = entry.get("ref_nom", "")
        if ref_nom and ref_nom.upper() != entry["nom"].upper():
            noms_secondaires_parts.append(ref_nom)
        # Note: les noms importés (entry["noms_importes"]) sont volontairement
        # exclus des noms secondaires car ce sont des noms de produits étrangers
        noms_secondaires = " | ".join(noms_secondaires_parts)

        # Normaliser l'état
        etat = entry["etat"].upper()
        if "RETIR" in etat:
            etat = "RETIRE"
        elif etat:
            etat = "AUTORISE"

        pcp_products.append({
            "amm": permis,
            "nom": entry["nom"],
            "nomsSecondaires": noms_secondaires,
            "titulaire": entry["titulaire"],
            "gammeUsage": "Professionnel",
            "substancesActives": substances,
            "fonctions": fonctions,
            "formulation": formulation,
            "etat": etat,
            "dateRetrait": "",
            "dateAutorisation": date_autorisation,
        })

    print(f"  → {len(pcp_products)} produits PCP ajoutés (ref trouvée: {with_ref}, sans ref: {no_ref}, ignorés: {skipped})")
    return pcp_products


def convert_risks(csv_path):
    """Lit le CSV phrases de risque E-PHY et retourne un dict {amm: [{code, libelle}]}."""
    print(f"  Fichier : {csv_path}")
    risk_map = {}

    with open_csv(csv_path) as f:
        reader = csv.DictReader(f, delimiter=";")
        headers = reader.fieldnames or []
        print(f"  Colonnes détectées : {[h.strip() for h in headers]}...")

        for row in reader:
            row = normalize_row(row)

            amm = row.get(COL_AMM_RISK, "").strip()
            # Le nom de colonne du code peut avoir un espace trailing dans le CSV réel
            code = row.get(COL_PHRASE_CODE, row.get(COL_PHRASE_CODE.strip(), "")).strip()
            libelle = row.get(COL_PHRASE_LIB, "").strip()

            if not amm or not code:
                continue

            if amm not in risk_map:
                risk_map[amm] = []

            entry = {"code": code, "libelle": libelle}
            if entry not in risk_map[amm]:
                risk_map[amm].append(entry)

    return risk_map


def update_manifest(update_date_str, products_count, risks_count):
    """Met à jour manifest.json dans le dépôt phytocheck-data si trouvé."""
    manifest_path = None
    for candidate in MANIFEST_SEARCH_PATHS:
        if candidate.exists():
            manifest_path = candidate
            break

    if manifest_path is None:
        print(f"  INFO : manifest.json non trouvé dans les emplacements connus.")
        print(f"  Mettez à jour manuellement : phytocheck-data/manifest.json")
        return

    try:
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)

        manifest["updated_at"] = update_date_str
        manifest["products_count"] = products_count
        manifest["risks_count"] = risks_count

        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            f.write("\n")

        print(f"  manifest.json mis à jour : {manifest_path}")
        print(f"  → updated_at={update_date_str}, products={products_count}, risks={risks_count}")
    except Exception as e:
        print(f"  AVERTISSEMENT : impossible de mettre à jour manifest.json : {e}")


def update_product_service(ts_path, update_date_str):
    """Met à jour DB_UPDATE_DATE dans product-service.ts."""
    if not ts_path.exists():
        print(f"  AVERTISSEMENT : {ts_path} introuvable, mise à jour ignorée.")
        return

    content = ts_path.read_text(encoding="utf-8")
    content = re.sub(
        r'export const DB_UPDATE_DATE\s*=\s*"[^"]*"',
        f'export const DB_UPDATE_DATE = "{update_date_str}"',
        content,
    )
    ts_path.write_text(content, encoding="utf-8")
    print(f"  product-service.ts mis à jour : date={update_date_str}")



def update_bundle_manifest(data_context_path, update_date_str, products_count, risks_count):
    """Met à jour BUNDLE_MANIFEST dans lib/data-context.tsx."""
    if not data_context_path.exists():
        print(f"  AVERTISSEMENT : {data_context_path} introuvable, mise à jour ignorée.")
        return

    content = data_context_path.read_text(encoding="utf-8")
    
    # Remplacer les valeurs dans BUNDLE_MANIFEST
    content = re.sub(
        r'updated_at:\s*"[^"]*"',
        f'updated_at: "{update_date_str}"',
        content,
    )
    content = re.sub(
        r'products_count:\s*\d+',
        f'products_count: {products_count}',
        content,
    )
    content = re.sub(
        r'risks_count:\s*\d+',
        f'risks_count: {risks_count}',
        content,
    )
    
    data_context_path.write_text(content, encoding="utf-8")
    print(f"  data-context.tsx mis à jour : date={update_date_str}, produits={products_count}, risques={risks_count}")

def main():
    args = parse_args()
    products_csv = Path(args.products)
    risks_csv = Path(args.risks)
    pcp_csv = Path(args.pcp)
    out_dir = Path(args.out_dir)

    # Vérifications
    if not products_csv.exists():
        print(f"\nERREUR : Fichier CSV produits introuvable : {products_csv}")
        print(f"  Placez '{products_csv.name}' dans : {products_csv.parent}")
        sys.exit(1)

    if not risks_csv.exists():
        print(f"\nERREUR : Fichier CSV risques introuvable : {risks_csv}")
        print(f"  Placez '{risks_csv.name}' dans : {risks_csv.parent}")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    # ── Conversion produits E-Phy ────────────────────────────────────────────
    print("\n[1/5] Conversion du CSV produits E-Phy...")
    products = convert_products(products_csv)
    print(f"  → {len(products):,} produits E-Phy convertis")

    # ── Intégration PCP ──────────────────────────────────────────────────────
    pcp_count = 0
    if not args.no_pcp and pcp_csv.exists():
        print(f"\n[2/5] Intégration des produits PCP (Permis de Commerce Parallèle)...")
        pcp_products = convert_pcp(pcp_csv, products)
        pcp_count = len(pcp_products)
        products.extend(pcp_products)
        print(f"  → Total après intégration PCP : {len(products):,} produits")
    elif not args.no_pcp:
        print(f"\n[2/5] CSV PCP non trouvé ({pcp_csv.name}), étape ignorée.")
        print(f"  Pour inclure les PCP, placez '{pcp_csv.name}' dans : {pcp_csv.parent}")
    else:
        print(f"\n[2/5] Intégration PCP désactivée (--no-pcp).")

    # ── Sauvegarde products.json ─────────────────────────────────────────────
    products_out = out_dir / "products.json"
    with open(products_out, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {products_out}")

    # ── Conversion risques ───────────────────────────────────────────────────
    print("\n[3/5] Conversion du CSV phrases de risque...")
    risks = convert_risks(risks_csv)
    print(f"  → {len(risks):,} AMM avec phrases de risque")

    risks_out = out_dir / "risk-phrases.json"
    with open(risks_out, "w", encoding="utf-8") as f:
        json.dump(risks, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {risks_out}")

    # ── Mise à jour product-service.ts et manifest.json ────────────────────────
    today = date.today().strftime("%d/%m/%Y")
    if not args.no_update_ts:
        print("\n[4/5] Mise à jour de lib/product-service.ts...")
        update_product_service(PRODUCT_SERVICE, today)

    print("\n[5/5] Mise à jour de manifest.json et data-context.tsx...")
    update_manifest(today, len(products), len(risks))
    update_bundle_manifest(DATA_CONTEXT, today, len(products), len(risks))

    # ── Résumé ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("CONVERSION TERMINÉE")
    print(f"  Produits E-Phy    : {len(products) - pcp_count:,}")
    if pcp_count > 0:
        print(f"  Produits PCP      : {pcp_count:,}")
    print(f"  Total produits    : {len(products):,}")
    print(f"  AMM avec risques  : {len(risks):,}")
    print(f"  Date mise à jour  : {date.today().strftime('%d/%m/%Y')}")
    print("=" * 50)
    print("\nFichiers mis à jour :")
    print(f"  ✓ assets/data/products.json")
    print(f"  ✓ assets/data/risk-phrases.json")
    print(f"  ✓ lib/product-service.ts (DB_UPDATE_DATE)")
    print(f"  ✓ manifest.json (GitHub Pages)")
    print(f"  ✓ lib/data-context.tsx (BUNDLE_MANIFEST)")
    print("\nProchaines étapes :")
    print("  1. Vérifiez les changements : git diff")
    print("  2. Lancez : git add -A && git commit -m 'Mise à jour E-PHY' && git push")
    print("  3. Nouveau build : eas build --platform all --profile production")


if __name__ == "__main__":
    main()
