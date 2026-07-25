# Recursos para Google Play Store - Betel Dej Teams

## ✅ Textos (Rumano)

### Nombre de la aplicación
```
Betel Dej Teams
```
(15/30 caracteres)

### Descripción breve
```
Gestionează echipele și evenimentele bisericii tale într-un singur loc.
```
(78/80 caracteres)

### Descripción completa
Ver archivo `PLAY_STORE_LISTING.md` para el texto completo (2847 caracteres)

---

## 🎨 Recursos gráficos necesarios

### 1. Icono de la aplicación ✅
- **Ubicación**: `store-assets/app-icon-512x512.png`
- **Requisitos**: 512x512 px, PNG o JPEG, máx 1 MB
- **Estado**: ✅ LISTO

### 2. Gráfico de funciones ⚠️
- **Ubicación**: `store-assets/play-store/feature-graphic.png`
- **Requisitos**: 1024x500 px, PNG o JPEG, máx 15 MB
- **Estado**: ⚠️ GENERADO en 16:9, NECESITA REDIMENSIONAR a 1024x500

**Cómo redimensionar**:
```bash
# Si tienes ImageMagick instalado:
convert store-assets/play-store/feature-graphic.png -resize 1024x500! store-assets/play-store/feature-graphic-1024x500.png

# O usa una herramienta online:
# https://www.iloveimg.com/resize-image
# https://www.img2go.com/resize-image
```

### 3. Capturas de pantalla de teléfono ❌
- **Requisitos**: 
  - Mínimo 2, máximo 8 capturas
  - Recomendado: 4-8 capturas de al menos 1080x1080 px
  - Formato: PNG o JPEG, máx 8 MB cada una
  - Relación de aspecto: 16:9 o 9:16
  - Dimensiones: entre 320px y 3840px por lado
- **Estado**: ❌ PENDIENTE DE CREAR

**Capturas recomendadas**:
1. Pantalla de inicio de sesión
2. Lista de equipos
3. Vista de un evento
4. Calendario de eventos
5. Perfil de usuario
6. Notificaciones

---

## 📱 Cómo crear las capturas de pantalla

### Opción 1: Desde el emulador de Android Studio
1. Abre Android Studio
2. Inicia el emulador
3. Instala el APK de Betel Dej Teams
4. Navega por la app y toma capturas con el botón de captura del emulador
5. Las capturas se guardan en resolución correcta automáticamente

### Opción 2: Desde un dispositivo físico
1. Instala la app en tu teléfono Android
2. Navega por las diferentes pantallas
3. Toma capturas de pantalla (Power + Volumen abajo)
4. Transfiere las imágenes a tu computadora
5. Si es necesario, redimensiona a mínimo 1080px de ancho/alto

### Opción 3: Usar el build existente con un emulador online
1. Ve a: https://appetize.io
2. Sube el .aab o descarga el APK del build
3. Navega por la app en el emulador web
4. Toma capturas de pantalla del navegador
5. Recorta y redimensiona según sea necesario

---

## 📋 Checklist de recursos

- [x] Nombre de la aplicación
- [x] Descripción breve (rumano)
- [x] Descripción completa (rumano)
- [x] Icono 512x512 px
- [ ] Gráfico de funciones 1024x500 px (redimensionar)
- [ ] Capturas de pantalla (mínimo 2, recomendado 4-8)
- [ ] Tablet 7" capturas (opcional)
- [ ] Tablet 10" capturas (opcional)

---

## 🔗 Enlaces útiles

- Build Android: https://expo.dev/accounts/calaespi/projects/church-teams/builds/4d6129dd-2fe8-465a-918c-baba667b4135
- .aab file: https://expo.dev/artifacts/eas/OK5ggIe9II0qEUP8YWlDI6Pv40e9jf2L52MkhpRVy-Y.aab
- Política de privacidad: https://beteldej-teams.web.app/privacy-policy.html
- Eliminación de cuenta: https://beteldej-teams.web.app/delete-account.html

---

## 📝 Notas

- Todas las capturas de pantalla deben mostrar contenido real (no datos de prueba vacíos)
- Asegúrate de que los textos sean legibles
- Evita mostrar información personal real en las capturas
- Las capturas deben estar en rumano si la app está en rumano
