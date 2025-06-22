import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config từ Console (từ screenshot)
const firebaseConfig = {
  apiKey: "AIzaSyDFpbqX4MAH2jQBsK4hqnRDsRIRM7eQ6zI",
  authDomain: "databasethuchi.firebaseapp.com",
  projectId: "databasethuchi",
  storageBucket: "databasethuchi.firebasestorage.app",
  messagingSenderId: "379750275530",
  appId: "1:379750275530:web:debf8382ee8a7736129733",
  measurementId: "G-S2FCVCDWKD"
};

// Initialize Firebase chỉ một lần
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app; 