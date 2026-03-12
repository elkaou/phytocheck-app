#!/usr/bin/env python3
"""
convert_ephy_to_json.py
=======================
Convertit les deux fichiers CSV E-PHY en JSON pour l'application PhytoCheck.

Usage :
    python scripts/convert_ephy_to_json.py [--products CSV] [--risks CSV] [--out-dir DIR]

Fichiers CSV attendus (téléchargeables sur https://ephy.anses.fr) :
    - Produits phytopharmaceutiques : "produits_phytopharmaceutiques.csv"
    - Phrases de risque (AMM) :       "usages_produits_phytopharmaceutiques.csv"

Sorties générées dans assets/data/ :
    - products.json
    - risk-phrases.json

Le script met également à jour automatiquement DB_UPDATE_DATE et TOTAL_PRODUCTS
dans lib/product-service.ts avec la date du jour et le nombre réel de produits.
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
DEFAULT_PRODUCTS_CSV = PROJECT_ROOT / "produits_phytopharmaceutiques.csv"
DEFAULT_RISKS_CSV = PROJECT_ROOT / "usages_produits_phytopharmaceutiques.csv"
OUT_DIR = PROJECT_ROOT / "assets" / "data"
PRODUCT_SERVICE = PROJECT_ROOT / "lib" / "product-service.ts"

# ── Colonnes attendues dans le CSV produits ───────────────────────────────────
# Adapter si les noms de colonnes changent dans les exports E-PHY
COL_AMM = "Numéro AMM"
COL_NOM = "Nom du produit"
COL_NOMS_SEC = "Autre(s) nom(s) du produit"
COL_TITULAIRE = "Titulaire de l'AMM"
COL_GAMME = "Gamme d'usage"
COL_SUBSTANCES = "Substance(s) active(s)"
COL_FONCTIONS = "Fonction(s)"
COL_FORMULATION = "Type de formulation"
COL_ETAT = "Etat"
COL_DATE_RETRAIT = "Date de retrait"
COL_DATE_AUTORISATION = "Date d'autorisation"

# ── Colonnes attendues dans le CSV usages/risques ────────────────────────────
COL_AMM_RISK = "Numéro AMM"
COL_PHRASE_CODE = "Code mention de danger"
COL_PHRASE_LIB = "Libellé mention de danger"


def parse_args():
    parser = argparse.ArgumentParser(description="Convertit les CSV E-PHY en JSON pour PhytoCheck")
    parser.add_argument("--products", default=str(DEFAULT_PRODUCTS_CSV),
                        help=f"Chemin vers le CSV produits (défaut: {DEFAULT_PRODUCTS_CSV.name})")
    parser.add_argument("--risks", default=str(DEFAULT_RISKS_CSV),
                        help=f"Chemin vers le CSV usages/risques (défaut: {DEFAULT_RISKS_CSV.name})")
    parser.add_argument("--out-dir", default=str(OUT_DIR),
                        help=f"Dossier de sortie des JSON (défaut: {OUT_DIR})")
    parser.add_argument("--no-update-ts", action="store_true",
                        help="Ne pas mettre à jour product-service.ts automatiquement")
    return parser.parse_args()


def detect_encoding(filepath):
    """Essaie UTF-8 puis latin-1 (Windows-1252) pour les CSV E-PHY."""
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            with open(filepath, encoding=enc) as f:
                f.read(1024)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin-1"


def detect_separator(filepath, encoding):
    """Détecte le séparateur CSV (virgule ou point-virgule)."""
    with open(filepath, encoding=encoding) as f:
        first_line = f.readline()
    return ";" if first_line.count(";") > first_line.count(",") else ","


def convert_products(csv_path):
    """Lit le CSV produits E-PHY et retourne une liste de dicts."""
    enc = detect_encoding(csv_path)
    sep = detect_separator(csv_path, enc)
    print(f"  Encodage détecté : {enc}, séparateur : '{sep}'")

    products = []
    with open(csv_path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f, delimiter=sep)
        headers = reader.fieldnames or []
        print(f"  Colonnes CSV produits : {headers[:6]}...")

        for row in reader:
            # Normalisation robuste des noms de colonnes (strip espaces/BOM)
            row = {k.strip().lstrip("\ufeff"): v.strip() for k, v in row.items()}

            amm = row.get(COL_AMM, "").strip()
            if not amm:
                continue

            products.append({
                "amm": amm,
                "nom": row.get(COL_NOM, "").strip(),
                "nomsSecondaires": row.get(COL_NOMS_SEC, "").strip(),
                "titulaire": row.get(COL_TITULAIRE, "").strip(),
                "gammeUsage": row.get(COL_GAMME, "").strip(),
                "substancesActives": row.get(COL_SUBSTANCES, "").strip(),
                "fonctions": row.get(COL_FONCTIONS, "").strip(),
                "formulation": row.get(COL_FORMULATION, "").strip(),
                "etat": row.get(COL_ETAT, "").strip().upper(),
                "dateRetrait": row.get(COL_DATE_RETRAIT, "").strip(),
                "dateAutorisation": row.get(COL_DATE_AUTORISATION, "").strip(),
            })

    return products


def convert_risks(csv_path):
    """Lit le CSV usages E-PHY et retourne un dict {amm: [{code, libelle}]}."""
    enc = detect_encoding(csv_path)
    sep = detect_separator(csv_path, enc)
    print(f"  Encodage détecté : {enc}, séparateur : '{sep}'")

    risk_map = {}
    with open(csv_path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f, delimiter=sep)
        headers = reader.fieldnames or []
        print(f"  Colonnes CSV risques : {headers[:6]}...")

        for row in reader:
            row = {k.strip().lstrip("\ufeff"): v.strip() for k, v in row.items()}

            amm = row.get(COL_AMM_RISK, "").strip()
            code = row.get(COL_PHRASE_CODE, "").strip()
            libelle = row.get(COL_PHRASE_LIB, "").strip()

            if not amm or not code:
                continue

            if amm not in risk_map:
                risk_map[amm] = []

            # Éviter les doublons
            entry = {"code": code, "libelle": libelle}
            if entry not in risk_map[amm]:
                risk_map[amm].append(entry)

    return risk_map


def update_product_service(ts_path, total_products, update_date_str):
    """Met à jour DB_UPDATE_DATE et TOTAL_PRODUCTS dans product-service.ts."""
    if not ts_path.exists():
        print(f"  AVERTISSEMENT : {ts_path} introuvable, mise à jour ignorée.")
        return

    content = ts_path.read_text(encoding="utf-8")

    # Remplace DB_UPDATE_DATE = "..."
    content = re.sub(
        r'export const DB_UPDATE_DATE\s*=\s*"[^"]*"',
        f'export const DB_UPDATE_DATE = "{update_date_str}"',
        content,
    )

    ts_path.write_text(content, encoding="utf-8")
    print(f"  product-service.ts mis à jour : date={update_date_str}, produits={total_products}")


def main():
    args = parse_args()
    products_csv = Path(args.products)
    risks_csv = Path(args.risks)
    out_dir = Path(args.out_dir)

    # Vérifications
    if not products_csv.exists():
        print(f"ERREUR : Fichier CSV produits introuvable : {products_csv}")
        print(f"  Téléchargez-le sur https://ephy.anses.fr et placez-le à : {products_csv}")
        sys.exit(1)

    if not risks_csv.exists():
        print(f"ERREUR : Fichier CSV risques introuvable : {risks_csv}")
        print(f"  Téléchargez-le sur https://ephy.anses.fr et placez-le à : {risks_csv}")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    # ── Conversion produits ──────────────────────────────────────────────────
    print("\n[1/3] Conversion du CSV produits...")
    products = convert_products(products_csv)
    print(f"  → {len(products)} produits convertis")

    products_out = out_dir / "products.json"
    with open(products_out, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {products_out}")

    # ── Conversion risques ───────────────────────────────────────────────────
    print("\n[2/3] Conversion du CSV risques/usages...")
    risks = convert_risks(risks_csv)
    print(f"  → {len(risks)} AMM avec phrases de risque")

    risks_out = out_dir / "risk-phrases.json"
    with open(risks_out, "w", encoding="utf-8") as f:
        json.dump(risks, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  → Écrit : {risks_out}")

    # ── Mise à jour product-service.ts ───────────────────────────────────────
    if not args.no_update_ts:
        print("\n[3/3] Mise à jour de lib/product-service.ts...")
        today = date.today().strftime("%d/%m/%Y")
        update_product_service(PRODUCT_SERVICE, len(products), today)

    # ── Résumé ───────────────────────────────────────────────────────────────
    print("\n" + "="*50)
    print("CONVERSION TERMINÉE")
    print(f"  Produits     : {len(products):,}")
    print(f"  AMM risques  : {len(risks):,}")
    print(f"  Date mise à jour : {date.today().strftime('%d/%m/%Y')}")
    print("="*50)
    print("\nProchaines étapes :")
    print("  1. Vérifiez les JSON dans assets/data/")
    print("  2. Lancez : git add -A && git commit -m 'Mise à jour E-PHY' && git push")
    print("  3. Lancez un nouveau build EAS : eas build --platform all --profile production")


if __name__ == "__main__":
    main()
