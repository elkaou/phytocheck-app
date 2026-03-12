@echo off
:: ============================================================
:: update_data.bat - Mise à jour automatique des données E-PHY
:: PhytoCheck - https://ephy.anses.fr
:: ============================================================
::
:: UTILISATION :
::   1. Téléchargez les 2 fichiers CSV depuis https://ephy.anses.fr
::      (voir instructions en bas de ce fichier)
::   2. Copiez-les à la racine du projet (même dossier que ce .bat)
::   3. Double-cliquez sur update_data.bat (ou lancez depuis PowerShell)
::
:: FICHIERS CSV ATTENDUS (à la racine du projet) :
::   - produits_phytopharmaceutiques.csv
::   - usages_produits_phytopharmaceutiques.csv
:: ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   PhytoCheck - Mise a jour des donnees E-PHY
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

:: ── Vérification des fichiers CSV ───────────────────────────
if not exist "produits_phytopharmaceutiques.csv" (
    echo [ERREUR] Fichier manquant : produits_phytopharmaceutiques.csv
    echo.
    echo Telechargez-le sur https://ephy.anses.fr :
    echo   Donnees ^> Produits phytopharmaceutiques ^> Exporter CSV
    echo Puis copiez-le dans : %CD%
    pause
    exit /b 1
)

if not exist "usages_produits_phytopharmaceutiques.csv" (
    echo [ERREUR] Fichier manquant : usages_produits_phytopharmaceutiques.csv
    echo.
    echo Telechargez-le sur https://ephy.anses.fr :
    echo   Donnees ^> Usages des produits ^> Exporter CSV
    echo Puis copiez-le dans : %CD%
    pause
    exit /b 1
)

echo [1/4] Fichiers CSV trouves. Lancement de la conversion...
echo.

:: ── Conversion CSV → JSON ────────────────────────────────────
python scripts\convert_ephy_to_json.py ^
    --products "produits_phytopharmaceutiques.csv" ^
    --risks "usages_produits_phytopharmaceutiques.csv" ^
    --out-dir "assets\data"

if errorlevel 1 (
    echo.
    echo [ERREUR] La conversion a echoue. Verifiez les messages ci-dessus.
    pause
    exit /b 1
)

echo.
echo [2/4] Conversion terminee. Verification des JSON...

:: Vérification rapide que les JSON existent
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
echo [3/4] Commit Git...

:: Vérifier que git est disponible
git --version >nul 2>&1
if errorlevel 1 (
    echo [AVERTISSEMENT] Git non trouve. Commit ignore.
    echo Installez Git depuis https://git-scm.com/
    goto :skip_git
)

:: Récupérer la date du jour pour le message de commit
for /f "tokens=1-3 delims=/" %%a in ("%date%") do (
    set DAY=%%a
    set MONTH=%%b
    set YEAR=%%c
)
:: Format date peut varier selon la locale Windows - utiliser Python pour fiabilité
for /f %%d in ('python -c "from datetime import date; print(date.today().strftime('%%d/%%m/%%Y'))"') do set TODAY=%%d

git add assets\data\products.json assets\data\risk-phrases.json lib\product-service.ts

git commit -m "Mise a jour E-PHY du %TODAY%"

if errorlevel 1 (
    echo [INFO] Aucun changement a commiter (donnees deja a jour).
    goto :skip_push
)

echo [4/4] Push vers GitHub...
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
