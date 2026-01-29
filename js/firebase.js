// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5KeS7dONR3bnxno92d5j3jcCJbmJOv-E",
  authDomain: "menuclick-ef41d.firebaseapp.com",
  projectId: "menuclick-ef41d",
  storageBucket: "menuclick-ef41d.firebasestorage.app",
  messagingSenderId: "114286632819",
  appId: "1:114286632819:web:35e85eb221152f725d2f06"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

