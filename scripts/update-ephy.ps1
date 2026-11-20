[CmdletBinding()]
param(
    [string]$AppRepo = (Split-Path -Parent $PSScriptRoot),
    [string]$DataRepo = "C:\phytocheck-data",
    [string]$EphyDownloadUrl = "https://www.data.gouv.fr/api/1/datasets/r/cb51408e-2b97-43a4-94e2-c0de5c3bf5b2",
    [switch]$SkipAppPush,
    [switch]$SkipDataPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Commande introuvable : $Name. Installez-la et relancez le script."
    }
}

function Invoke-Checked([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "La commande a échoué ($LASTEXITCODE) : $Command $($Arguments -join ' ')"
    }
}

function Get-FirstFile([string]$Root, [string]$Name) {
    return Get-ChildItem -LiteralPath $Root -Recurse -File -Filter $Name |
        Select-Object -First 1
}

$app = (Resolve-Path -LiteralPath $AppRepo).Path
$data = $DataRepo
$zipPath = Join-Path ([IO.Path]::GetTempPath()) "phytocheck-ephy-$([guid]::NewGuid().ToString('N')).zip"
$extractPath = Join-Path ([IO.Path]::GetTempPath()) "phytocheck-ephy-$([guid]::NewGuid().ToString('N'))"
$today = Get-Date -Format "dd/MM/yyyy"

try {
    Assert-Command "python"
    Assert-Command "git"

    if (-not (Test-Path -LiteralPath $data)) {
        throw "Le dépôt de données est introuvable : $data`nClonez-le d'abord avec : git clone https://github.com/elkaou/phytocheck-data.git C:\phytocheck-data"
    }

    if (-not (Test-Path -LiteralPath (Join-Path $data ".git"))) {
        throw "Le dossier n'est pas un dépôt Git valide : $data"
    }

    Write-Step "Vérification des dépôts"
    git -C $app status --short
    git -C $data status --short

    $dataBranch = (git -C $data branch --show-current).Trim()
    if ($dataBranch -ne "main") {
        throw "Le dépôt de données n'est pas sur la branche main : '$dataBranch'"
    }

    $dataRemote = (git -C $data remote get-url origin).Trim()
    if ($dataRemote -notmatch "github\.com[/:]elkaou/phytocheck-data(?:\.git)?$") {
        throw "Le remote origin du dépôt de données est inattendu : $dataRemote"
    }

    $appStatus = @(git -C $app status --porcelain)
    $unsafeAppChanges = @($appStatus | Where-Object {
        $_ -and $_.Substring(3).Replace('/', '\') -notin @(
            "assets\data\products.json",
            "assets\data\risk-phrases.json",
            "assets\data\usages.json",
            "assets\data\bee-restrictions.json",
            "assets\data\manifest.json",
            "lib\data-context.tsx",
            "lib\product-service.ts",
            "TERMS_OF_SERVICE.md",
            "docs\terms-of-service.html",
            "scripts\update-ephy.ps1"
        )
    })
    if ($unsafeAppChanges.Count -gt 0) {
        throw "Le dépôt application contient des modifications non liées. Committez-les ou mettez-les de côté avant de poursuivre :`n$($unsafeAppChanges -join "`n")"
    }

    Write-Step "Synchronisation préalable du dépôt phytocheck-data"
    if (@(git -C $data status --porcelain).Count -gt 0) {
        throw "Le dépôt $data contient déjà des modifications locales. Elles doivent être committées ou mises de côté avant le pull --rebase."
    }
    Invoke-Checked "git" @("-C", $data, "pull", "--rebase", "origin", "main")

    Write-Step "Téléchargement de l'archive E-PHY"
    New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    Invoke-WebRequest -Uri $EphyDownloadUrl -OutFile $zipPath -UseBasicParsing
    $zipInfo = Get-Item -LiteralPath $zipPath
    if ($zipInfo.Length -lt 10000) {
        throw "L'archive téléchargée est anormalement petite ($($zipInfo.Length) octets)."
    }
    Write-Host "Archive téléchargée : $($zipInfo.Length) octets"

    Write-Step "Extraction de tous les fichiers CSV"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractPath)

    $required = @(
        "produits_utf8.csv",
        "produits_phrases_de_risque_utf8.csv",
        "produits_usages_utf8.csv",
        "produits_condition_emploi_utf8.csv"
    )

    $csvPaths = @{}
    foreach ($name in $required) {
        $file = Get-FirstFile -Root $extractPath -Name $name
        if (-not $file) {
            throw "Fichier obligatoire absent de l'archive : $name"
        }
        $csvPaths[$name] = $file.FullName
        Write-Host "[OK] $name"
    }

    $pcp = Get-FirstFile -Root $extractPath -Name "permis_de_commerce_parallele_utf8.csv"
    if ($pcp) {
        Write-Host "[OK] permis_de_commerce_parallele_utf8.csv"
    } else {
        Write-Host "[INFO] permis_de_commerce_parallele_utf8.csv absent : étape PCP ignorée." -ForegroundColor Yellow
    }

    Write-Step "Conversion des données E-PHY"
    $converter = Join-Path $app "scripts\convert_ephy_to_json.py"
    $converterArgs = @(
        $converter,
        "--products", $csvPaths["produits_utf8.csv"],
        "--risks", $csvPaths["produits_phrases_de_risque_utf8.csv"],
        "--usages", $csvPaths["produits_usages_utf8.csv"],
        "--conditions", $csvPaths["produits_condition_emploi_utf8.csv"],
        "--out-dir", (Join-Path $app "assets\data")
    )
    if ($pcp) {
        $converterArgs += @("--pcp", $pcp.FullName)
    } else {
        $converterArgs += "--no-pcp"
    }
    Invoke-Checked "python" $converterArgs

    Write-Step "Vérification des fichiers générés"
    $generated = @(
        "assets\data\products.json",
        "assets\data\risk-phrases.json",
        "assets\data\usages.json",
        "assets\data\bee-restrictions.json",
        "assets\data\manifest.json"
    )
    foreach ($relative in $generated) {
        $path = Join-Path $app $relative
        if (-not (Test-Path -LiteralPath $path)) {
            throw "Fichier généré absent : $path"
        }
        $item = Get-Item -LiteralPath $path
        if ($item.Length -eq 0) {
            throw "Fichier généré vide : $path"
        }
        Write-Host "[OK] $relative ($($item.Length) octets)"
    }

    $localManifest = Get-Content -LiteralPath (Join-Path $app "assets\data\manifest.json") -Raw | ConvertFrom-Json
    if ($localManifest.updated_at -ne $today) {
        throw "Le manifeste n'a pas la date attendue. Attendu : $today ; obtenu : $($localManifest.updated_at)"
    }
    Write-Host "Manifeste local : $($localManifest.products_count) produits, $($localManifest.usages_count) usages, date $($localManifest.updated_at)"

    Write-Step "Copie vers le dépôt GitHub Pages"
    $dataFiles = @("products.json", "risk-phrases.json", "usages.json", "bee-restrictions.json", "manifest.json")
    foreach ($name in $dataFiles) {
        $source = Join-Path $app "assets\data\$name"
        Copy-Item -LiteralPath $source -Destination (Join-Path $data $name) -Force
    }

    Write-Step "Commit et publication du dépôt de données"
    Invoke-Checked "git" @("-C", $data, "add", "products.json", "risk-phrases.json", "usages.json", "bee-restrictions.json", "manifest.json")
    $dataDiff = @(git -C $data diff --cached --name-only)
    if ($dataDiff.Count -gt 0) {
        Invoke-Checked "git" @("-C", $data, "commit", "-m", "data: mise a jour E-PHY du $today")
        if (-not $SkipDataPush) {
            Invoke-Checked "git" @("-C", $data, "push", "origin", "main")
        }
    } else {
        Write-Host "Aucun changement à publier dans phytocheck-data."
    }

    Write-Step "Commit et publication de l'application"
    $appFiles = @(
        "assets/data/products.json",
        "assets/data/risk-phrases.json",
        "assets/data/usages.json",
        "assets/data/bee-restrictions.json",
        "assets/data/manifest.json",
        "lib/data-context.tsx",
        "lib/product-service.ts",
        "TERMS_OF_SERVICE.md",
        "docs/terms-of-service.html"
    )
    Invoke-Checked "git" (@("-C", $app) + @("add") + $appFiles)
    $appDiff = @(git -C $app diff --cached --name-only)
    if ($appDiff.Count -gt 0) {
        Invoke-Checked "git" @("-C", $app, "commit", "-m", "data: mise a jour E-PHY du $today")
        if (-not $SkipAppPush) {
            Invoke-Checked "git" @("-C", $app, "push", "origin", "main")
        }
    } else {
        Write-Host "Aucun changement à publier dans phytocheck-app."
    }

    Write-Step "Vérification de GitHub Pages"
    $stamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    try {
        $remoteManifest = Invoke-RestMethod "https://elkaou.github.io/phytocheck-data/manifest.json?cb=$stamp"
        if ($remoteManifest.updated_at -ne $today) {
            Write-Warning "GitHub Pages n'est pas encore à jour : $($remoteManifest.updated_at)"
        } else {
            Write-Host "GitHub Pages à jour : $($remoteManifest.products_count) produits, $($remoteManifest.usages_count) usages" -ForegroundColor Green
        }
    } catch {
        Write-Warning "Vérification GitHub Pages impossible immédiatement : $($_.Exception.Message)"
    }

    Write-Step "Mise à jour terminée"
    Write-Host "Aucun nouveau build mobile n'est nécessaire pour une mise à jour de données seule." -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $extractPath -Recurse -Force -ErrorAction SilentlyContinue
}
