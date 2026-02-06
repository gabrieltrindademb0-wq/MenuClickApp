// js/owner.js
// Cadastro de lojista + criação automática da loja (restaurants)

import { db } from "./firebase.js";
import { registerUser, normalizePhone } from "./auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function cleanCsv(str){
  return String(str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function createOwnerAndStore(form){
  const address = {
    rua: form.rua || "",
    numero: form.numero || "",
    bairro: form.bairro || "",
    cep: form.cep || "",
    complemento: form.complemento || "",
    cidade: form.cidade || ""
  };

  // 1) Cria conta de auth + users/{uid}
  const user = await registerUser(form.email, form.password, {
    name: form.ownerName,
    cpf: form.cpf || "",
    cnpj: form.cnpj || "",
    phone: form.ownerPhone,
    address,
    role: "owner",
    extra: {
      ownerStatus: "pending",
      approval: { status: "pending", createdAt: Date.now(), etaHours: 24 }
    }
  });

  // 2) Cria loja (restaurants)
  const payload = {
    name: form.storeName,
    description: form.storeDesc || "",
    segment: form.segment || "restaurante",
    cep: form.cep || "",
    city: form.cidade || "",
    categories: cleanCsv(form.storeCats),
    ownerId: user.uid,
    ownerPhoneNorm: normalizePhone(form.ownerPhone),
    ownerEmail: form.email,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: false,
    approvalStatus: "pending"
  };

  await addDoc(collection(db, "restaurants"), payload);
  return user;
}
