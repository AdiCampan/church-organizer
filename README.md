# Church Organizer - Multi-tenant System

A comprehensive system for managing church activities, teams, and events, featuring a Web Dashboard and a Cross-platform Mobile Application.

## 🚀 Overview

This project is designed to handle multiple instances (tenants) using a single codebase. It connects to different Firebase projects based on the environment configuration, allowing for independent church management systems.

## 📂 Project Structure

- **/dashboard**: React + Vite web application for administrators.
- **/mobile**: Expo (React Native) application for team members and members.
- **/functions**: Firebase Cloud Functions for backend logic (notifications, etc.).

## 🛠️ Multi-tenant Setup

The system uses environment files and build profiles to switch between different church configurations.

### Available Tenants

| Church | Firebase Project | Package Name | Build Profile |
|--------|-----------------|--------------|---------------|
| **EbenEzer** | church-teams | com.cds.churchteams | `ebenezer` |
| **Betel Dej** | beteldej-teams | com.beteldej.teams | `beteldej` |

### Configuration Files
- `dashboard/*.env`: Contains Firebase keys for the web.
- `mobile/*.env`: Contains Firebase keys, app names, and identifiers for the mobile app.
- `BETEL_SETUP.md`: Complete setup guide for Betel Dej tenant
- `BETEL_RESUMEN.md`: Quick reference for Betel Dej configuration

### Secret Management
For security, the following are **EXCLUDED** from the repository:
- All `.env` files (except examples).
- `mobile/firebase-secrets/` (used to store different Firebase config files locally).

**Exception**: `mobile/google-services.json` is included in git for EAS Build to work correctly.

## 📦 Build & Deployment

### Web Dashboard
1. Set the correct `.env` in the `dashboard` folder.
2. Run `npm run build` inside `dashboard`.
3. Use `firebase use <project-id>` and `firebase deploy`.

### Mobile App (EAS Build)
The mobile app uses EAS profiles to manage different identities (different package names, icons, and Firebase projects).

#### EbenEzer
```bash
cd mobile
eas build -p android --profile ebenezer
eas build -p ios --profile ebenezer
```

#### Betel Dej
```bash
cd mobile
eas build -p android --profile beteldej
eas build -p ios --profile beteldej
```

*See `BETEL_SETUP.md` for detailed Betel Dej configuration and deployment instructions.*

### Submit to Stores
```bash
# Android
eas submit -p android --profile <profile-name>

# iOS
eas submit -p ios --profile <profile-name>
```

## ✨ Key Features
- **Multi-tenant Architecture**: Single codebase supporting multiple independent church instances
- **Custom Branding**: Each tenant has unique icons, colors, and app name
- **Secure Deletion**: Automated logout mechanism when a user profile is deleted
- **Support Section**: Built-in technical support contact information
- **Notifications**: Integrated push notifications per project
- **Roles & Permissions**: Fine-grained access control for teams

## 🎨 Branding

### EbenEzer
- Colors: Default theme
- Package: com.cds.churchteams

### Betel Dej
- Colors: Deep blue (#1e40af) and gold (#f59e0b)
- Package: com.beteldej.teams
- Assets: `mobile/assets-beteldej/`

---
Developed by Adrian Campan  adicampan1974@gmail.com
