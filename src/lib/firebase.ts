import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if there are no existing apps and config is present
let app: any;
let db: any;
let auth: any;

if (firebaseConfig.apiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase initialization error:", e);
  }
} else {
  console.warn("\n\n⚠️ Firebase config is missing. Please add .env.local with NEXT_PUBLIC_FIREBASE_API_KEY, etc. ⚠️\n\n");
}

export { app, db, auth };
