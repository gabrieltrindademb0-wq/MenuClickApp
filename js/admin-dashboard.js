// js/admin-dashboard.js
import { db } from "./firebase.js";
import { logout, checkLoginStatus } from "./auth.js";
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth();
const elRestName = document.getElementById("restName");
const elOrders = document.getElementById("ordersList");
const elMenuList = document.getElementById("menuList");

// Store profile form
const stName = document.getElementById('store_name');
const stDesc = document.getElementById('store_desc');
const stSeg = document.getElementById('store_segment');
const stCep = document.getElementById('store_cep');
const stCity = document.getElementById('store_city');
const stCats = document.getElementById('store_cats');
const btnSaveStore = document.getElementById('btnSaveStore');
const storeSaveMsg = document.getElementById('storeSaveMsg');

// Form products
const inpName = document.getElementById("prodName");
const inpDesc = document.getElementById("prodDesc");
const inpPrice = document.getElementById("prodPrice");
const inpCat = document.getElementById("prodCat");
const btnAdd = document.getElementById("btnAddProd");

let myRestaurantId = null;
let myRestaurantRef = null;

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
  myRestaurantRef = restData.ref;
  const r = restData.data();
  elRestName.textContent = r.name || "Minha loja";

  // Preenche formulário do perfil
  if (stName) stName.value = r.name || "";
  if (stDesc) stDesc.value = r.description || "";
  if (stSeg) stSeg.value = (r.segment || "restaurante");
  if (stCep) stCep.value = r.cep || "";
  if (stCity) stCity.value = r.city || "";
  if (stCats) stCats.value = Array.isArray(r.categories) ? r.categories.join(", ") : (r.categories || "");

  // Começa a escutar pedidos e produtos
  listenOrders();
  loadMenu();
}

function cleanCsv(str){
  return String(str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

btnSaveStore?.addEventListener('click', async () => {
  if (!myRestaurantRef) return;
  storeSaveMsg.textContent = '';
  try {
    btnSaveStore.disabled = true;
    await updateDoc(myRestaurantRef, {
      name: stName?.value?.trim() || "",
      description: stDesc?.value?.trim() || "",
      segment: stSeg?.value || "restaurante",
      cep: stCep?.value?.trim() || "",
      city: stCity?.value?.trim() || "",
      categories: cleanCsv(stCats?.value),
      updatedAt: Date.now()
    });
    storeSaveMsg.textContent = 'Salvo!';
    setTimeout(() => storeSaveMsg.textContent = '', 2000);
  } catch (e) {
    console.error(e);
    storeSaveMsg.textContent = 'Erro ao salvar';
  } finally {
    btnSaveStore.disabled = false;
  }
});

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
            <button class="btn" onclick="updateStatus('${d.id}', 'Entregue')">Entregue</button>
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
            div.className = "card mc-productCard";
            const cat = (p.category || '').trim();
            div.innerHTML = `
                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px">
                  <div>
                    <div class="cardTitle">${escapeHtml(p.name || 'Produto')}</div>
                    <div class="cardSub">${cat ? escapeHtml(cat) + ' • ' : ''}R$ ${Number(p.price || 0).toFixed(2)}</div>
                  </div>
                  <div style="display:flex; gap:8px">
                    <button class="btn" data-act="edit">Editar</button>
                    <button class="btn" data-act="del">Remover</button>
                  </div>
                </div>
                ${p.description ? `<div style="margin-top:10px; color:var(--muted)">${escapeHtml(p.description)}</div>` : ''}
            `;

            div.querySelector('[data-act="del"]').addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!confirm('Remover este produto?')) return;
              await deleteDoc(doc(db, 'products', d.id));
            });

            div.querySelector('[data-act="edit"]').addEventListener('click', async (e) => {
              e.stopPropagation();
              const newName = prompt('Nome do produto:', p.name || '');
              if (newName === null) return;
              const newDesc = prompt('Descrição:', p.description || '');
              if (newDesc === null) return;
              const newCat = prompt('Categoria:', p.category || '');
              if (newCat === null) return;
              const newPriceStr = prompt('Preço (ex: 25.00):', String(p.price || ''));
              if (newPriceStr === null) return;
              const newPrice = parseFloat(String(newPriceStr).replace(',', '.'));
              if (Number.isNaN(newPrice)) return alert('Preço inválido.');
              await updateDoc(doc(db, 'products', d.id), {
                name: String(newName).trim(),
                description: String(newDesc).trim(),
                category: String(newCat).trim(),
                price: newPrice,
                updatedAt: Date.now()
              });
            });

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
        category: inpCat?.value || "",
        price: parseFloat(inpPrice.value),
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    
    inpName.value = ""; inpDesc.value = ""; inpPrice.value = ""; if (inpCat) inpCat.value = "";
    btnAdd.disabled = false;
    alert("Produto salvo!");
};

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}