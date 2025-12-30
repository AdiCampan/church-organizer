import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDCLvO6kslY5NYdS2JzWeh5AqVWHSoAcd0",
    authDomain: "organizer-ee1d1.firebaseapp.com",
    databaseURL: "https://organizer-ee1d1-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "organizer-ee1d1",
    storageBucket: "organizer-ee1d1.firebasestorage.app",
    messagingSenderId: "439942894629",
    appId: "1:439942894629:web:b888ddc1ce5bf24d1adbcc"
};

import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export default app;
