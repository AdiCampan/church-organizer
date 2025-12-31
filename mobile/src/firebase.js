import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC6pZYxoN437Ns3Smkk9TRCnWHeWKJsu3A",
    authDomain: "church-teams.firebaseapp.com",
    databaseURL: "https://church-teams.firebaseio.com",
    projectId: "church-teams",
    storageBucket: "church-teams.firebasestorage.app",
    messagingSenderId: "973766657344",
    appId: "1:973766657344:web:cbec3b33f3b2cf5c7ca6a5"
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
