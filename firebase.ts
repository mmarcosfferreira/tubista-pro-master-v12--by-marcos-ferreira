import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBcqPs37hEKwMZQR6kH_dk1PbOOd2vl9wQ",
  authDomain: "user-7ecc9.firebaseapp.com",
  databaseURL: "https://user-7ecc9-default-rtdb.firebaseio.com",
  projectId: "user-7ecc9",
  storageBucket: "user-7ecc9.appspot.com",
  messagingSenderId: "572715031884",
  appId: "1:572715031884:web:e3246750a9f9e6fa2a43e9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const db = getDatabase(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);
