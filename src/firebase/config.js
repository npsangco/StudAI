// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDD0vJgqkml0GJrkzqxGe_R7hj8_qKyhY",
  authDomain: "studai-quiz-battles.firebaseapp.com",
  databaseURL: "https://studai-quiz-battles-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studai-quiz-battles",
  storageBucket: "studai-quiz-battles.firebasestorage.app",
  messagingSenderId: "958696489635",
  appId: "1:958696489635:web:556060d319bf6c318e7516"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const realtimeDb = getDatabase(app);

// Optional: Add connection state monitoring
export const isFirebaseConnected = () => {
  return realtimeDb && realtimeDb.app;
};

console.log('🔥 Firebase initialized successfully!');
