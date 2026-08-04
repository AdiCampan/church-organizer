# 🚀 Google Play Reviewer Account - Complete Solution

## 📋 Tabla de Contenidos

1. [Problema](#-problema)
2. [Solución Rápida](#-solución-rápida)
3. [Documentación](#-documentación)
4. [Scripts Disponibles](#-scripts-disponibles)
5. [Instalación](#-instalación)
6. [Uso](#-uso)

---

## 🚨 Problema

Google Play rechazó **Betel Dej Teams** (Version Code 3) porque las credenciales de inicio de sesión no funcionan.

**Error:**
```
Login credentials are incorrect
Your provided login information does not allow us to access your app.
```

---

## ⚡ Solución Rápida

### Opción 1: Método Automatizado (Recomendado)

```bash
# 1. Instalar dependencias
cd church-organizer
npm install

# 2. Ejecutar fix automático
npm run fix-reviewer
```

Este script detectará automáticamente el problema y lo corregirá.

### Opción 2: Método Manual (5 minutos)

1. Abre Firebase Console: https://console.firebase.google.com/project/beteldej-teams/authentication/users
2. Busca o crea el usuario: `reviewer@googleplay.beteldej.com`
3. Password: `[SECURE_PASSWORD]`
4. Crea el perfil en Firestore con rol `admin`

📖 **Ver guía detallada:** [QUICK_FIX_GOOGLE_PLAY.md](./QUICK_FIX_GOOGLE_PLAY.md)

---

## 📚 Documentación

### Guías Disponibles

| Documento | Descripción | Tiempo | Audiencia |
|-----------|-------------|--------|-----------|
| **[QUICK_FIX_GOOGLE_PLAY.md](./QUICK_FIX_GOOGLE_PLAY.md)** ⚡ | Solución rápida en 3 pasos | 5 min | Usuario final |
| **[GOOGLE_PLAY_REVIEWER_FIX.md](./GOOGLE_PLAY_REVIEWER_FIX.md)** 📖 | Guía completa con detalles | 15 min | Desarrollador |
| **[REVIEWER_SCRIPTS_README.md](./REVIEWER_SCRIPTS_README.md)** 🔧 | Documentación de scripts | 10 min | DevOps |
| **[GOOGLE_PLAY_REJECTION_SUMMARY.md](./GOOGLE_PLAY_REJECTION_SUMMARY.md)** 📊 | Resumen ejecutivo | 5 min | PM/Stakeholder |

### Archivos de Referencia

- `.env.example` - Template para variables de entorno
- `CREATE_TEST_USER_README.md` - Documentación original del script
- `SECURITY_NOTES.md` - Notas de seguridad importantes

---

## 🛠️ Scripts Disponibles

### 1. fix-reviewer (⭐ Recomendado)
**Script automatizado todo-en-uno**

```bash
npm run fix-reviewer
```

**Qué hace:**
- ✅ Detecta automáticamente si la cuenta existe
- ✅ Crea nueva cuenta o actualiza existente
- ✅ Verifica configuración completa
- ✅ Te pregunta antes de hacer cambios

**Cuándo usar:**
- Primera vez configurando
- Cuando las credenciales no funcionan
- Después de rechazo de Google Play

---

### 2. check-reviewer
**Verificar estado de la cuenta**

```bash
npm run check-reviewer
```

**Qué hace:**
- 🔍 Verifica si el usuario existe en Auth
- 🔍 Verifica perfil de Firestore
- 🔍 Comprueba rol y configuración
- 📋 Proporciona recomendaciones

**Cuándo usar:**
- Diagnosticar problemas
- Antes de crear un usuario
- Verificar configuración actual

---

### 3. reset-reviewer
**Resetear contraseña y configuración**

```bash
npm run reset-reviewer
```

**Qué hace:**
- 🔒 Resetea password a `[SECURE_PASSWORD]`
- ✅ Marca email como verificado
- 👤 Crea perfil si no existe
- 🔧 Actualiza rol a admin

**Cuándo usar:**
- Login falla en la app
- Después de cambiar password
- Para resolver problemas de credenciales

---

### 4. create-test-user
**Crear usuario nuevo con configuración personalizada**

```bash
# Configurar .env primero
cp .env.example .env
# Editar .env con tus valores

npm run create-test-user
```

**Qué hace:**
- ➕ Crea usuario en Firebase Auth
- 📄 Crea perfil en Firestore
- 🔄 Rollback automático si falla
- ⚙️ Usa variables de .env

**Cuándo usar:**
- Crear múltiples cuentas de prueba
- Configuración personalizada
- Usuarios con diferentes roles

---

## 📦 Instalación

### Requisitos Previos

- Node.js instalado (v16 o superior)
- Acceso a Firebase Console del proyecto `beteldej-teams`
- Service Account JSON de Firebase (solo para scripts)

### Paso 1: Instalar Dependencias

```bash
cd church-organizer
npm install
```

Esto instalará:
- `firebase-admin` - SDK de administración de Firebase
- `dotenv` - Gestión de variables de entorno

### Paso 2: Obtener Service Account (Solo para Scripts)

Si vas a usar los scripts automatizados:

1. Ve a: https://console.firebase.google.com/project/beteldej-teams/settings/serviceaccounts/adminsdk
2. Haz clic en **"Generate new private key"**
3. Descarga el archivo JSON
4. Guárdalo en: `mobile/firebase-secrets/beteldej/service-account.json`

⚠️ **IMPORTANTE:** Este archivo NO debe subirse a Git

### Paso 3: Configurar Variables (Opcional)

Solo si vas a usar `create-test-user` con configuración personalizada:

```bash
cp .env.example .env
# Editar .env con las credenciales deseadas
```

---

## 🎯 Uso

### Escenario 1: Solución Rápida (Recomendado para el problema actual)

```bash
# Instalar
npm install

# Ejecutar fix automático
npm run fix-reviewer

# Seguir las instrucciones en pantalla
# El script te preguntará antes de hacer cambios
```

### Escenario 2: Diagnóstico Paso a Paso

```bash
# 1. Verificar estado actual
npm run check-reviewer

# 2. Según el resultado:
# - Si NO existe: npm run fix-reviewer
# - Si existe con problemas: npm run reset-reviewer

# 3. Verificar corrección
npm run check-reviewer
```

### Escenario 3: Sin Scripts (Manual)

Si prefieres no usar scripts o no tienes el service account:

1. Lee: [QUICK_FIX_GOOGLE_PLAY.md](./QUICK_FIX_GOOGLE_PLAY.md)
2. Sigue los pasos manuales en Firebase Console
3. Toma 5 minutos, no requiere configuración

---

## 🧪 Verificación

**CRÍTICO:** Siempre verifica que las credenciales funcionen antes de actualizar Play Console.

### Método 1: Emulador Android

```bash
# 1. Descarga APK de EAS
# https://expo.dev/accounts/calaespi/projects/church-teams/builds

# 2. Inicia emulador Android Studio

# 3. Instala APK
adb install ruta/al/archivo.apk

# 4. Intenta login
# Email: reviewer@googleplay.beteldej.com
# Password: [SECURE_PASSWORD]

# ✅ Debe mostrar el dashboard principal
```

### Método 2: Dispositivo Android Físico

1. Descarga APK en tu teléfono
2. Activa "Instalar desde fuentes desconocidas"
3. Instala y prueba login

---

## 📝 Actualizar Google Play Console

Una vez **verificado** que las credenciales funcionan:

1. Ve a: https://play.google.com/console
2. Selecciona: **Betel Dej Teams**
3. Ve a: **App access** → **Sign-in details**
4. Actualiza con:
   - Username: `reviewer@googleplay.beteldej.com`
   - Password: `[SECURE_PASSWORD]`
   - Instrucciones de login (ver [QUICK_FIX_GOOGLE_PLAY.md](./QUICK_FIX_GOOGLE_PLAY.md))
5. Guarda y envía para revisión

---

## 📋 Checklist Final

Antes de enviar a Google Play:

- [ ] Usuario existe en Firebase Auth
- [ ] Password es `[SECURE_PASSWORD]`
- [ ] Email marcado como "Verified" ✅
- [ ] Perfil existe en Firestore
- [ ] Campo `role` es `admin`
- [ ] **HE PROBADO** las credenciales en la app ✅
- [ ] Credenciales actualizadas en Play Console
- [ ] Cambios enviados para revisión

---

## ❓ Ayuda Adicional

### Comando de Ayuda

```bash
npm run help
```

Muestra lista de scripts disponibles.

### Troubleshooting

Ver sección de troubleshooting en:
- [REVIEWER_SCRIPTS_README.md](./REVIEWER_SCRIPTS_README.md) - Para problemas con scripts
- [GOOGLE_PLAY_REVIEWER_FIX.md](./GOOGLE_PLAY_REVIEWER_FIX.md) - Para problemas generales

### Contacto

Si tienes problemas que no puedes resolver:
1. Revisa los logs del script
2. Ejecuta `npm run check-reviewer` para diagnóstico
3. Consulta [SECURITY_NOTES.md](./SECURITY_NOTES.md) para problemas de permisos

---

## 🔒 Seguridad

### Credenciales del Revisor

```
Email: reviewer@googleplay.beteldej.com
Password: [SECURE_PASSWORD]
```

**Usar SOLO para:**
- ✅ Revisores de Google Play
- ✅ Testing antes de subir a Play Store
- ✅ Scripts de administración

**NO usar para:**
- ❌ Documentación pública
- ❌ Commits de Git
- ❌ Código fuente

### Archivos Sensibles

Estos archivos NO deben subirse a Git:
- `.env` - Credenciales de prueba
- `service-account.json` - Credenciales admin Firebase
- Cualquier archivo con contraseñas

Verifica que estén en `.gitignore`.

---

## 📊 Información del Proyecto

**App:** Betel Dej Teams  
**Package:** com.beteldej.teams  
**Firebase Project:** beteldej-teams  
**Play Store Status:** Rejected (Version Code 3)  
**Issue:** Login credentials incorrect  
**Fecha del rechazo:** 28 julio 2026  

---

## 🎉 Resumen

Esta solución proporciona:

- ✅ **Scripts automatizados** para gestión de cuentas
- ✅ **Guías paso a paso** para solución manual
- ✅ **Documentación completa** para todos los escenarios
- ✅ **Troubleshooting** detallado
- ✅ **Verificación** de configuración

**Tiempo total de solución:** 5-10 minutos  
**Dificultad:** Baja (guía manual) a Media (scripts)  
**Requiere conocimientos de:** Firebase Console (manual) o Terminal (scripts)

---

**Última actualización:** 28 julio 2026  
**Versión:** 1.0  
**Autor:** Calatayud Digital Solutions
