# Credenciales de Revisión - Apple App Store

## 🍎 Cuenta exclusiva para revisores de Apple

### Información de inicio de sesión

**Nombre de usuario / Email:**
```
applereview@beteldej.teams
```

**Contraseña:**
```
[SECURE_PASSWORD]
```

---

## 📝 Notas para el equipo de revisión

```
Test account with full administrator access for Apple App Review team.

Login instructions:
1. Launch Betel Dej Teams app
2. Tap "Sign In" / "Conectare"
3. Email: applereview@beteldej.teams
4. Password: [SECURE_PASSWORD]
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
[SECURE_PASSWORD]
```

---

## 🔧 Instrucciones para crear la cuenta en Firebase

Ejecuta estos pasos para crear la cuenta:

1. Ve a Firebase Console: https://console.firebase.google.com/project/beteldej-teams/authentication/users

2. Haz clic en "Add user"

3. Completa:
   - **Email**: applereview@beteldej.teams
   - **Password**: [SECURE_PASSWORD]
   - **User UID**: (se genera automáticamente)

4. Después de crear el usuario, añade su perfil en Firestore:
   - Collection: `users`
   - Document ID: (el UID generado)
   - Campos:
     ```json
     {
       "email": "applereview@beteldej.teams",
       "displayName": "Apple Review Team",
       "role": "admin",
       "createdAt": (timestamp actual),
       "phoneNumber": "+40700000001",
       "teams": []
     }
     ```

---

## 🆚 Diferencia con cuenta de Google Play

| Aspecto | Google Play | Apple App Store |
|---------|-------------|-----------------|
| Email | reviewer@googleplay.beteldej.com | applereview@beteldej.teams |
| Password | [SECURE_PASSWORD] | [SECURE_PASSWORD] |
| Uso | Solo Google Play Store | Solo Apple App Store |

---

**Fecha de creación**: 25 julio 2026
**Propósito**: Revisión de Apple App Store exclusivamente
