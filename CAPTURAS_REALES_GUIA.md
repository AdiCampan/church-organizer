# Guía para obtener CAPTURAS REALES de Betel Dej Teams

## ⚠️ IMPORTANTE: Solo capturas reales, NO mockups

Google Play requiere capturas de pantalla REALES de la aplicación funcionando.

---

## 📱 Método 1: Usar tu teléfono Android (RECOMENDADO)

### Paso 1: Instalar la app
1. Descarga el archivo APK desde EAS:
   - Ve a: https://expo.dev/accounts/calaespi/projects/church-teams/builds/4d6129dd-2fe8-465a-918c-baba667b4135
   - Haz clic en "Download" (si no hay APK, descarga el .aab y conviértelo)

2. Para convertir .aab a .apk (si es necesario):
   - Ve a: https://www.apkmirror.com/apk-tools/aab-to-apk-converter/
   - O usa: https://bundletool.github.io/

3. Instala el APK en tu teléfono Android
   - Activa "Instalar desde fuentes desconocidas" en Configuración
   - Abre el archivo APK descargado

### Paso 2: Iniciar sesión con la cuenta de prueba
- Email: `reviewer@googleplay.beteldej.com`
- Password: `ReviewBetel2026!`

### Paso 3: Tomar capturas de pantalla
1. **Pantalla de inicio de sesión**
   - Antes de iniciar sesión, captura la pantalla de login
   - Power + Volumen Abajo

2. **Pantalla principal / Dashboard**
   - Después de iniciar sesión
   - Captura la vista principal con los equipos/eventos

3. **Vista de equipo**
   - Entra a un equipo
   - Captura la lista de miembros

4. **Vista de evento**
   - Abre un evento específico
   - Captura los detalles

5. **Calendario / Programación**
   - Vista del calendario con eventos
   - Captura la vista mensual o lista

6. **Perfil de usuario**
   - Abre el perfil
   - Captura la configuración

### Paso 4: Transferir capturas
1. Conecta tu teléfono a la computadora
2. Copia las capturas desde `DCIM/Screenshots/`
3. Guárdalas en: `church-organizer/store-assets/play-store/screenshots/`

---

## 💻 Método 2: Usar Android Studio Emulator

### Paso 1: Instalar Android Studio
1. Descarga: https://developer.android.com/studio
2. Instala Android Studio
3. Abre AVD Manager (Android Virtual Device)

### Paso 2: Crear un dispositivo virtual
1. En AVD Manager, crea un nuevo dispositivo
2. Selecciona: Pixel 6 o Pixel 7 (recomendado para capturas)
3. API Level: 33 o superior
4. Inicia el emulador

### Paso 3: Instalar la app en el emulador
```bash
# Descarga el APK primero, luego:
adb install ruta/al/archivo.apk

# O simplemente arrastra el APK al emulador
```

### Paso 4: Tomar capturas
1. La app se abrirá en el emulador
2. Usa el botón de cámara del emulador (barra lateral derecha)
3. Las capturas se guardan automáticamente
4. Ubicación: `~/Library/Android/sdk/emulator/screenshots/` (Mac)

---

## 📐 Requisitos de las capturas para Google Play

### Dimensiones requeridas:
- **Mínimo**: 320px en el lado más corto
- **Máximo**: 3840px en el lado más largo
- **Recomendado**: 1080px de ancho/alto como mínimo
- **Formato**: PNG o JPEG
- **Peso**: Máximo 8 MB por imagen
- **Relación de aspecto**: 16:9 o 9:16
- **Cantidad**: Mínimo 2, recomendado 4-8

### Orientación:
- Vertical (portrait): 9:16 - Ejemplo: 1080x1920, 1440x2560
- Horizontal (landscape): 16:9 - Ejemplo: 1920x1080

---

## ✅ Capturas necesarias (4-8 recomendadas):

1. **Login screen** - Pantalla de inicio de sesión
2. **Home/Dashboard** - Vista principal después de login
3. **Teams list** - Lista de equipos
4. **Team detail** - Vista de un equipo con miembros
5. **Event detail** - Vista de un evento específico
6. **Calendar/Schedule** - Vista de calendario con eventos
7. **Profile** - Perfil del usuario
8. **Notifications** (opcional) - Vista de notificaciones

---

## 🚫 NO hacer:

- ❌ No uses mockups diseñados
- ❌ No uses imágenes generadas por IA
- ❌ No uses capturas de otras apps
- ❌ No edites las capturas para añadir elementos falsos
- ❌ No muestres datos personales reales (usa la cuenta de prueba)

---

## ✅ SÍ hacer:

- ✅ Capturas reales de la app funcionando
- ✅ Usa la cuenta de prueba creada
- ✅ Muestra contenido real pero de prueba
- ✅ Asegúrate de que los textos sean legibles
- ✅ Captura con buena resolución (1080p mínimo)
- ✅ Muestra diferentes pantallas de la app

---

## 📝 Una vez tengas las capturas:

1. Colócalas en: `store-assets/play-store/screenshots/`
2. Nómbralas: `screenshot-01.png`, `screenshot-02.png`, etc.
3. Verifica que cumplan los requisitos de tamaño
4. Súbelas a Google Play Console

---

¿Tienes Android Studio instalado o prefieres usar tu teléfono Android?
