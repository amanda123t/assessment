import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAC2SNN_YJQHJ3eI7dx5P5tSJ_OgGCxq14",
  authDomain: "process-diagnosis.firebaseapp.com",
  projectId: "process-diagnosis",
  storageBucket: "process-diagnosis.firebasestorage.app",
  messagingSenderId: "34080810528",
  appId: "1:34080810528:web:5e22beb7da8651cf5f7e45"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
