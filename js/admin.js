// js/admin.js
import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection, addDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const loginBox = document.getElementById("loginBox");
const adminArea = document.getElementById("adminArea");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");

const loginForm = document.getElementById("loginForm");
const restForm = document.getElementById("restForm");
const itemForm = document.getElementById("itemForm");

const restList = document.getElementById("restList");
const itemList = document.getElementById("itemList");
const itemRest = document.getElementById("itemRest");

async function refreshRestaurants(){
  const snap = await getDocs(collection(db,"restaurants"));
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}));

  itemRest.innerHTML = `<option value="">Selecione restaurante</option>`;
  list.forEach(r=>{
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name ?? r.id;
    itemRest.appendChild(opt);
  });

  restList.innerHTML = list.length
    ? ("<b>Restaurantes:</b><br/>" + list.map(r=>`• ${r.name}`).join("<br/>"))
    : "Nenhum restaurante cadastrado.";
}

async function refreshItems(){
  const snap = await getDocs(collection(db,"items"));
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}));
  itemList.innerHTML = list.length
    ? ("<b>Itens:</b><br/>" + list.map(i=>`• ${i.name} (R$ ${Number(i.price||0).toFixed(2)})`).join("<br/>"))
    : "Nenhum item cadastrado.";
}

loginForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  loginMsg.textContent = "Entrando...";
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();

  try{
    await signInWithEmailAndPassword(auth, email, pass);
    loginMsg.textContent = "";
  }catch(err){
    loginMsg.textContent = "Falha no login. Verifique email e senha.";
  }
});

logoutBtn.addEventListener("click", ()=> signOut(auth));

restForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = document.getElementById("rName").value.trim();
  const description = document.getElementById("rDesc").value.trim();

  await addDoc(collection(db,"restaurants"), { name, description });
  restForm.reset();
  await refreshRestaurants();
});

itemForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const restaurantId = itemRest.value;
  const name = document.getElementById("iName").value.trim();
  const price = Number(document.getElementById("iPrice").value);

  await addDoc(collection(db,"items"), { restaurantId, name, price });
  itemForm.reset();
  await refreshItems();
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    loginBox.classList.add("hidden");
    adminArea.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    await refreshRestaurants();
    await refreshItems();
  }else{
    loginBox.classList.remove("hidden");
    adminArea.classList.add("hidden");
    logoutBtn.classList.add("hidden");
  }
});
