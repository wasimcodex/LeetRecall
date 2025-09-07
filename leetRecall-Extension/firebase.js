import config from './config.json' with { type: 'json' };
import { initializeApp } from './firebase_sdk/firebase-app.js';
import {  getAuth, GoogleAuthProvider, signInWithPopup } from './firebase_sdk/firebase-auth.js';
import { initializeFirestore } from './firebase_sdk/firebase-firestore.js';
import { collection, addDoc } from './firebase_sdk/firebase-firestore.js';
import { query, where, getDocs } from './firebase_sdk/firebase-firestore.js';

export const app = initializeApp(config);
export const auth = getAuth(app);
export { GoogleAuthProvider, signInWithPopup };
export { collection, addDoc };
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export { query, where, getDocs };