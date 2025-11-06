// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyCkFvza_WUdtwVnqLCzy6xV9zMIzcz6t8I",
  authDomain: "oms365plastium-01.firebaseapp.com",
  projectId: "oms365plastium-01",
  storageBucket: "oms365plastium-01.firebasestorage.app",
  messagingSenderId: "249094119811",
  appId: "1:249094119811:web:5a1903c987d81bdc92d6b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Firestore instance
export const db = getFirestore(app);
