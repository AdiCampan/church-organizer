# Configuración Manual de Firebase - Betel Dej

## Proyecto: beteldej-teams

### Pasos necesarios en la consola de Firebase:

1. **Habilitar Firestore Database** ✅ YA CONFIGURADO
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/firestore
   - Hacer click en "Create database"
   - Seleccionar el modo "Production mode"
   - Elegir región: europe-west (o la más cercana)
   - **Estado**: ✅ Reglas de seguridad desplegadas correctamente

2. **Habilitar Firebase Authentication**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/authentication
   - Hacer click en "Get Started"
   - En la pestaña "Sign-in method", habilitar el proveedor "Email/Password"

3. **Verificar Cloud Messaging (para notificaciones push)**
   - Ir a: https://console.firebase.google.com/project/beteldej-teams/settings/cloudmessaging
   - Verificar que FCM esté habilitado (debería estar por defecto)

**Nota**: Firebase Storage NO se usa en este proyecto para evitar costos del plan Blaze. Todas las imágenes y archivos se manejan localmente o mediante URLs externas.

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
✅ `mobile/assets-beteldej/` - Assets personalizados (iconos, splash)

## Build commands:

### Android
```bash
cd mobile
eas build -p android --profile beteldej
```

Build completado exitosamente: https://expo.dev/accounts/calaespi/projects/church-teams/builds/4d6129dd-2fe8-465a-918c-baba667b4135

### iOS
```bash
cd mobile
eas build -p ios --profile beteldej
```

### Submit a tiendas

#### Google Play Store
```bash
cd mobile
eas submit -p android --profile beteldej
```

O descargar el .aab manualmente desde:
https://expo.dev/artifacts/eas/OK5ggIe9II0qEUP8YWlDI6Pv40e9jf2L52MkhpRVy-Y.aab

Y subirlo a Google Play Console:
1. Ir a https://play.google.com/console
2. Crear nueva aplicación con nombre "Betel Dej Teams"
3. Completar el formulario de la tienda
4. Subir el archivo .aab en "Releases" > "Production"
5. Completar la clasificación de contenido
6. Configurar la privacidad de datos
7. Enviar para revisión

#### Apple App Store
```bash
cd mobile
eas submit -p ios --profile beteldej
```

## Deploy Dashboard Web

1. **Configurar variables de entorno**
   ```bash
   cd dashboard
   cp beteldej.env .env
   ```

2. **Build del dashboard**
   ```bash
   npm run build
   ```

3. **Deploy a Firebase Hosting**
   ```bash
   firebase use beteldej
   firebase deploy --only hosting
   ```

La web estará disponible en: https://beteldej-teams.web.app
