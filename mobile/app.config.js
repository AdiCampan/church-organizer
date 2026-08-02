export default {
    "expo": {
        "name": process.env.EXPO_PUBLIC_APP_NAME || "Church Teams",
        "slug": process.env.EXPO_PUBLIC_APP_SLUG || "church-teams",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": process.env.EXPO_PUBLIC_ANDROID_PACKAGE === "com.beteldej.teams" ? "./assets-beteldej/icon.png" : "./assets/icon.png",
        "userInterfaceStyle": "light",
        "newArchEnabled": false,
        "splash": {
            "image": process.env.EXPO_PUBLIC_ANDROID_PACKAGE === "com.beteldej.teams" ? "./assets-beteldej/splash-icon.png" : "./assets/splash-icon.png",
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
        },
        "ios": {
            "bundleIdentifier": process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || "com.cds.churchteams",
            "supportsTablet": true,
            "infoPlist": {
                "ITSAppUsesNonExemptEncryption": false,
                "UIBackgroundModes": [
                    "remote-notification"
                ]
            }
        },
        "android": {
            "adaptiveIcon": {
                "foregroundImage": process.env.EXPO_PUBLIC_ANDROID_PACKAGE === "com.beteldej.teams" ? "./assets-beteldej/adaptive-icon.png" : "./assets/adaptive-icon.png",
                "backgroundColor": "#ffffff"
            },
            "edgeToEdgeEnabled": true,
            "permissions": [
                "NOTIFICATIONS"
            ],
            ...(process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE ? {
                "googleServicesFile": process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE
            } : {}),
            "package": process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.cds.churchteams"
        },
        "web": {
            "favicon": process.env.EXPO_PUBLIC_ANDROID_PACKAGE === "com.beteldej.teams" ? "./assets-beteldej/favicon.png" : "./assets/favicon.png"
        },
        "extra": {
            "eas": {
                "projectId": process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "75d64b3b-31d1-4d5c-970b-533785e08e4f"
            }
        },
        "owner": process.env.EXPO_PUBLIC_EAS_OWNER || "calaespi",
        "plugins": [
            "@react-native-community/datetimepicker"
        ]
    }
}
