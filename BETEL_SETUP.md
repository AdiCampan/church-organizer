# Configuración Manual de Firebase - Betel Dej

## Proyecto: beteldej-teams

### Pasos necesarios en la consola de Firebase:

1. **Habilitar Firestore Database**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/firestore
   - Hacer click en "Create database"
   - Seleccionar el modo "Production mode"
   - Elegir región: europe-west (o la más cercana)

2. **Habilitar Firebase Storage**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/storage
   - Hacer click en "Get Started"
   - Aceptar las reglas de seguridad por defecto
   - Elegir la misma región que Firestore

3. **Habilitar Firebase Authentication**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/authentication
   - Hacer click en "Get Started"
   - Habilitar el proveedor "Email/Password"

4. **Habilitar Cloud Messaging (para notificaciones push)**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/settings/cloudmessaging
   - Verificar que FCM esté habilitado

5. **Después de habilitar los servicios, ejecutar:**
   ```bash
   firebase use beteldej
   firebase deploy --only firestore:rules,storage:rules
   ```

## Credenciales ya configuradas:

- **Project ID**: beteldej-teams
- **Project Number**: 852946760638
- **App ID Android**: 1:852946760638:android:0161ddb349ba854c913fef
- **App ID iOS**: 1:852946760638:ios:3b7037dc31337c69913fef
- **Package Name**: com.beteldej.teams
- **Bundle ID**: com.beteldej.teams

## Archivos ya creados:

✅ `mobile/firebase-secrets/beteldej/google-services.json`
✅ `mobile/firebase-secrets/beteldej/GoogleService-Info.plist`
✅ `firestore.rules` - Reglas de seguridad de Firestore
✅ `storage.rules` - Reglas de seguridad de Storage
✅ `dashboard/beteldej.env` - Variables de entorno para el dashboard
✅ `.firebaserc` - Configuración de alias de proyectos

## Build commands:

### Android
```bash
cd mobile
eas build -p android --profile beteldej
```

### iOS
```bash
cd mobile
eas build -p ios --profile beteldej
```

### Submit a tiendas
```bash
eas submit -p android --profile beteldej
eas submit -p ios --profile beteldej
```
