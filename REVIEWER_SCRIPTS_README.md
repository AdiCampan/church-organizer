# Scripts para Gestionar Cuenta de Revisor de Google Play

Este directorio contiene scripts para gestionar la cuenta de revisor de Google Play en Firebase.

## 📋 Scripts Disponibles

### 1. `check-reviewer-account.js` - Verificar estado de cuenta
**Uso:** Verifica si la cuenta de revisor existe y está configurada correctamente.

```bash
node check-reviewer-account.js
```

**Qué hace:**
- ✅ Verifica si el usuario existe en Firebase Authentication
- ✅ Verifica si el perfil existe en Firestore
- ✅ Comprueba el rol del usuario
- ✅ Verifica si el email está verificado
- ✅ Proporciona recomendaciones basadas en el estado

**Cuándo usar:**
- Antes de crear un nuevo usuario (para evitar duplicados)
- Para diagnosticar problemas de login
- Para verificar que todo está configurado correctamente

---

### 2. `reset-reviewer-password.js` - Resetear contraseña
**Uso:** Actualiza la contraseña del revisor y verifica la configuración.

```bash
node reset-reviewer-password.js
```

**Qué hace:**
- 🔒 Resetea la contraseña a `ReviewBetel2026!`
- ✅ Marca el email como verificado
- 👤 Crea el perfil de Firestore si no existe
- 🔧 Actualiza el rol a `admin` si es necesario

**Cuándo usar:**
- Cuando las credenciales no funcionan en la app
- Después de cambiar la contraseña manualmente
- Para resolver rechazos de Google Play por credenciales incorrectas

---

### 3. `create-test-user.js` - Crear usuario nuevo
**Uso:** Crea un usuario de prueba completamente nuevo.

```bash
# Configurar primero el archivo .env
cp .env.example .env
# Editar .env con las credenciales

# Luego ejecutar:
node create-test-user.js
```

**Qué hace:**
- ➕ Crea usuario en Firebase Authentication
- 📄 Crea perfil en Firestore
- 🔄 Hace rollback automático si algo falla
- ⚠️ Falla si el usuario ya existe

**Cuándo usar:**
- Para crear un usuario completamente nuevo
- Cuando quieres crear múltiples cuentas de prueba
- Con variables personalizadas (email, password, role)

---

## 🔧 Configuración

### Paso 1: Obtener Service Account
Todos los scripts requieren un archivo service account de Firebase.

1. Ve a: https://console.firebase.google.com
2. Selecciona: **beteldej-teams**
3. Ve a: **Project Settings** → **Service accounts**
4. Haz clic en: **"Generate new private key"**
5. Descarga el archivo JSON
6. Guárdalo en: `mobile/firebase-secrets/beteldej/service-account.json`

⚠️ **IMPORTANTE**: Este archivo NO debe subirse a Git. Verifica que esté en `.gitignore`.

### Paso 2: Instalar dependencias

```bash
npm install firebase-admin dotenv
```

### Paso 3: Configurar variables de entorno (solo para create-test-user.js)

```bash
cp .env.example .env
# Editar .env según sea necesario
```

---

## 🎯 Flujo de Trabajo Recomendado

### Escenario 1: Primera vez configurando cuenta de revisor

```bash
# 1. Verificar si ya existe
node check-reviewer-account.js

# 2. Si NO existe, crear con el script
node create-test-user.js

# 3. Verificar que se creó correctamente
node check-reviewer-account.js

# 4. Probar login en la app
# 5. Actualizar Google Play Console
```

### Escenario 2: Cuenta existe pero credenciales no funcionan

```bash
# 1. Verificar estado actual
node check-reviewer-account.js

# 2. Resetear contraseña y configuración
node reset-reviewer-password.js

# 3. Verificar que se actualizó
node check-reviewer-account.js

# 4. Probar login en la app
# 5. Actualizar Google Play Console si es necesario
```

### Escenario 3: Google Play rechazó por credenciales incorrectas

```bash
# Este es el caso actual - sigue estos pasos:

# 1. Verificar estado de la cuenta
node check-reviewer-account.js

# 2a. Si la cuenta NO existe:
node create-test-user.js

# 2b. Si la cuenta existe pero hay problemas:
node reset-reviewer-password.js

# 3. Probar las credenciales en la app
# Descarga el APK de EAS e instala en emulador
# Email: reviewer@googleplay.beteldej.com
# Password: ReviewBetel2026!

# 4. Una vez verificado que funciona, actualizar Google Play Console
# Ver GOOGLE_PLAY_REVIEWER_FIX.md para instrucciones detalladas
```

---

## 🧪 Probar las Credenciales

Después de ejecutar cualquier script, **SIEMPRE** prueba las credenciales:

### Opción A: Emulador Android Studio

```bash
# 1. Descarga APK de EAS
# 2. Inicia emulador Android
# 3. Instala APK:
adb install ruta/al/archivo.apk

# 4. Abre la app e intenta login:
#    Email: reviewer@googleplay.beteldej.com
#    Password: ReviewBetel2026!
```

### Opción B: Dispositivo físico

1. Descarga APK en tu teléfono Android
2. Activa "Instalar desde fuentes desconocidas"
3. Instala el APK
4. Intenta login con las credenciales

### Opción C: Firebase Console (verificación rápida)

1. Ve a: https://console.firebase.google.com/project/beteldej-teams/authentication/users
2. Busca: `reviewer@googleplay.beteldej.com`
3. Verifica que aparece y está marcado como "Verified"

---

## ❌ Troubleshooting

### Error: "Service account JSON not found"

**Problema:** No existe el archivo `service-account.json`

**Solución:**
1. Descarga el service account de Firebase Console
2. Guárdalo en: `mobile/firebase-secrets/beteldej/service-account.json`
3. Verifica que el path en `.env` es correcto (si usas .env)

---

### Error: "auth/user-not-found"

**Problema:** El usuario no existe en Firebase Authentication

**Solución:**
1. Usa `create-test-user.js` para crear el usuario
2. O créalo manualmente en Firebase Console

---

### Error: "The email address is already in use"

**Problema:** El usuario ya existe

**Solución:**
1. Usa `reset-reviewer-password.js` en lugar de `create-test-user.js`
2. O usa `check-reviewer-account.js` para ver el estado actual

---

### Error: Login falla en la app

**Problema:** Las credenciales no funcionan en la app móvil

**Pasos de diagnóstico:**
1. Ejecuta `check-reviewer-account.js` para verificar estado
2. Verifica que el email esté marcado como "Verified"
3. Verifica que el perfil de Firestore existe
4. Verifica que el rol sea "admin"
5. Ejecuta `reset-reviewer-password.js` para resetear todo
6. Prueba de nuevo

---

## 📝 Credenciales del Revisor

**IMPORTANTE:** Estas credenciales son SOLO para revisores de Google Play.

```
Email: reviewer@googleplay.beteldej.com
Password: ReviewBetel2026!
```

**Dónde usar:**
- ✅ Google Play Console (campo interno de revisión)
- ✅ Para probar la app antes de subir a Play Store
- ✅ Scripts de administración

**Dónde NO usar:**
- ❌ Documentación pública
- ❌ Código fuente
- ❌ Commits de Git
- ❌ Comentarios de código

---

## 🔐 Seguridad

### Archivos que NO deben subirse a Git:
- ❌ `.env` - Contiene credenciales de prueba
- ❌ `service-account.json` - Contiene credenciales de administrador Firebase
- ❌ Cualquier archivo con contraseñas en texto plano

### Verificar .gitignore:
```bash
# Estos patrones deben estar en .gitignore:
.env
*.json
!package.json
!package-lock.json
!firebase.json
**/firebase-secrets/**
service-account*.json
```

---

## 📞 Soporte

Para más información, consulta:
- `GOOGLE_PLAY_REVIEWER_FIX.md` - Guía completa de resolución
- `CREATE_TEST_USER_README.md` - Documentación del script create-test-user
- `SECURITY_NOTES.md` - Notas de seguridad

---

**Última actualización:** 28 julio 2026
