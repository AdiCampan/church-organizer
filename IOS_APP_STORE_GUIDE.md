# Guía para publicar Betel Dej Teams en Apple App Store

## 📋 Requisitos previos

### 1. Cuenta Apple Developer ✅ o ❌
**Costo**: $99 USD/año

¿Ya tienes una cuenta Apple Developer?
- **SÍ**: Continúa con el paso 2
- **NO**: Crea una en: https://developer.apple.com/programs/enroll/

**Importante**: Necesitas:
- Apple ID
- Tarjeta de crédito/débito
- Información de la organización (Betel Dej)

---

## 🔑 Paso 1: Configurar credenciales de Apple

### Opción A: Configurar credenciales automáticamente (RECOMENDADO)

Ejecuta el build de forma **interactiva** (sin --non-interactive):

```bash
cd mobile
eas build -p ios --profile beteldej
```

EAS te preguntará:
1. ✅ **Apple ID**: Tu email de Apple Developer
2. ✅ **Contraseña**: Tu contraseña de Apple ID
3. ✅ **2FA**: Código de verificación de dos factores
4. ✅ **Team**: Selecciona tu equipo de Apple Developer

EAS creará automáticamente:
- Distribution Certificate
- Provisioning Profile
- App Identifier (com.beteldej.teams)

### Opción B: Configurar credenciales manualmente

1. Ve a: https://developer.apple.com/account
2. Crea un App ID:
   - Identifier: `com.beteldej.teams`
   - Name: Betel Dej Teams
3. Crea un Distribution Certificate
4. Crea un Provisioning Profile

---

## 📱 Paso 2: Crear build de iOS

Una vez configuradas las credenciales, ejecuta:

```bash
cd church-organizer/mobile
eas build -p ios --profile beteldej
```

El build tarda aproximadamente **10-20 minutos**.

Recibirás:
- Archivo `.ipa` para subir a App Store Connect
- URL de descarga del build

---

## 🎨 Paso 3: Preparar recursos para App Store

### Capturas de pantalla requeridas:

**iPhone 6.7" (Obligatorio)** - iPhone 15 Pro Max
- Tamaño: 1290 x 2796 px
- Mínimo: 3 capturas, máximo: 10

**iPhone 6.5"** - iPhone 11 Pro Max, XS Max
- Tamaño: 1242 x 2688 px
- Mínimo: 3 capturas, máximo: 10

**iPad Pro 12.9"** (Si soportas iPad)
- Tamaño: 2048 x 2732 px
- Mínimo: 3 capturas, máximo: 10

### Otros recursos:

✅ **Icono ya creado**: 1024x1024 px (PNG sin transparencia)
- Ya tenemos: `store-assets/app-icon-512x512.png` (redimensionar a 1024x1024)

✅ **Política de privacidad**: https://beteldej-teams.web.app/privacy-policy.html

✅ **URL de soporte**: https://beteldej-teams.web.app

---

## 📝 Paso 4: Crear app en App Store Connect

1. Ve a: https://appstoreconnect.apple.com
2. Haz clic en **"My Apps"** > **"+"** > **"New App"**
3. Completa:
   - **Platform**: iOS
   - **Name**: Betel Dej Teams
   - **Primary Language**: Romanian
   - **Bundle ID**: com.beteldej.teams
   - **SKU**: beteldej-teams (único para tu cuenta)
   - **User Access**: Full Access

---

## ✍️ Paso 5: Completar información de la app

### App Information
- **Name**: Betel Dej Teams
- **Subtitle** (30 caracteres): Gestionare echipe biserică
- **Privacy Policy URL**: https://beteldej-teams.web.app/privacy-policy.html
- **Category**: Primary: Productivity, Secondary: (opcional)

### Pricing and Availability
- **Price**: Free
- **Availability**: All countries

### App Privacy
- Completar cuestionario de privacidad (similar a Google Play)

---

## 📸 Paso 6: Subir capturas y build

### Capturas de pantalla
- Subir las capturas de iPhone 6.7"
- Opcionalmente: capturas de iPad

### Build
1. Una vez el build de EAS esté listo
2. Descarga el archivo `.ipa`
3. Sube a App Store Connect usando:
   - **Transporter app** (Mac): https://apps.apple.com/app/transporter/id1450874784
   - O directamente desde la web si está disponible

---

## 🚀 Paso 7: Submit para revisión

1. Completa toda la información requerida
2. Acepta los términos de Export Compliance
3. Haz clic en **"Submit for Review"**

**Tiempo de revisión**: 24-48 horas típicamente

---

## 📋 Checklist completo

### Requisitos previos
- [ ] Cuenta Apple Developer activa ($99/año)
- [ ] Apple ID con 2FA habilitado

### Credenciales y build
- [ ] Configurar credenciales de Apple en EAS
- [ ] Crear build iOS con EAS
- [ ] Descargar archivo .ipa

### Recursos gráficos
- [ ] Icono 1024x1024 px
- [ ] Capturas iPhone 6.7" (mínimo 3)
- [ ] Capturas iPhone 6.5" (opcional)
- [ ] Capturas iPad (opcional si soportas iPad)

### App Store Connect
- [ ] Crear app en App Store Connect
- [ ] Completar información de la app
- [ ] Configurar privacidad
- [ ] Subir capturas de pantalla
- [ ] Subir build .ipa con Transporter
- [ ] Submit para revisión

---

## 🔗 Enlaces útiles

- Apple Developer: https://developer.apple.com/account
- App Store Connect: https://appstoreconnect.apple.com
- EAS Builds: https://expo.dev/accounts/calaespi/projects/church-teams
- Guías de App Store: https://developer.apple.com/app-store/review/guidelines/

---

## ⚠️ Diferencias con Google Play

| Aspecto | Google Play | Apple App Store |
|---------|-------------|-----------------|
| Costo | $25 una vez | $99/año |
| Revisión | 1-3 días | 24-48 horas |
| Capturas | 2 mínimo | 3 mínimo |
| Tamaño iconos | 512x512 | 1024x1024 |
| Certificados | Automático con EAS | Requiere Apple Developer |

---

## 💡 Próximo paso INMEDIATO

¿Ya tienes una cuenta Apple Developer activa?

**SÍ** → Ejecuta: `cd mobile && eas build -p ios --profile beteldej`

**NO** → Crea cuenta en: https://developer.apple.com/programs/enroll/
