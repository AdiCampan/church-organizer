param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("ebenezer", "beteldej")]
    $Project
)

$ErrorActionPreference = "Stop"

if ($Project -eq "ebenezer") {
    $EnvFile = "ebenezer.env"
    $FirebaseProject = "church-teams"
    $HostingSite = "church-teams"
} else {
    $EnvFile = "betelDej.env"
    $FirebaseProject = "church-teams-8ea48"
    $HostingSite = "teams-betel-dej"
}

Write-Host "--- VERIFICANDO CUENTA ---" -ForegroundColor Yellow
firebase login:list

Write-Host "--- PREPARANDO .ENV PARA: $Project ---" -ForegroundColor Cyan
Copy-Item "dashboard/$EnvFile" "dashboard/.env" -Force

# Verificacion de contenido
$ConfiguredProject = Select-String -Path "dashboard/.env" -Pattern "VITE_FIREBASE_PROJECT_ID=(.*)" | ForEach-Object { $_.Matches.Groups[1].Value }
Write-Host "VERIFICACION: .env configurado para: $ConfiguredProject" -ForegroundColor Green

if ($ConfiguredProject -ne $FirebaseProject) {
    Write-Host "ERROR CRITICO: .env no coincide con el proyecto objetivo ($FirebaseProject)." -ForegroundColor Red
    exit 1
}

# 2. Limpieza de cache y Build
Write-Host "--- COMPILANDO DASHBOARD ---" -ForegroundColor Cyan
Set-Location dashboard
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
if (Test-Path "node_modules/.vite") { Remove-Item "node_modules/.vite" -Recurse -Force }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Error en npm run build" }
Set-Location ..

# 3. Firebase Targeting
Write-Host "--- CONFIGURANDO FIREBASE TARGETS ---" -ForegroundColor Cyan
firebase use $FirebaseProject
firebase target:apply hosting webapp $HostingSite

# 4. Deploy
Write-Host "--- DESPLEGANDO A FIREBASE ---" -ForegroundColor Cyan
firebase deploy --only hosting:webapp
if ($LASTEXITCODE -ne 0) { throw "Error en firebase deploy" }

Write-Host "--- EXITO TOTAL PARA $Project! ---" -ForegroundColor Green
Write-Host "URL: https://$HostingSite.web.app"
Write-Host "IMPORTANTE: Si sigues viendo el proyecto anterior:"
Write-Host "1. Abre la web en INCOGNITO."
Write-Host "2. Pulsa FORCE RESET en el panel de DEBUG."
Write-Host "3. Pulsa Ctrl + F5 en el navegador."
