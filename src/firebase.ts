import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDgbPNyT2C9dZyHkMuKOupWlj5zkP-Qba8",
  authDomain: "little-page-3ac9d.firebaseapp.com",
  databaseURL: "https://little-page-3ac9d-default-rtdb.firebaseio.com",
  projectId: "little-page-3ac9d",
  storageBucket: "little-page-3ac9d.firebasestorage.app",
  messagingSenderId: "951965445628",
  appId: "1:951965445628:web:6e63bee75f94e9be20d679",
  measurementId: "G-1R4R4K9NL8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy };
export type { User };
