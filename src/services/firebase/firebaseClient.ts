import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseEnvConfig extends FirebaseOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function readEnvValue(key: keyof ImportMetaEnv): string {
  return String(import.meta.env[key] ?? '').trim();
}

export function getFirebaseConfigFromEnv(): FirebaseEnvConfig {
  return {
    apiKey: readEnvValue('VITE_FIREBASE_API_KEY'),
    authDomain: readEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnvValue('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnvValue('VITE_FIREBASE_APP_ID'),
    measurementId: readEnvValue('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfigFromEnv();
  const requiredValues = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.storageBucket,
    config.messagingSenderId,
    config.appId,
  ];

  return requiredValues.every((value) => value.length > 0);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(getFirebaseConfigFromEnv());
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}
