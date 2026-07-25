# Notas de Seguridad - Credenciales Expuestas

## CRÍTICO: Credenciales en texto plano detectadas

Los siguientes archivos contienen credenciales sensibles en texto plano que deben eliminarse del repositorio:

### 1. APPLE_REVIEW_ACCOUNT.md
**Credenciales expuestas:**
- Email: applereview@beteldej.teams
- Password: [REDACTED - must be rotated immediately]

**Ubicaciones:**
- Líneas 7-15 (información de inicio de sesión)
- Líneas 21-40 (notas para revisores)
- Líneas 49-57 (configuración App Store Connect)

### 2. create-test-user.js
**Credenciales expuestas:**
- Email: reviewer@googleplay.com
- Password: [REDACTED - must be rotated immediately]

**Ubicaciones:**
- Líneas 18-35 (función createTestUser)

**Problemas adicionales:**
- Líneas 4-12: Configuración incorrecta de service account con privateKey dummy
- El usuario de prueba recibe rol 'admin' automáticamente

### 3. CAPTURAS_REALES_GUIA.md
**Credenciales expuestas:**
- Email y password de Google Play reviewer [REDACTED]

**Ubicaciones:**
- Líneas 24-26

## Acciones Requeridas

### Paso 1: Rotar TODAS las contraseñas
1. **Cuenta Apple Review** (applereview@beteldej.teams)
   - Ir a Firebase Console: https://console.firebase.google.com/project/beteldej-teams/authentication/users
   - Cambiar contraseña a una nueva segura
   - Actualizar credenciales en App Store Connect (sección privada "App Review Information")

2. **Cuenta Google Play** (reviewer@googleplay.com o reviewer@googleplay.beteldej.com)
   - Ir a Firebase Console
   - Cambiar contraseña
   - Actualizar en Google Play Console (solo en campo interno, NO en documentación pública)

### Paso 2: Usar gestor de secretos
Las credenciales de prueba deben almacenarse SOLO en:
- **App Store Connect**: Campo privado "App Review Information"
- **Google Play Console**: Campo interno de notas de revisión
- **Gestor de secretos interno**: Para uso del equipo (1Password, LastPass, etc.)

### Paso 3: Eliminar del repositorio
Eliminar las credenciales de:
- APPLE_REVIEW_ACCOUNT.md (todo el archivo o reemplazar por instrucciones genéricas)
- create-test-user.js (no debe contener credenciales hardcoded)
- CAPTURAS_REALES_GUIA.md
- APP_STORE_LISTING.md
- Cualquier otro archivo de documentación

### Paso 4: Limpiar historial de Git
Después de eliminar las credenciales, considerar usar herramientas como:
- `git filter-branch` o `git-filter-repo`
- BFG Repo-Cleaner

Para eliminar las credenciales del historial completo del repositorio.

## Mejoras de Seguridad Adicionales

### create-test-user.js
✅ **CORREGIDO** - Script refactorizado:
- Service Account cargado desde archivo válido
- Credenciales leídas desde variables de entorno (TEST_USER_EMAIL, TEST_USER_PASSWORD)
- Rol por defecto cambiado a 'member' en lugar de 'admin'
- Agregado archivo .env.example para documentar variables requeridas
- Usuario de prueba ahora debe recibir rol admin manualmente en Firestore Console

**Uso correcto:**
```bash
TEST_USER_EMAIL=user@example.com TEST_USER_PASSWORD=secure123 node create-test-user.js
```

### Firestore Rules
✅ **CORREGIDO** - Las reglas de seguridad han sido mejoradas:
- Restringido acceso de lectura en colección users (solo owner o admin)
- Implementada protección contra auto-modificación del campo 'role'
- Añadidas verificaciones de pertenencia a equipo para colección teams
- Protección contra modificación de campos de autorización en teams (members, leaders, admins)
- Mejores controles de escritura en todas las colecciones

⚠️ **LIMITACIÓN DE DISEÑO**: Events, schedules y notifications mantienen acceso de lectura para usuarios autenticados porque:
- Events usa `requiredTeams` (array) en lugar de un único `teamId`
- Schedules se relaciona con eventos, no directamente con teams
- Notifications puede ser global o por equipo (`targetTeamId`)
- El esquema actual está diseñado para visibilidad global de eventos
- Aplicar `hasTeamAccess` requeriría refactorización del esquema de datos

## Estado Actual

- ✅ Firestore rules mejoradas (con limitaciones documentadas)
- ✅ delete-account.html actualizado con verificación de propiedad
- ✅ create-test-user.js refactorizado para usar variables de entorno
- ⚠️ Credenciales AÚN EXPUESTAS en APPLE_REVIEW_ACCOUNT.md (requiere acción manual)
- ⚠️ Contraseñas deben rotarse INMEDIATAMENTE

## Próximos Pasos Inmediatos

1. **URGENTE**: Rotar todas las contraseñas de cuentas de prueba
2. **URGENTE**: Eliminar o mover APPLE_REVIEW_ACCOUNT.md fuera del repositorio
3. Purgar credenciales del historial de Git usando git-filter-repo
4. Crear archivo .env con credenciales de prueba (NO commitear)
5. Implementar política de no commitear credenciales en el futuro
6. Considerar refactorización de esquema para mejor aislamiento por equipo (opcional)

---

**Fecha de detección**: 25 julio 2026
**Severidad**: CRÍTICA
**Estado**: Pendiente de acción del usuario
