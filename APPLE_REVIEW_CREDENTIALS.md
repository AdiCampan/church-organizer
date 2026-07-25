# Credenciales para Revisión de Apple - Betel Dej Teams

## 🔐 Información de inicio de sesión para revisores de Apple

### Nombre de usuario
```
reviewer@googleplay.beteldej.com
```

### Contraseña
```
ReviewBetel2026!
```

### Notas adicionales (para el campo "Notes")
```
This is a test account with full administrator access.

Login steps:
1. Open Betel Dej Teams app
2. Tap "Sign In" or "Conectare"
3. Enter the email and password provided above
4. You will have immediate access to all features

The account includes:
- Full admin privileges
- Access to all teams and events
- Ability to create, edit, and delete content
- View all member information
- Receive push notifications

No additional verification or setup required.
```

---

## ✅ Es necesario iniciar sesión
**Marca esta opción**: ✅ SÍ, es necesario iniciar sesión

---

## 📱 Export Compliance (Cumplimiento de exportación)

### ¿Tu app usa encriptación?
**Respuesta**: SÍ

### ¿Qué tipo de encriptación usa?
**Respuesta**: Solo encriptación estándar (HTTPS/TLS)

### ¿Está exenta de regulaciones de exportación de EE.UU.?
**Respuesta**: SÍ - La app solo usa encriptación estándar HTTPS proporcionada por el sistema operativo y librerías públicas (Firebase).

**Justificación**: 
- La app usa HTTPS/TLS para comunicaciones con Firebase
- No implementa algoritmos criptográficos propietarios
- Usa solo librerías de encriptación estándar del sistema
- Está exenta según las normas de exportación de EE.UU.

---

## 🚀 Submit con EAS

### Comando para hacer submit:
```bash
cd /Users/calaespi/Desktop/Proyectos/Personales/EbenEzer/church-organizer/mobile
eas submit -p ios --profile beteldej --latest
```

**Nota**: Este comando requiere que:
1. Ya tengas un build de iOS completado exitosamente
2. Estés autenticado con tu Apple ID en EAS
3. Tengas la app creada en App Store Connect

---

## 📋 Checklist antes de submit

- [ ] Build de iOS completado en EAS
- [ ] App creada en App Store Connect
- [ ] Información de la app completada (nombre, descripción, etc.)
- [ ] Capturas de pantalla subidas
- [ ] Política de privacidad configurada
- [ ] Información de contacto completada
- [ ] Credenciales de prueba añadidas
- [ ] Export compliance respondido
- [ ] Categoría y rating configurados

Una vez todo esté listo, ejecuta el comando de submit arriba.
