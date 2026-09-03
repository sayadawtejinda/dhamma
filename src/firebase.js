import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Same Firebase project used by TutoringApp / SmartStudy / AbhidhammaApp /
// Dhammaschool, so student links + Firestore data all live in one place.
const firebaseConfig = {
  apiKey: "AIzaSyCFwHPLW6VnQqgM-ZrisQZZaBLVrm88e9M",
  authDomain: "myanmardhammaclass.firebaseapp.com",
  projectId: "myanmardhammaclass",
  storageBucket: "myanmardhammaclass.firebasestorage.app",
  messagingSenderId: "779222889065",
  appId: "1:779222889065:web:8afbe9348c3314bef3a8f8",
  measurementId: "G-TT9ZJTSMJJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const MYANMAR_READER_APP_ID = 'myanmar-reader-app';
