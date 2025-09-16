import config from '../config.json' with { type: 'json' };
import { initializeApp } from 'firebase/app';
import {  getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { collection, addDoc } from 'firebase/firestore';
import { query, where, getDocs } from 'firebase/firestore';

export const app = initializeApp(config);
export const auth = getAuth(app);
export { GoogleAuthProvider, signInWithPopup };
export { collection, addDoc };
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export { query, where, getDocs };