@echo off
:: ============================================================
:: update_data.bat - Mise à jour automatique des données E-PHY
:: PhytoCheck - Source : data.gouv.fr (ANSES)
:: ============================================================
::
:: UTILISATION :
::   Double-cliquez sur update_data.bat (ou lancez depuis PowerShell)
::   Le script télécharge automatiquement les dernières données E-Phy
::   depuis data.gouv.fr, les convertit et pousse vers GitHub.
::
:: PRÉREQUIS :
::   - Python installé (https://www.python.org/downloads/)
::   - Git installé (https://git-scm.com/)
::   - Connexion internet
:: ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   PhytoCheck - Mise a jour des donnees E-PHY
echo   Source : data.gouv.fr (ANSES - mise a jour hebdomadaire)
echo ============================================================
echo.

:: Aller dans le dossier du script (racine du projet)
cd /d "%~dp0"

:: ── Vérification Python ──────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installe ou n'est pas dans le PATH.
    echo Telechargez Python sur https://www.python.org/downloads/
    pause
    exit /b 1
)

:: ── Vérification curl (disponible nativement sur Windows 10+) ─
curl --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] curl n'est pas disponible.
    echo Mettez a jour Windows 10 ou installez curl depuis https://curl.se/
    pause
    exit /b 1
)

:: ── Téléchargement du ZIP E-Phy depuis data.gouv.fr ──────────
echo [1/5] Telechargement des donnees E-PHY depuis data.gouv.fr...
echo        (mise a jour hebdomadaire - nuit du mardi au mercredi)
echo.

:: URL "latest" stable de data.gouv.fr - pointe toujours vers la dernière version
set ZIP_URL=https://www.data.gouv.fr/api/1/datasets/r/cb51408e-2b97-43a4-94e2-c0de5c3bf5b2
set ZIP_FILE=ephy_utf8_temp.zip

curl -L --max-time 120 --progress-bar "%ZIP_URL%" -o "%ZIP_FILE%"

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec du telechargement. Verifiez votre connexion internet.
    echo URL : %ZIP_URL%
    if exist "%ZIP_FILE%" del "%ZIP_FILE%"
    pause
    exit /b 1
)

if not exist "%ZIP_FILE%" (
    echo [ERREUR] Le fichier ZIP n'a pas ete telecharge.
    pause
    exit /b 1
)

echo [OK] ZIP telecharge avec succes.
echo.

:: ── Extraction des CSV depuis le ZIP ─────────────────────────
echo [2/5] Extraction des fichiers CSV...

:: Utiliser Python pour extraire uniquement les 2 fichiers nécessaires
python -c "
import zipfile, sys, os
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

:: Supprimer le ZIP temporaire
if exist "%ZIP_FILE%" del "%ZIP_FILE%"

:: Vérification des CSV extraits
if not exist "produits_utf8.csv" (
    echo [ERREUR] produits_utf8.csv non trouve apres extraction.
    pause
    exit /b 1
)
if not exist "produits_phrases_de_risque_utf8.csv" (
    echo [ERREUR] produits_phrases_de_risque_utf8.csv non trouve apres extraction.
    pause
    exit /b 1
)

echo [OK] CSV extraits avec succes.
echo.

:: ── Conversion CSV → JSON ────────────────────────────────────
echo [3/5] Conversion CSV vers JSON...
echo.

python scripts\convert_ephy_to_json.py ^
    --products "produits_utf8.csv" ^
    --risks "produits_phrases_de_risque_utf8.csv" ^
    --out-dir "assets\data"

if errorlevel 1 (
    echo.
    echo [ERREUR] La conversion a echoue. Verifiez les messages ci-dessus.
    pause
    exit /b 1
)

:: Supprimer les CSV temporaires (exclus du .gitignore de toute façon)
if exist "produits_utf8.csv" del "produits_utf8.csv"
if exist "produits_phrases_de_risque_utf8.csv" del "produits_phrases_de_risque_utf8.csv"

echo.
echo [4/5] Verification des JSON generes...

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

:: ── Git commit et push ───────────────────────────────────────
echo [5/5] Commit et push Git...

git --version >nul 2>&1
if errorlevel 1 (
    echo [AVERTISSEMENT] Git non trouve. Commit ignore.
    echo Installez Git depuis https://git-scm.com/
    goto :skip_git
)

:: Récupérer la date du jour via Python
for /f %%d in ('python -c "from datetime import date; print(date.today().strftime('%%d/%%m/%%Y'))"') do set TODAY=%%d

git add assets\data\products.json assets\data\risk-phrases.json lib\product-service.ts

git commit -m "Mise a jour E-PHY du %TODAY%"

if errorlevel 1 (
    echo [INFO] Aucun changement a commiter (donnees deja a jour).
    goto :skip_push
)

git push github main

if errorlevel 1 (
    echo [AVERTISSEMENT] Push echoue. Verifiez votre connexion et vos credentials Git.
    echo Vous pouvez pousser manuellement avec : git push github main
    goto :end
)

echo.
echo ============================================================
echo   MISE A JOUR TERMINEE AVEC SUCCES !
echo ============================================================
echo.
echo Prochaines etapes :
echo   1. Lancez un nouveau build EAS pour publier les donnees :
echo      eas build --platform all --profile production
echo   2. Soumettez le nouveau build dans App Store Connect / Google Play
echo ============================================================
goto :end

:skip_git
echo [INFO] Etape Git ignoree (Git non disponible).
goto :end

:skip_push
echo [INFO] Aucun push necessaire.

:end
echo.
pause
