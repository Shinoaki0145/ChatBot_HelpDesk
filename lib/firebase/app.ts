import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig : { [key: string]: string } = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "chatbot-helpdesk-b99ee.firebaseapp.com",
  projectId: "chatbot-helpdesk-b99ee",
  storageBucket: "chatbot-helpdesk-b99ee.firebasestorage.app",
  messagingSenderId: "92798658122",
  appId: "1:92798658122:web:7597ffc95778402972a8b3",
};

// export const app = initializeApp(firebaseConfig);

export const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const db = getFirestore(app);