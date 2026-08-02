import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const androidAppId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
const iosAppId = process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID || androidAppId;

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: Platform.OS === "ios" ? iosAppId : androidAppId,
};

if (process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL) {
    firebaseConfig.databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error("CRITICAL ERROR: Firebase Config is missing or empty!", {
        hasApiKey: Boolean(firebaseConfig.apiKey),
        projectId: firebaseConfig.projectId || null,
        appId: firebaseConfig.appId || null,
        platform: Platform.OS,
    });
}

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export default app;
