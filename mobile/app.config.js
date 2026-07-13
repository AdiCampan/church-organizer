export default {
    "expo": {
        "name": process.env.EXPO_PUBLIC_APP_NAME || "Church Teams",
        "slug": process.env.EXPO_PUBLIC_APP_SLUG || "church-teams",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/adaptive-icon.png",
        "userInterfaceStyle": "light",
        "newArchEnabled": false,
        "splash": {
            "image": "./assets/splash-icon.png",
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
        },
        "ios": {
            "bundleIdentifier": process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || "com.cds.churchteams",
            "supportsTablet": true,
            "infoPlist": {
                "UIBackgroundModes": [
                    "remote-notification"
                ]
            }
        },
        "android": {
            "adaptiveIcon": {
                "foregroundImage": "./assets/adaptive-icon.png",
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
            "favicon": "./assets/favicon.png"
        },
        "extra": {
            "eas": {
                "projectId": process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "4e97cd73-f633-4e29-9d97-a2972277401c"
            }
        },
        "owner": "adi_es",
        "plugins": [
            "@react-native-community/datetimepicker"
        ]
    }
}
