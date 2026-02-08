// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5KeS7dONR3bnxno92d5j3jcCJbmJOv-E",
  authDomain: "menuclick-ef41d.firebaseapp.com",
  projectId: "menuclick-ef41d",
  storageBucket: "menuclick-ef41d.firebasestorage.app",
  messagingSenderId: "114286632819",
  appId: "1:114286632819:web:96683df59632ba225d2f06",
  measurementId: "G-DHL78T1WZ0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const storage = getStorage(app);
