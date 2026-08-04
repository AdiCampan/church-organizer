# Credenciales de Revisión - Apple App Store

## 🍎 Cuenta exclusiva para revisores de Apple

### Información de inicio de sesión

**Nombre de usuario / Email:**
```
applereview@beteldej.teams
```

**Contraseña:**
```
Set APPLE_REVIEW_PASSWORD in your local environment (do not commit the password).
```

**Firebase project (el que usa el build iOS):**
```
church-teams-8ea48
```

---

## 📝 Notas para el equipo de revisión

```
Test account with full administrator access for Apple App Review team.

Login instructions:
1. Launch Betel Dej Teams app
2. Tap "Sign In" / "Conectare"
3. Email: applereview@beteldej.teams
4. Password: (value configured in App Store Connect Review Information)
5. Instant access to all features

Features available:
- Full administrator privileges
- View and manage all teams
- Create, edit, and delete events
- Manage members and roles
- Access all notifications
- Complete profile management

No additional setup, 2FA, or verification required.
The account is ready to use immediately.
```

---

## ✅ Configuración en App Store Connect

### Es necesario iniciar sesión: **SÍ**

**Nombre de usuario:**
```
applereview@beteldej.teams
```

**Contraseña:**
```
Use the current APPLE_REVIEW_PASSWORD value in App Store Connect only.
```

**Support URL:**
```
https://beteldej-teams.web.app/support.html
```

---

## 🔧 Recrear / verificar la cuenta

```bash
cd church-organizer
APPLE_REVIEW_PASSWORD='your_secure_password' npm run fix-apple-reviewer
```

La cuenta debe existir en el proyecto **church-teams-8ea48** (no en beteldej-teams).

---

## 🆚 Diferencia con cuenta de Google Play

| Aspecto | Google Play | Apple App Store |
|---------|-------------|-----------------|
| Email | reviewer@googleplay.beteldej.com | applereview@beteldej.teams |
| Firebase project | church-teams-8ea48 | church-teams-8ea48 |
| Uso | Solo Google Play Store | Solo Apple App Store |

---

**Fecha de creación**: 25 julio 2026  
**Última verificación**: 4 agosto 2026  
**Propósito**: Revisión de Apple App Store exclusivamente
