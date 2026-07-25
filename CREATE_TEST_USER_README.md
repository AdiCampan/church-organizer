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
   TEST_USER_PASSWORD=YourSecurePasswordHere
   TEST_USER_DISPLAY_NAME=Store Reviewer
   TEST_USER_ROLE=member
   ```

3. Obtén el service account JSON de Firebase:
   
   ⚠️ **CRÍTICO**: El archivo service account JSON contiene credenciales sensibles de administrador completo de Firebase.
   
   - **NUNCA** versionarlo en Git
   - **NUNCA** compartirlo públicamente
   - **NUNCA** incluirlo en documentación
   - Debe almacenarse en un gestor de secretos (1Password, AWS Secrets Manager, etc.)
   - Para CI/CD, usar secretos del entorno en lugar de archivos
   - **Si se expone**: Rotar inmediatamente desde Firebase Console → Project Settings → Service Accounts
   
   Por defecto busca: `../mobile/firebase-secrets/beteldej/service-account.json`
   Puedes especificar otra ruta con la variable `SERVICE_ACCOUNT_PATH`

## Uso

```bash
# Usando archivo .env local (recomendado)
node create-test-user.js

# O usando gestor de secretos (producción/CI)
# Configurar TEST_USER_EMAIL y TEST_USER_PASSWORD desde el gestor
# Nunca pasar contraseñas directamente en la línea de comandos
```

⚠️ **Evita pasar contraseñas por línea de comandos** - pueden quedar en historial del shell o logs del sistema.

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

### Error: "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required"
- Crea el archivo `.env` basándote en `.env.example`
- O configura las variables en tu gestor de secretos
- NUNCA pases contraseñas directamente en la línea de comandos

### Error: "Service account JSON is incomplete"
- El archivo service account debe contener: `project_id`, `client_email`, `private_key`
- Descarga un nuevo service account desde Firebase Console → Project Settings → Service Accounts

### Error: "Error loading service account from [path]"
- Verifica que el path en `SERVICE_ACCOUNT_PATH` sea correcto
- Asegúrate de tener el archivo service-account.json descargado
- Verifica que el archivo contenga JSON válido

### Error: "The email address is already in use"
- El usuario ya existe en Firebase
- Elimínalo primero en Firebase Console o usa un email diferente

### Error: "Rolling back: Deleting Auth user..."
- Falló la creación del perfil en Firestore después de crear el usuario Auth
- El script automáticamente elimina el usuario Auth creado (compensación)
- Revisa los permisos de Firestore y las reglas de seguridad
- Si el rollback falla, elimina manualmente el usuario desde Firebase Console
