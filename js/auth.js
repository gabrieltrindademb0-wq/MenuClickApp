// js/auth.js – autenticação MenuClick (cliente + lojista)
// - Login por e-mail OU WhatsApp (busca o e-mail no Firestore pelo telefone)
// - Reset de senha
// - Login com Google (clientes)

import { getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc, setDoc, getDoc,
  collection, query, where, getDocs, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase.js";

const auth = getAuth();

export function normalizePhone(v){
  const digits = String(v || "").replace(/\D/g, "");
  // remove 55 do início se o usuário digitar com DDI
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(2);
  return digits;
}

export function isLikelyEmail(v){
  return String(v || "").includes("@");
}

export function isValidEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

export function isValidPhoneBR(v){
  const d = normalizePhone(v);
  // 10 ou 11 dígitos (DDD + número) – sem DDI
  return d.length === 10 || d.length === 11;
}

async function resolveEmailFromIdentifier(identifier){
  const id = String(identifier || "").trim();
  if (!id) throw new Error("IDENTIFIER_EMPTY");

  if (isLikelyEmail(id)) return id;

  const phoneNorm = normalizePhone(id);
  if (!phoneNorm) throw new Error("PHONE_EMPTY");

  // Busca users pelo telefone
  const q = query(collection(db, "users"), where("phoneNorm", "==", phoneNorm), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("PHONE_NOT_FOUND");

  const userDoc = snap.docs[0].data();
  if (!userDoc?.email) throw new Error("EMAIL_NOT_FOUND");
  return userDoc.email;
}

// Função para criar conta (Cliente ou Lojista)
export async function registerUser(email, password, userData) {
  try {
    const safeEmail = String(email || "").trim().toLowerCase();

    // 1) Cria o usuário no Auth
    const userCredential = await createUserWithEmailAndPassword(auth, safeEmail, password);
    const user = userCredential.user;

    // 2) Salva dados no Firestore
    const phoneNorm = normalizePhone(userData.phone);

    await setDoc(doc(db, "users", user.uid), {
      email: safeEmail,
      name: userData.name || "",
      cpf: userData.cpf || "",
      cnpj: userData.cnpj || "",
      phone: userData.phone || "",
      phoneNorm,
      address: userData.address || {},
      role: userData.role || "customer", // customer | owner
      createdAt: Date.now(),
      ...(userData.extra || {})
    });

    return user;
  } catch (error) {
    console.error("Erro no registro:", error);
    throw error;
  }
}

// Login (aceita e-mail OU WhatsApp)
export async function loginUser(identifier, password) {
  try {
    const email = await resolveEmailFromIdentifier(identifier);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
}

// Reset de senha (por e-mail)
export async function resetPassword(email){
  const safeEmail = String(email || "").trim().toLowerCase();
  if (!isValidEmail(safeEmail)) throw new Error("INVALID_EMAIL");
  await sendPasswordResetEmail(auth, safeEmail);
}

// Login com Google (cliente)
export async function loginWithGoogleCustomer(){
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  const user = res.user;

  // Garante doc do usuário
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()){
    await setDoc(ref, {
      email: user.email || "",
      name: user.displayName || "",
      cpf: "",
      cnpj: "",
      phone: "",
      phoneNorm: "",
      address: {},
      role: "customer",
      createdAt: Date.now()
    });
  }
  return user;
}

// Verificar se está logado e redirecionar
export function checkLoginStatus(isProtected = false) {
  onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname || "";

    if (user) {
      // Carrega dados do usuário
      let role = "customer";
      let ownerStatus = "approved";

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : {};
        role = data.role || "customer";

        ownerStatus = data.ownerStatus || (role === "owner" ? "approved" : "approved");
      } catch (e) {
        console.error(e);
      }

      // Bloqueia acesso ao painel se ainda estiver em análise
      if ((path.includes("admin-dashboard") || path.includes("admin.html")) && role === "owner" && ownerStatus !== "approved") {
        window.location.href = "analise.html";
        return;
      }

      // Se estiver em telas de login/cadastro, redireciona para a área correta
      const isAuthPage = (
        path.includes("login-cliente.html") ||
        path.includes("login-lojista.html") ||
        path.includes("signup.html") ||
        path.includes("lojista-signup.html") ||
        path.includes("analise.html") ||
        path.endsWith("/login")
      );

      if (isAuthPage) {
        if (role === "owner") {
          window.location.href = ownerStatus === "approved" ? "admin-dashboard.html" : "analise.html";
        } else {
          
          window.location.href = "explore.html";
        }
      }

    } else {
      if (isProtected) {
        const isOwnerArea = path.includes("admin-dashboard") || path.includes("admin.html");
        window.location.href = isOwnerArea ? "login-lojista.html" : "login-cliente.html";
      }
    }
  });
}

export function logoutTo(page = "login-cliente.html") {
  signOut(auth).then(() => window.location.href = page);
}

export function logout() {
  return logoutTo("login-cliente.html");
}
