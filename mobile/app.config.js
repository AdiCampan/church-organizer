export default {
    "expo": {
        "name": process.env.EXPO_PUBLIC_APP_NAME || "Church Teams",
        "slug": "mobile",
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
            "googleServicesFile": "./google-services.json",
            "package": process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.adi_es.mobile"
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
