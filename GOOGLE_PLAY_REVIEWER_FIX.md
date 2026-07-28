# Solución: Google Play - Credenciales de Revisor Incorrectas

## 🚨 Problema
Google Play rechazó la app **Betel Dej Teams** (com.beteldej.teams) porque las credenciales de inicio de sesión no funcionan.

**Error reportado:**
```
Login credentials are incorrect
Your provided login information does not allow us to access your app.
```

**Screenshot proporcionado:** IN_APP_EXPERIENCE-3065.png
- Muestra intento fallido de login con: `reviewer@googleplay.beteldej.com`

---

## ✅ Solución Rápida (Método Recomendado)

### Opción A: Crear/Verificar cuenta en Firebase Console (5 minutos)

#### Paso 1: Acceder a Firebase Authentication
1. Abre Firebase Console: https://console.firebase.google.com
2. Selecciona el proyecto: **beteldej-teams**
3. Ve a **Authentication** → **Users**

#### Paso 2: Verificar si el usuario existe
- **Busca el email:** `reviewer@googleplay.beteldej.com`
- Si aparece, ve al **Paso 3** para resetear contraseña
- Si NO aparece, ve al **Paso 4** para crear usuario

#### Paso 3: Resetear contraseña (si el usuario ya existe)
1. Haz clic en los tres puntos (⋮) junto al usuario
2. Selecciona **"Reset password"**
3. **IMPORTANTE**: No uses el reset por email, establece la contraseña manualmente
4. Nueva contraseña: `ReviewBetel2026!`
5. Guarda y verifica que el estado sea **"Verified"**

#### Paso 4: Crear nuevo usuario (si no existe)
1. Haz clic en **"Add user"**
2. Completa:
   - **Email**: `reviewer@googleplay.beteldej.com`
   - **Password**: `ReviewBetel2026!`
   - **User ID**: (se genera automáticamente, cópialo)
3. Marca **"Email verified"** como **true**
4. Haz clic en **"Add user"**

#### Paso 5: Crear perfil en Firestore
1. Ve a **Firestore Database** → **Data**
2. Selecciona la colección: **users**
3. Haz clic en **"Add document"**
4. **Document ID**: Pega el UID del usuario creado en el Paso 4
5. Agrega los siguientes campos:

```json
{
  "email": "reviewer@googleplay.beteldej.com",
  "displayName": "Google Play Reviewer",
  "role": "admin",
  "createdAt": [Timestamp actual - usa el botón del calendario],
  "phoneNumber": "+40700000002",
  "teams": []
}
```

6. Haz clic en **"Save"**

---

### Opción B: Usar el script automatizado (requiere configuración)

Si prefieres automatizar el proceso, sigue estos pasos:

#### Paso 1: Obtener Service Account JSON de Firebase

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona **beteldej-teams**
3. Ve a **Project Settings** → **Service accounts**
4. Haz clic en **"Generate new private key"**
5. Descarga el archivo JSON
6. Guárdalo en: `mobile/firebase-secrets/beteldej/service-account.json`

⚠️ **CRÍTICO**: Este archivo contiene credenciales de administrador completo
- **NUNCA** lo subas a Git
- **NUNCA** lo compartas públicamente
- Asegúrate de que esté en `.gitignore`

#### Paso 2: Configurar variables de entorno

1. Crea un archivo `.env` en `church-organizer/`:

```bash
cp .env.example .env
```

2. Edita `.env` con estas credenciales:

```bash
TEST_USER_EMAIL=reviewer@googleplay.beteldej.com
TEST_USER_PASSWORD=ReviewBetel2026!
TEST_USER_DISPLAY_NAME=Google Play Reviewer
TEST_USER_ROLE=admin
SERVICE_ACCOUNT_PATH=../mobile/firebase-secrets/beteldej/service-account.json
```

⚠️ **IMPORTANTE**: El archivo `.env` tampoco debe subirse a Git

#### Paso 3: Instalar dependencias

```bash
cd church-organizer
npm install firebase-admin dotenv
```

#### Paso 4: Ejecutar el script

```bash
node create-test-user.js
```

**Salida esperada:**
```
Auth user created successfully: [UID]
User profile created in Firestore with role: admin
✓ Test user creation completed successfully
```

---

## 🧪 Verificar que las credenciales funcionan

Después de crear/actualizar el usuario, **DEBES verificar** que las credenciales funcionan antes de actualizar Google Play Console.

### Método 1: Usar un emulador Android

1. Descarga el APK más reciente de EAS:
   - Ve a: https://expo.dev/accounts/calaespi/projects/church-teams/builds
   - Descarga el APK de la última build exitosa

2. Instala en emulador Android Studio:
```bash
adb install ruta/al/archivo.apk
```

3. Abre la app e intenta iniciar sesión:
   - **Email**: `reviewer@googleplay.beteldej.com`
   - **Password**: `ReviewBetel2026!`

4. ✅ **Debe funcionar**: Deberías ver el dashboard principal con acceso a todos los equipos

### Método 2: Usar un dispositivo Android físico

1. Descarga el APK en tu teléfono
2. Activa "Instalar desde fuentes desconocidas"
3. Instala el APK
4. Prueba el login con las credenciales

---

## 📝 Actualizar Google Play Console

Una vez **verificado** que las credenciales funcionan:

### Paso 1: Ir a Google Play Console
1. Abre: https://play.google.com/console
2. Selecciona la app: **Betel Dej Teams**
3. Ve a: **Publishing overview**

### Paso 2: Actualizar "Sign-in details"
1. Busca la sección **"Sign in details"** o **"App access"**
2. Edita la declaración
3. Actualiza con:

```
Username: reviewer@googleplay.beteldej.com
Password: ReviewBetel2026!

Login Instructions:
1. Launch Betel Dej Teams app
2. Tap "Entrar" / "Sign In"
3. Enter email: reviewer@googleplay.beteldej.com
4. Enter password: ReviewBetel2026!
5. Tap "Entrar" to sign in
6. You will have full admin access to all features

Features available:
- View all teams and members
- Create and manage events
- Access calendar and schedules
- View and manage notifications
- Full profile access
- Admin privileges

No additional setup, 2FA, or verification required.
```

### Paso 3: Enviar para revisión
1. Guarda los cambios
2. Ve a **Publishing overview**
3. Haz clic en **"Send changes to review"**
4. Confirma el envío

---

## 📋 Checklist Final

Antes de enviar a Google Play, verifica:

- [ ] Usuario `reviewer@googleplay.beteldej.com` existe en Firebase Authentication
- [ ] Password es exactamente: `ReviewBetel2026!`
- [ ] Email está marcado como "Verified" en Firebase Auth
- [ ] Perfil existe en Firestore colección `users`
- [ ] Rol del usuario es `admin` en Firestore
- [ ] **HAS PROBADO** las credenciales en la app y funcionan correctamente
- [ ] Credenciales actualizadas en Google Play Console
- [ ] Instrucciones de login claras y precisas en Google Play Console
- [ ] Cambios enviados para revisión en Google Play

---

## 🔒 Notas de Seguridad

### Credenciales solo para revisión:
- Esta cuenta es **EXCLUSIVAMENTE** para revisores de Google Play
- **NO** es para uso interno del equipo
- **NO** debe compartirse públicamente

### Dónde guardar las credenciales:
✅ **SÍ guardar en:**
- Google Play Console (campo interno de revisión)
- Gestor de secretos del equipo (1Password, LastPass, etc.)
- Firebase Console (cuenta creada)

❌ **NO guardar en:**
- Documentación pública (README, APP_STORE_LISTING.md)
- Código fuente (archivos .js, .ts, .jsx)
- Commits de Git
- Comentarios del código

### Rotar credenciales si:
- Se exponen públicamente
- Se suben a Git por error
- Se incluyen en documentación pública
- Han pasado 6+ meses desde la última rotación

---

## 📞 Soporte

Si tienes problemas:

1. **Error de autenticación en la app:**
   - Verifica que el usuario existe en Firebase Auth
   - Confirma que el email está verificado
   - Revisa que la contraseña sea exactamente `ReviewBetel2026!`

2. **Usuario no puede acceder a funciones:**
   - Verifica en Firestore que el campo `role` sea `admin`
   - Confirma que el campo `teams` existe (puede estar vacío: `[]`)

3. **Script falla al ejecutar:**
   - Verifica que `service-account.json` existe y es válido
   - Confirma que las variables de entorno en `.env` son correctas
   - Revisa permisos de Firestore rules

---

**Fecha de creación**: 28 julio 2026
**Última actualización**: 28 julio 2026
**Propósito**: Resolver rechazo de Google Play por credenciales incorrectas
