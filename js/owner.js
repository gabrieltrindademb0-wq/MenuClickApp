// js/owner.js
// Cadastro de lojista + criação automática da loja (restaurants)

import { db } from "./firebase.js";
import { registerUser } from "./auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function cleanCsv(str){
  return String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function createOwnerAndStore(form){
  // 1) Cria conta de auth + users/{uid}
  const user = await registerUser(form.email, form.password, {
    name: form.ownerName,
    cpf: form.cpf || "",
    phone: form.ownerPhone,
    address: "",
    role: "owner"
  });

  // 2) Cria loja (restaurants)
  const payload = {
    name: form.storeName,
    description: form.storeDesc || "",
    segment: form.segment || "restaurante",
    cep: form.storeCep || "",
    city: form.storeCity || "",
    categories: cleanCsv(form.storeCats),
    ownerId: user.uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // Campos extras úteis
    isActive: true
  };

  await addDoc(collection(db, "restaurants"), payload);
  return user;
}
