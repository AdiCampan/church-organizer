#!/bin/bash
set -euo pipefail

# Script de despliegue para Mac/Linux

PROJECT=${1:-ebenezer}

if [ "$PROJECT" == "ebenezer" ]; then
    ENV_FILE="ebenezer.env"
    FIREBASE_PROJECT="church-teams"
    HOSTING_SITE="church-teams"
elif [ "$PROJECT" == "beteldej" ]; then
    ENV_FILE="betelDej.env"
    FIREBASE_PROJECT="church-teams-8ea48"
    HOSTING_SITE="teams-betel-dej"
else
    echo "Error: Proyecto desconocido. Usa 'ebenezer' o 'beteldej'."
    exit 1
fi

echo "--- PREPARANDO .ENV PARA: $PROJECT ---"
if [ -f "dashboard/.env" ]; then
    ENV_BACKUP="dashboard/.env.backup.$(date +%Y%m%d%H%M%S)"
    cp "dashboard/.env" "$ENV_BACKUP"
    echo "Backup de dashboard/.env guardado en $ENV_BACKUP"
fi
cp "dashboard/$ENV_FILE" "dashboard/.env"

# Verificación de seguridad
CONFIGURED_ID_LINE=$(grep -E '^VITE_FIREBASE_PROJECT_ID=' "dashboard/.env" || true)
CONFIGURED_ID=${CONFIGURED_ID_LINE#*=}
CONFIGURED_ID=$(printf '%s' "$CONFIGURED_ID" | tr -d '\r')
# Nota: Algunos .env pueden tener comillas, limpiamos si es necesario
CONFIGURED_ID=${CONFIGURED_ID//\"/}
CONFIGURED_ID=${CONFIGURED_ID//\'/}

if [ -z "$CONFIGURED_ID" ] || [ "$CONFIGURED_ID" != "$FIREBASE_PROJECT" ]; then
    echo "ERROR CRITICO: El Project ID en $ENV_FILE ($CONFIGURED_ID) no coincide con el destino ($FIREBASE_PROJECT)."
    exit 1
fi

echo "--- COMPILANDO DASHBOARD ---"
(
    cd dashboard
    rm -rf dist
    npm run build
)

echo "--- CONFIGURANDO FIREBASE ---"
firebase use "$FIREBASE_PROJECT"
firebase target:apply hosting webapp "$HOSTING_SITE"

echo "--- DESPLEGANDO A FIREBASE ---"
firebase deploy --only hosting:webapp

echo "--- EXITO TOTAL PARA $PROJECT! ---"
echo "URL: https://$HOSTING_SITE.web.app"
