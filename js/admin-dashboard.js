// js/admin-dashboard.js
import { db, storage } from "./firebase.js";

import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { logoutTo, checkLoginStatus } from "./auth.js";
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth();

// Elements (mantém compatibilidade)
const elRestName = document.getElementById("restName");
const elOrders = document.getElementById("ordersList");
const elMenuList = document.getElementById("menuList");


// Store profile form
const stName = document.getElementById('store_name');
const stDesc = document.getElementById('store_desc');
const stSeg = document.getElementById('store_segment');
const stCep = document.getElementById('store_cep');
const stCity = document.getElementById('store_city');
const stRua = document.getElementById('store_rua');
const stNumero = document.getElementById('store_numero');
const stBairro = document.getElementById('store_bairro');
const stCompl = document.getElementById('store_complemento');
const stCnpj = document.getElementById('store_cnpj');
const stLogo = document.getElementById('store_logo');
const stLogoPreview = document.getElementById('storeLogoPreview');
const stLogoTop = document.getElementById('storeLogoTop');

const stCats = document.getElementById('store_cats');
const btnSaveStore = document.getElementById('btnSaveStore');
const storeSaveMsg = document.getElementById('storeSaveMsg');

function previewFile(inputEl, imgEl){
  const f = inputEl?.files?.[0];
  if(!f || !imgEl) return;
  const url = URL.createObjectURL(f);
  imgEl.src = url;
  imgEl.style.display = "block";
}

stLogo?.addEventListener("change", ()=> previewFile(stLogo, stLogoPreview));
inpImg?.addEventListener("change", ()=> previewFile(inpImg, inpImgPreview));

// Form products
const inpName = document.getElementById("prodName");
const inpDesc = document.getElementById("prodDesc");
const inpPrice = document.getElementById("prodPrice");
const inpImg = document.getElementById("prodImage");
const inpImgPreview = document.getElementById("prodImagePreview");
const inpCat = document.getElementById("prodCat");
const btnAdd = document.getElementById("btnAddProd");

const btnLogout = document.getElementById("btnLogout");
if (btnLogout) btnLogout.onclick = logout;

// UI extras
const tabOrders = document.getElementById("tabOrders");
const tabMenu = document.getElementById("tabMenu");
const panelOrders = document.getElementById("panelOrders");
const panelMenu = document.getElementById("panelMenu");

const mOrders = document.getElementById("mOrders");
const mProducts = document.getElementById("mProducts");

const storeLogoImg = document.getElementById("storeLogoImg");
const storeStatus = document.getElementById("storeStatus");

// Profile fields
const storeName = document.getElementById("storeName");
const storeDesc = document.getElementById("storeDesc");
const storeSegment = document.getElementById("storeSegment");
const storeCnpj = document.getElementById("storeCnpj");
const storeCats = document.getElementById("storeCats");

const addrStreet = document.getElementById("addrStreet");
const addrNumber = document.getElementById("addrNumber");
const addrNeighborhood = document.getElementById("addrNeighborhood");
const addrComplement = document.getElementById("addrComplement");
const addrCity = document.getElementById("addrCity");
const addrCep = document.getElementById("addrCep");

const storeLogoFile = document.getElementById("storeLogoFile");
const prodPhotoFile = document.getElementById("prodPhotoFile");
const prodCategory = document.getElementById("prodCategory");

const btnSaveProfile = document.getElementById("btnSaveProfile");

let myRestaurantId = null;
let myRestaurantDoc = null;


async function uploadImage(file, path){
  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${path}/${Date.now()}_${safeName}`;
  const r = sRef(storage, fullPath);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

let myRestaurantRef = null;

// 1. Verifica login
checkLoginStatus(true); // true = manda pro login se não tiver logado

document.getElementById("btnLogout").onclick = () => logoutTo("login-lojista.html");

// 2. Inicializa Dashboard
auth.onAuthStateChanged async (user) => {
  if (user) {
    await loadMyRestaurant(user.uid);
  }
  if (panelOrders && panelMenu){
    panelOrders.classList.toggle("hidden", !isOrders);
    panelMenu.classList.toggle("hidden", isOrders);
  }
}
if (tabOrders) tabOrders.onclick = () => setTab("orders");
if (tabMenu) tabMenu.onclick = () => setTab("menu");

// 2) Inicializa
auth.onAuthStateChanged(async (user) => {
  if (user) await loadMyRestaurant(user);
});

async function loadMyRestaurant(user){
  // Busca restaurante do dono logado
  const q = query(collection(db, "restaurants"), where("ownerId", "==", user.uid));
  const snap = await getDocs(q);

  if (snap.empty){
    elRestName.textContent = "Você ainda não tem uma loja.";
    if (storeStatus) storeStatus.textContent = "Pendente";
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


  // Header
  elRestName.textContent = data.name || "Minha loja";
  if (storeStatus) storeStatus.textContent = (data.isActive ? "Ativo" : "Pendente");

  // Logo
  if (storeLogoImg){
    storeLogoImg.src = data.logoUrl || "./assets/logo-menuclick.png";
  }

  // Prefill profile
  if (storeName) storeName.value = data.name || "";
  if (storeDesc) storeDesc.value = data.description || "";
  if (storeSegment) storeSegment.value = data.segment || "restaurante";
  if (storeCnpj) storeCnpj.value = data.cnpj || "";
  if (storeCats) storeCats.value = (data.categoriesNorm || data.categories || "") || "";

  // Address
  const addr = data.address || {};
  if (addrStreet) addrStreet.value = addr.street || "";
  if (addrNumber) addrNumber.value = addr.number || "";
  if (addrNeighborhood) addrNeighborhood.value = addr.neighborhood || "";
  if (addrComplement) addrComplement.value = addr.complement || "";
  if (addrCity) addrCity.value = (addr.city || data.city || "");
  if (addrCep) addrCep.value = (addr.cep || data.cep || "");

  // Real-time
  listenOrders();
  listenMenu();
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
  onSnapshot(q, (snap) => {
    elOrders.innerHTML = "";
    let openCount = 0;

    snap.forEach(d => {
      const order = d.data() || {};
      if ((order.status || "").toLowerCase() !== "finalizado") openCount++;

      const div = document.createElement("div");
      div.className = "ad-card";
      const itemsHtml = (order.items || []).map(i => `<li>${i.qty}x ${i.name}</li>`).join("");

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
        <ul style="margin:10px 0; padding-left:18px; color:var(--muted)">${itemsHtml}</ul>
      `;
      elOrders.appendChild(div);
    });

    if (mOrders) mOrders.textContent = String(openCount);
    if (snap.empty) elOrders.innerHTML = "<div class='ad-ordersEmpty'>Nenhum pedido ainda.</div>";
  });
}

// --- PRODUTOS ---
function listenMenu(){
  const q = query(collection(db, "products"), where("restaurantId", "==", myRestaurantId));
  onSnapshot(q, (snap) => {
    elMenuList.innerHTML = "";
    let count = 0;


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
                  <div style="display:flex; gap:12px; align-items:flex-start;">
                    ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="" style="width:54px;height:54px;border-radius:12px;object-fit:cover;border:1px solid var(--border)"/>` : `<div style="width:54px;height:54px;border-radius:12px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted)">📷</div>`}
                    <div>
                    <div class="cardTitle">${escapeHtml(p.name || 'Produto')}</div>
                    <div class="cardSub">${cat ? escapeHtml(cat) + ' • ' : ''}R$ ${Number(p.price || 0).toFixed(2)}</div>
                  </div>
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

    if (mProducts) mProducts.textContent = String(count);
    if (snap.empty) elMenuList.innerHTML = "<div class='ad-muted'>Nenhum produto ainda. Adicione o primeiro acima.</div>";
  });
}

btnAdd.onclick = async () => 
  if(!inpName.value || !inpPrice.value) return alert("Preencha nome e preço");
  if(!myRestaurantId) return alert("Carregando loja...");

  btnAdd.disabled = true;
  try{
    let imageUrl = "";
    if (prodPhotoFile && prodPhotoFile.files && prodPhotoFile.files[0]){
      imageUrl = await uploadImage(prodPhotoFile.files[0], `restaurants/${myRestaurantId}/products`);
    }

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
