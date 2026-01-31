// js/admin-dashboard.js
import { db } from "./firebase.js";
import { logout, checkLoginStatus } from "./auth.js";
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth();
const elRestName = document.getElementById("restName");
const elOrders = document.getElementById("ordersList");
const elMenuList = document.getElementById("menuList");

// Form products
const inpName = document.getElementById("prodName");
const inpDesc = document.getElementById("prodDesc");
const inpPrice = document.getElementById("prodPrice");
const btnAdd = document.getElementById("btnAddProd");

let myRestaurantId = null;

// 1. Verifica login
checkLoginStatus(true); // true = manda pro login se não tiver logado

document.getElementById("btnLogout").onclick = logout;

// 2. Inicializa Dashboard
auth.onAuthStateChanged(async (user) => {
  if (user) {
    await loadMyRestaurant(user.uid);
  }
});

async function loadMyRestaurant(uid) {
  // Busca restaurante onde o dono é o usuário logado
  const q = query(collection(db, "restaurants"), where("ownerId", "==", uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    elRestName.textContent = "Você ainda não tem um restaurante.";
    // Aqui poderiamos colocar um botão "Criar Restaurante"
    return;
  }

  const restData = snap.docs[0];
  myRestaurantId = restData.id;
  elRestName.textContent = restData.data().name;

  // Começa a escutar pedidos e produtos
  listenOrders();
  loadMenu();
}

// --- LÓGICA DE PEDIDOS ---
function listenOrders() {
  const q = query(collection(db, "orders"), where("restaurantId", "==", myRestaurantId));
  
  // onSnapshot = Tempo real! Se cair pedido, aparece na hora.
  onSnapshot(q, (snap) => {
    elOrders.innerHTML = "";
    snap.forEach(d => {
      const order = d.data();
      const div = document.createElement("div");
      div.className = "orderCard";
      
      let itemsHtml = order.items.map(i => `<li>${i.qty}x ${i.name}</li>`).join("");

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between">
            <strong>Pedido #${d.id.slice(0,5)}</strong>
            <span class="badge">${order.status}</span>
        </div>
        <ul style="margin:10px 0; padding-left:20px; color:var(--muted)">${itemsHtml}</ul>
        <div style="display:flex; gap:10px">
            <button class="btn" onclick="updateStatus('${d.id}', 'Preparando')">Preparando</button>
            <button class="btn" onclick="updateStatus('${d.id}', 'Saiu p/ Entrega')">Entregar</button>
        </div>
      `;
      elOrders.appendChild(div);
    });
  });
}

window.updateStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status: status });
};

// --- LÓGICA DE CARDÁPIO ---
async function loadMenu() {
    // Carrega produtos da subcoleção ou coleção raiz filtrada
    // Vamos usar coleção raiz "products" filtrada pelo restaurantId para facilitar
    const q = query(collection(db, "products"), where("restaurantId", "==", myRestaurantId));
    
    onSnapshot(q, (snap) => {
        elMenuList.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const div = document.createElement("div");
            div.className = "card";
            div.innerHTML = `
                <div class="cardTitle">${p.name}</div>
                <div class="cardSub">R$ ${p.price}</div>
            `;
            elMenuList.appendChild(div);
        });
    });
}

btnAdd.onclick = async () => {
    if(!inpName.value || !inpPrice.value) return alert("Preencha nome e preço");
    
    btnAdd.disabled = true;
    await addDoc(collection(db, "products"), {
        restaurantId: myRestaurantId,
        name: inpName.value,
        description: inpDesc.value,
        price: parseFloat(inpPrice.value)
    });
    
    inpName.value = ""; inpDesc.value = ""; inpPrice.value = "";
    btnAdd.disabled = false;
    alert("Produto salvo!");
};