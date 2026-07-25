# Create Test User Script

Este script crea usuarios de prueba en Firebase Authentication y Firestore para revisión de tiendas de aplicaciones.

## Requisitos

1. Node.js instalado
2. Firebase service account JSON file
3. Variables de entorno configuradas

## Configuración

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con las credenciales reales:
   ```bash
   TEST_USER_EMAIL=reviewer@example.com
   TEST_USER_PASSWORD=SecurePassword123!
   TEST_USER_DISPLAY_NAME=Store Reviewer
   TEST_USER_ROLE=member
   ```

3. Asegúrate de tener el service account JSON:
   - Por defecto busca: `../mobile/firebase-secrets/beteldej/service-account.json`
   - Puedes especificar otra ruta con `SERVICE_ACCOUNT_PATH`

## Uso

```bash
# Usando variables del archivo .env
node create-test-user.js

# O usando variables de entorno directamente
TEST_USER_EMAIL=user@example.com TEST_USER_PASSWORD=pass123 node create-test-user.js
```

## Seguridad

⚠️ **IMPORTANTE**: 
- NUNCA commitear el archivo `.env` al repositorio
- NUNCA incluir credenciales en el código
- Las contraseñas deben ser fuertes y únicas
- El rol por defecto es `member`, no `admin`
- Para dar acceso admin, actualiza el campo `role` manualmente en Firestore Console

## Proceso de Creación de Usuarios para Revisión de Tiendas

### Para Google Play Store:
1. Crea el usuario con este script
2. Sube las credenciales al campo interno de Google Play Console
3. NO incluyas las credenciales en documentación pública

### Para Apple App Store:
1. Crea el usuario con este script
2. Añade las credenciales en App Store Connect → App Review Information (campo privado)
3. NO incluyas las credenciales en documentación pública

## Rotar Credenciales

Si las credenciales se han comprometido:

1. Elimina el usuario en Firebase Console
2. Crea uno nuevo con nuevas credenciales
3. Actualiza las credenciales en las consolas de las tiendas
4. Purga las credenciales antiguas del historial de Git

## Troubleshooting

### Error: "Service account not found"
- Verifica que el path en `SERVICE_ACCOUNT_PATH` sea correcto
- Asegúrate de tener el archivo service-account.json descargado

### Error: "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required"
- Crea el archivo `.env` con las variables requeridas
- O pasa las variables directamente en la línea de comando

### Error: "The email address is already in use"
- El usuario ya existe en Firebase
- Elimínalo primero en Firebase Console o usa un email diferente
