// js/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "./firebase.js"; // Reaproveita sua config existente

const auth = getAuth();

// Função para criar conta (Cliente ou Lojista)
export async function registerUser(email, password, userData) {
  try {
    // 1. Cria o usuário no sistema de Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Salva os dados detalhados (CPF, Endereço, etc) no Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      name: userData.name,
      cpf: userData.cpf,
      phone: userData.phone,
      address: userData.address,
      role: userData.role || "customer", // 'customer' ou 'owner'
      createdAt: Date.now()
    });

    return user;
  } catch (error) {
    console.error("Erro no registro:", error);
    throw error;
  }
}

// Função de Login
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
}

// Verificar se está logado e redirecionar
export function checkLoginStatus(isProtected = false) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Se estiver na tela de login, manda pra home
      if (window.location.pathname.includes("login.html") || window.location.pathname.includes("signup.html")) {
        // Verifica se é dono ou cliente pra saber pra onde mandar
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().role === 'owner') {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "index.html";
        }
      }
    } else {
      // Se não estiver logado e a página for protegida, manda pro login
      if (isProtected) {
        window.location.href = "login.html";
      }
    }
  });
}

export function logout() {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
}