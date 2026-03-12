@echo off
:: ============================================================
:: update_data.bat - Mise à jour automatique des données E-PHY
:: PhytoCheck - Source : data.gouv.fr (ANSES)
:: ============================================================
::
:: UTILISATION :
::   Double-cliquez sur update_data.bat (ou lancez depuis PowerShell)
::   Le script télécharge automatiquement les dernières données E-Phy
::   depuis data.gouv.fr, les convertit et publie sur GitHub Pages.
::
:: PRÉREQUIS :
::   - Python installé (https://www.python.org/downloads/)
::   - Git installé (https://git-scm.com/)
::   - Dépôt phytocheck-data cloné dans C:\phytocheck-data
::     (git clone https://github.com/elkaou/phytocheck-data.git C:\phytocheck-data)
::   - Connexion internet
:: ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   PhytoCheck - Mise a jour des donnees E-PHY
echo   Source : data.gouv.fr (ANSES - mise a jour hebdomadaire)
echo ============================================================
echo.

:: Aller dans le dossier du script (racine du projet phytocheck-app)
cd /d "%~dp0"

:: ── Vérification Python ──────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH.
    echo Telechargez Python sur https://www.python.org/downloads/
    pause
    exit /b 1
)

:: ── Vérification curl ────────────────────────────────────────
curl --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] curl n'est pas disponible.
    echo Mettez a jour Windows 10 ou installez curl depuis https://curl.se/
    pause
    exit /b 1
)

:: ── Téléchargement du ZIP E-Phy depuis data.gouv.fr ──────────
echo [1/6] Telechargement des donnees E-PHY depuis data.gouv.fr...
echo        (mise a jour hebdomadaire - nuit du mardi au mercredi)
echo.

set ZIP_URL=https://www.data.gouv.fr/api/1/datasets/r/cb51408e-2b97-43a4-94e2-c0de5c3bf5b2
set ZIP_FILE=ephy_utf8_temp.zip

curl -L --max-time 120 --progress-bar "%ZIP_URL%" -o "%ZIP_FILE%"

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec du telechargement. Verifiez votre connexion internet.
    if exist "%ZIP_FILE%" del "%ZIP_FILE%"
    pause
    exit /b 1
)

echo [OK] ZIP telecharge avec succes.
echo.

:: ── Extraction des CSV depuis le ZIP ─────────────────────────
echo [2/6] Extraction des fichiers CSV...

python -c "
import zipfile, sys
zip_path = '%ZIP_FILE%'
files_needed = ['produits_utf8.csv', 'produits_phrases_de_risque_utf8.csv']
try:
    with zipfile.ZipFile(zip_path, 'r') as z:
        available = z.namelist()
        for f in files_needed:
            if f in available:
                z.extract(f, '.')
                print(f'  Extrait : {f}')
            else:
                print(f'  MANQUANT dans le ZIP : {f}')
                sys.exit(1)
    print('OK')
except Exception as e:
    print(f'ERREUR : {e}')
    sys.exit(1)
"

if errorlevel 1 (
    echo [ERREUR] Extraction echouee.
    if exist "%ZIP_FILE%" del "%ZIP_FILE%"
    pause
    exit /b 1
)

if exist "%ZIP_FILE%" del "%ZIP_FILE%"

echo [OK] CSV extraits avec succes.
echo.

:: ── Conversion CSV → JSON ────────────────────────────────────
echo [3/6] Conversion CSV vers JSON...
echo.

python scripts\convert_ephy_to_json.py ^
    --products "produits_utf8.csv" ^
    --risks "produits_phrases_de_risque_utf8.csv" ^
    --out-dir "assets\data"

if errorlevel 1 (
    echo.
    echo [ERREUR] La conversion a echoue.
    pause
    exit /b 1
)

:: Supprimer les CSV temporaires
if exist "produits_utf8.csv" del "produits_utf8.csv"
if exist "produits_phrases_de_risque_utf8.csv" del "produits_phrases_de_risque_utf8.csv"

echo.
echo [4/6] Verification des JSON generes...

if not exist "assets\data\products.json" (
    echo [ERREUR] assets\data\products.json non genere.
    pause
    exit /b 1
)
if not exist "assets\data\risk-phrases.json" (
    echo [ERREUR] assets\data\risk-phrases.json non genere.
    pause
    exit /b 1
)

echo [OK] JSON generes avec succes.
echo.

:: ── Récupérer la date du jour ─────────────────────────────────
for /f %%d in ('python -c "from datetime import date; print(date.today().strftime('%%d/%%m/%%Y'))"') do set TODAY=%%d

:: ── Commit vers phytocheck-app (GitHub) ──────────────────────
echo [5/6] Commit vers phytocheck-app...

git --version >nul 2>&1
if errorlevel 1 (
    echo [AVERTISSEMENT] Git non trouve. Commits ignores.
    goto :push_github_pages
)

git add assets\data\products.json assets\data\risk-phrases.json lib\product-service.ts
git commit -m "Mise a jour E-PHY du %TODAY%"

if errorlevel 1 (
    echo [INFO] Aucun changement dans phytocheck-app.
) else (
    git push github main
    if errorlevel 1 (
        echo [AVERTISSEMENT] Push phytocheck-app echoue. Lancez manuellement : git push github main
    ) else (
        echo [OK] phytocheck-app mis a jour sur GitHub.
    )
)

:: ── Mise à jour GitHub Pages (phytocheck-data) ───────────────
:push_github_pages
echo.
echo [6/6] Mise a jour GitHub Pages (phytocheck-data)...

:: Chemin du dépôt phytocheck-data (modifiable si besoin)
set DATA_REPO=C:\phytocheck-data

if not exist "%DATA_REPO%" (
    echo [AVERTISSEMENT] Dossier %DATA_REPO% introuvable.
    echo Pour activer la mise a jour GitHub Pages, clonez le depot :
    echo   git clone https://github.com/elkaou/phytocheck-data.git C:\phytocheck-data
    goto :end
)

:: Copier les JSON dans le dépôt phytocheck-data
copy /Y "assets\data\products.json" "%DATA_REPO%\products.json" >nul
copy /Y "assets\data\risk-phrases.json" "%DATA_REPO%\risk-phrases.json" >nul

:: Générer le manifest.json
python -c "
import json, datetime
products = json.load(open('assets/data/products.json', encoding='utf-8'))
risks = json.load(open('assets/data/risk-phrases.json', encoding='utf-8'))
manifest = {
    'version': '1.0',
    'updated_at': datetime.date.today().strftime('%%d/%%m/%%Y'),
    'products_count': len(products),
    'risks_count': len(risks)
}
json.dump(manifest, open(r'%DATA_REPO%\manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'Manifest : {manifest[\"products_count\"]} produits, date {manifest[\"updated_at\"]}')
"

:: Commit et push vers GitHub Pages
cd /d "%DATA_REPO%"
git add products.json risk-phrases.json manifest.json
git commit -m "Mise a jour E-PHY du %TODAY%"

if errorlevel 1 (
    echo [INFO] GitHub Pages deja a jour.
    cd /d "%~dp0"
    goto :end
)

git push origin main

if errorlevel 1 (
    echo [AVERTISSEMENT] Push GitHub Pages echoue. Lancez manuellement depuis %DATA_REPO% : git push origin main
) else (
    echo [OK] GitHub Pages mis a jour ! Les utilisateurs recevront les nouvelles donnees au prochain lancement.
)

cd /d "%~dp0"

:end
echo.
echo ============================================================
echo   MISE A JOUR TERMINEE !
echo ============================================================
echo.
echo Prochaines etapes :
echo   - Les utilisateurs recevront automatiquement les nouvelles
echo     donnees au prochain lancement de l'app (sans rebuild).
echo   - Un nouveau build EAS n'est necessaire que pour les
echo     mises a jour de code (nouvelles fonctionnalites, corrections).
echo ============================================================
echo.
pause
