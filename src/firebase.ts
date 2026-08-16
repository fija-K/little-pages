import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB0rBRHNFfYJ6QdODFG83gRFLtZ0VHvAv0",
  authDomain: "skulk-45c23.firebaseapp.com",
  projectId: "skulk-45c23",
  storageBucket: "skulk-45c23.firebasestorage.app",
  messagingSenderId: "57978390139",
  appId: "1:57978390139:web:bea7167e8cecb4f3aa44de",
  databaseURL: "https://skulk-45c23-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy };
export type { User };
