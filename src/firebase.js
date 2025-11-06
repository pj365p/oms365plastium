import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCkFvza_WUdtwVvnqLCzy6xV9zMIcz6t8I",
  authDomain: "oms365plastium-01.firebaseapp.com",
  projectId: "oms365plastium-01",
  storageBucket: "oms365plastium-01.firebasestorage.app",
  messagingSenderId: "249094119811",
  appId: "1:249094119811:web:5a1903c987d81bdc92d6b6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
