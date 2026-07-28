# ⚡ Solución Rápida - Google Play Rechazo

## 🚨 Problema
Google Play rechazó **Betel Dej Teams** porque las credenciales de login no funcionan.

---

## ✅ Solución en 3 Pasos

### ⏱️ Opción Rápida (5 minutos - NO requiere scripts)

#### 1️⃣ Ir a Firebase Console
🔗 https://console.firebase.google.com/project/beteldej-teams/authentication/users

#### 2️⃣ Buscar o crear usuario
**Email:** `reviewer@googleplay.beteldej.com`

**Si el usuario NO existe:**
- Haz clic en **"Add user"**
- Email: `reviewer@googleplay.beteldej.com`
- Password: `ReviewBetel2026!`
- Marca "Email verified" ✅
- Haz clic en **"Add user"** y copia el **UID** generado

**Si el usuario ya existe:**
- Haz clic en los tres puntos (⋮)
- Selecciona **"Reset password"**
- Password: `ReviewBetel2026!`
- Copia el **UID** del usuario

#### 3️⃣ Crear/Verificar perfil en Firestore
🔗 https://console.firebase.google.com/project/beteldej-teams/firestore/data/~2Fusers

- Busca el documento con ID = **UID** del paso anterior
- Si NO existe, créalo con estos campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `email` | string | `reviewer@googleplay.beteldej.com` |
| `displayName` | string | `Google Play Reviewer` |
| `role` | string | `admin` |
| `createdAt` | timestamp | *Timestamp actual* |
| `phoneNumber` | string | `+40700000002` |
| `teams` | array | `[]` *(vacío)* |

- Si existe, verifica que el campo `role` sea `admin`

---

### 🧪 Probar las credenciales

**ANTES** de actualizar Google Play Console, **DEBES probar** que las credenciales funcionan:

#### Opción A: Descarga APK y prueba en emulador

1. Ve a EAS: https://expo.dev/accounts/calaespi/projects/church-teams/builds
2. Descarga el APK más reciente
3. Instala en emulador Android:
   ```bash
   adb install ruta/al/archivo.apk
   ```
4. Abre la app e intenta login:
   - Email: `reviewer@googleplay.beteldej.com`
   - Password: `ReviewBetel2026!`
5. ✅ **Debe funcionar** - Deberías ver el dashboard

---

### 📝 Actualizar Google Play Console

Una vez **verificado** que funciona:

1. Ve a: https://play.google.com/console
2. Selecciona: **Betel Dej Teams**
3. Ve a: **App access** o **Sign-in details**
4. Actualiza con:

```
Username: reviewer@googleplay.beteldej.com
Password: ReviewBetel2026!

Login Instructions:
1. Launch Betel Dej Teams app
2. Tap "Entrar"
3. Email: reviewer@googleplay.beteldej.com
4. Password: ReviewBetel2026!
5. Full admin access granted

No 2FA or additional setup required.
```

5. **Guarda** los cambios
6. Ve a **Publishing overview**
7. Haz clic en **"Send changes to review"**

---

## 📋 Checklist Final

Antes de enviar a Google Play:

- [ ] Usuario existe en Firebase Auth con email `reviewer@googleplay.beteldej.com`
- [ ] Password es exactamente `ReviewBetel2026!`
- [ ] Email marcado como **"Verified"** ✅
- [ ] Perfil existe en Firestore → colección `users`
- [ ] Campo `role` es `admin` en Firestore
- [ ] **HE PROBADO** las credenciales en la app y funcionan ✅
- [ ] Credenciales actualizadas en Google Play Console
- [ ] Cambios enviados para revisión

---

## 🔧 Opción Avanzada (Usar Scripts)

Si prefieres usar scripts automatizados:

```bash
# 1. Verificar estado de la cuenta
cd church-organizer
node check-reviewer-account.js

# 2. Resetear password o crear cuenta
node reset-reviewer-password.js
# O si no existe:
node create-test-user.js

# 3. Verificar que se creó correctamente
node check-reviewer-account.js
```

📖 **Más información:** Ver `REVIEWER_SCRIPTS_README.md`

---

## 📞 Si algo no funciona

**Síntoma:** Login falla en la app
- ✅ Verifica que el email esté marcado como "Verified"
- ✅ Verifica que el perfil de Firestore existe
- ✅ Verifica que el rol sea "admin"
- ✅ Resetea la contraseña de nuevo en Firebase Console

**Síntoma:** No puedo crear el usuario
- ✅ Verifica que estás en el proyecto correcto: `beteldej-teams`
- ✅ Verifica que tienes permisos de administrador del proyecto
- ✅ Intenta desde otro navegador o en modo incógnito

**Síntoma:** Los scripts no funcionan
- ✅ Necesitas descargar `service-account.json` de Firebase Console
- ✅ Ver `REVIEWER_SCRIPTS_README.md` para más detalles

---

## 📚 Documentación Adicional

- 📖 **GOOGLE_PLAY_REVIEWER_FIX.md** - Guía completa paso a paso
- 📖 **REVIEWER_SCRIPTS_README.md** - Documentación de scripts
- 📖 **SECURITY_NOTES.md** - Notas de seguridad importantes

---

**Última actualización:** 28 julio 2026  
**Tiempo estimado:** 5-10 minutos
