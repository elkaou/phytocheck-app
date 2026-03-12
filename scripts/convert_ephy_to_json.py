#!/usr/bin/env python3
"""
convert_ephy_to_json.py
=======================
Convertit les deux fichiers CSV E-PHY en JSON pour l'application PhytoCheck.

Usage :
    python scripts/convert_ephy_to_json.py [--products CSV] [--risks CSV] [--out-dir DIR]

Fichiers CSV attendus (téléchargeables sur https://ephy.anses.fr) :
    - Produits phytopharmaceutiques : "produits_utf8.csv"
    - Phrases de risque :             "produits_phrases_de_risque_utf8.csv"

Sorties générées dans assets/data/ :
    - products.json
    - risk-phrases.json

Le script met également à jour automatiquement DB_UPDATE_DATE
dans lib/product-service.ts avec la date du jour.
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
OUT_DIR = PROJECT_ROOT / "assets" / "data"
PRODUCT_SERVICE = PROJECT_ROOT / "lib" / "product-service.ts"

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
COL_ETAT         = "Etat d'autorisation"
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
    parser.add_argument("--out-dir", default=str(OUT_DIR),
                        help=f"Dossier de sortie des JSON (défaut: {OUT_DIR})")
    parser.add_argument("--no-update-ts", action="store_true",
                        help="Ne pas mettre à jour product-service.ts automatiquement")
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
            etat = row.get(COL_ETAT, "").strip().upper()
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


def main():
    args = parse_args()
    products_csv = Path(args.products)
    risks_csv = Path(args.risks)
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

    # ── Conversion produits ──────────────────────────────────────────────────
    print("\n[1/3] Conversion du CSV produits...")
    products = convert_products(products_csv)
    print(f"  → {len(products):,} produits convertis")

    products_out = out_dir / "products.json"
    with open(products_out, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {products_out}")

    # ── Conversion risques ───────────────────────────────────────────────────
    print("\n[2/3] Conversion du CSV phrases de risque...")
    risks = convert_risks(risks_csv)
    print(f"  → {len(risks):,} AMM avec phrases de risque")

    risks_out = out_dir / "risk-phrases.json"
    with open(risks_out, "w", encoding="utf-8") as f:
        json.dump(risks, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {risks_out}")

    # ── Mise à jour product-service.ts ───────────────────────────────────────
    if not args.no_update_ts:
        print("\n[3/3] Mise à jour de lib/product-service.ts...")
        today = date.today().strftime("%d/%m/%Y")
        update_product_service(PRODUCT_SERVICE, today)

    # ── Résumé ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("CONVERSION TERMINÉE")
    print(f"  Produits          : {len(products):,}")
    print(f"  AMM avec risques  : {len(risks):,}")
    print(f"  Date mise à jour  : {date.today().strftime('%d/%m/%Y')}")
    print("=" * 50)
    print("\nProchaines étapes :")
    print("  1. Vérifiez les JSON dans assets/data/")
    print("  2. Lancez : git add -A && git commit -m 'Mise à jour E-PHY' && git push")
    print("  3. Nouveau build : eas build --platform all --profile production")


if __name__ == "__main__":
    main()
