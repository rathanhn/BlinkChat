// Import the functions you need from the SDK
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBYFrSRraw8tv18kMQ6nrYDNxVMg7zmCg4",
  authDomain: "blinkchat-a16db.firebaseapp.com",
  databaseURL: "https://blinkchat-a16db-default-rtdb.firebaseio.com",
  projectId: "blinkchat-a16db",
  storageBucket: "blinkchat-a16db.firebasestorage.app",
  messagingSenderId: "548232530097",
  appId: "1:548232530097:web:d2929e09e39de469f53a90",
  measurementId: "G-92WK5ZHSWW"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
