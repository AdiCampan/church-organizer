# Church Organizer - Multi-tenant System

A comprehensive system for managing church activities, teams, and events, featuring a Web Dashboard and a Cross-platform Mobile Application.

## 🚀 Overview

This project is designed to handle multiple instances (tenants) using a single codebase. It connects to different Firebase projects based on the environment configuration, allowing for independent church management systems (e.g., EbenEzer and Betel Dej).

## 📂 Project Structure

- **/dashboard**: React + Vite web application for administrators.
- **/mobile**: Expo (React Native) application for team members and members.
- **/functions**: Firebase Cloud Functions for backend logic (notifications, etc.).

## 🛠️ Multi-tenant Setup

The system uses environment files and build profiles to switch between different church configurations.

### Configuration Files
- `dashboard/*.env`: Contains Firebase keys for the web.
- `mobile/*.env`: Contains Firebase keys, app names, and identifiers for the mobile app.

### Secret Management
For security, the following are **EXCLUDED** from the repository:
- All `.env` files.
- `mobile/google-services.json`
- `mobile/firebase-secrets/` (used to store different `google-services.json` files locally).

## 📦 Build & Deployment

### Web Dashboard
1. Set the correct `.env` in the `dashboard` folder.
2. Run `npm run build` inside `dashboard`.
3. Use `firebase use <project-id>` and `firebase deploy`.

### Mobile App (EAS Build)
The mobile app uses EAS profiles to manage different identities (different package names and icons).

- **EbenEzer**: `eas build -p android --profile ebenezer`
- **Betel Dej**: `eas build -p android --profile beteldej`

*Note: Ensure the correct `google-services.json` is present in the `mobile` folder before building.*

## ✨ Key Features
- **Secure Deletion**: Automated logout mechanism when a user profile is deleted.
- **Support Section**: Built-in technical support contact information.
- **Notifications**: Integrated push notifications per project.
- **Roles & Permissions**: Fine-grained access control for teams.

---
Developed by Nicolas.
