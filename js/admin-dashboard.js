// js/admin-dashboard.js
import { db, storage } from "./firebase.js";
import { logout, checkLoginStatus } from "./auth.js";
import {
  collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const auth = getAuth();

// Elements (mantém compatibilidade)
const elRestName = document.getElementById("restName");
const elOrders = document.getElementById("ordersList");
const elMenuList = document.getElementById("menuList");
const inpName = document.getElementById("prodName");
const inpDesc = document.getElementById("prodDesc");
const inpPrice = document.getElementById("prodPrice");
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

// 1) Protege rota
checkLoginStatus(true);

// Tabs
function setTab(which){
  const isOrders = which === "orders";
  if (tabOrders && tabMenu){
    tabOrders.classList.toggle("active", isOrders);
    tabMenu.classList.toggle("active", !isOrders);
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

  myRestaurantDoc = snap.docs[0];
  myRestaurantId = myRestaurantDoc.id;
  const data = myRestaurantDoc.data() || {};

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

async function uploadImage(file, path){
  const safeName = (file.name || "img").replace(/[^a-z0-9._-]/gi, "_");
  const fileRef = ref(storage, `${path}/${Date.now()}_${safeName}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}

if (btnSaveProfile){
  btnSaveProfile.onclick = async () => {
    if (!myRestaurantId) return;

    btnSaveProfile.disabled = true;
    try{
      let logoUrl = null;

      if (storeLogoFile && storeLogoFile.files && storeLogoFile.files[0]){
        logoUrl = await uploadImage(storeLogoFile.files[0], `restaurants/${myRestaurantId}/logo`);
      }

      const payload = {
        name: storeName?.value?.trim() || "",
        description: storeDesc?.value?.trim() || "",
        segment: storeSegment?.value || "restaurante",
        cnpj: storeCnpj?.value?.trim() || "",
        categoriesNorm: storeCats?.value?.trim() || "",
        address: {
          street: addrStreet?.value?.trim() || "",
          number: addrNumber?.value?.trim() || "",
          neighborhood: addrNeighborhood?.value?.trim() || "",
          complement: addrComplement?.value?.trim() || "",
          city: addrCity?.value?.trim() || "",
          cep: addrCep?.value?.trim() || ""
        }
      };

      if (logoUrl) payload.logoUrl = logoUrl;

      await updateDoc(doc(db, "restaurants", myRestaurantId), payload);

      if (logoUrl && storeLogoImg) storeLogoImg.src = logoUrl;
      if (payload.name) elRestName.textContent = payload.name;

      alert("Perfil salvo!");
    } catch(e){
      console.error(e);
      alert("Erro ao salvar perfil. Veja o console.");
    } finally{
      btnSaveProfile.disabled = false;
    }
  };
}

// --- PEDIDOS ---
function listenOrders(){
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
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center">
          <strong>Pedido #${d.id.slice(0,5)}</strong>
          <span class="badge">${order.status || "novo"}</span>
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

    snap.forEach(d => {
      const p = d.data() || {};
      count++;

      const card = document.createElement("div");
      card.className = "ad-prodCard";

      const img = document.createElement("img");
      img.className = "ad-prodImg";
      img.alt = p.name || "Produto";
      img.src = p.imageUrl || "./assets/logo-menuclick.png";

      const meta = document.createElement("div");
      meta.className = "ad-prodMeta";
      meta.innerHTML = `
        <div class="ad-prodName">${p.name || "Produto"}</div>
        <div class="ad-prodPrice">R$ ${(p.price ?? 0).toFixed ? p.price.toFixed(2) : p.price}</div>
      `;

      card.appendChild(img);
      card.appendChild(meta);
      elMenuList.appendChild(card);
    });

    if (mProducts) mProducts.textContent = String(count);
    if (snap.empty) elMenuList.innerHTML = "<div class='ad-muted'>Nenhum produto ainda. Adicione o primeiro acima.</div>";
  });
}

btnAdd.onclick = async () => {
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
      name: inpName.value.trim(),
      description: inpDesc.value.trim(),
      category: prodCategory?.value?.trim() || "",
      price: parseFloat(inpPrice.value),
      imageUrl
    });

    inpName.value = ""; inpDesc.value = ""; inpPrice.value = "";
    if (prodCategory) prodCategory.value = "";
    if (prodPhotoFile) prodPhotoFile.value = "";
    alert("Produto salvo!");
  } catch(e){
    console.error(e);
    alert("Erro ao salvar produto. Veja o console.");
  } finally{
    btnAdd.disabled = false;
  }
};
