// js/admin-dashboard.js

import { db, storage, auth } from "./firebase.js";
import { logoutTo, checkLoginStatus } from "./auth.js";

import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
  collection, query, where, getDocs, getDoc, setDoc, addDoc, onSnapshot,
  updateDoc, doc, deleteDoc, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Protege página: se não tiver login, manda para login do lojista
checkLoginStatus(true);

// ------- Elements -------
const $ = (id) => document.getElementById(id);

const elRestName = $("restName");
const elStatus = $("storeStatus");
const elOrders = $("ordersList");
const elMenuList = $("menuList");

const tabBtns = Array.from(document.querySelectorAll(".ad-tab"));
const panelOrders = $("panelOrders");
const panelMenu = $("panelMenu");

const btnLogout = $("btnLogout");
const btnSaveProfile = $("btnSaveProfile");
const btnAddProd = $("btnAddProd");

const mOrders = $("mOrders");
const mProducts = $("mProducts");

const storeLogoTop = $("storeLogoTop");
const storeLogoImg = $("storeLogoImg");
const storeSaveMsg = $("storeSaveMsg");

// Profile fields
const storeName = $("storeName");
const storeDesc = $("storeDesc");
const storeSegment = $("storeSegment");
const storeCnpj = $("storeCnpj");
const storeCats = $("storeCats");

const addrStreet = $("addrStreet");
const addrNumber = $("addrNumber");
const addrNeighborhood = $("addrNeighborhood");
const addrComplement = $("addrComplement");
const addrCity = $("addrCity");
const addrCep = $("addrCep");

const storeLogoFile = $("storeLogoFile");

// Product fields
const prodName = $("prodName");
const prodDesc = $("prodDesc");
const prodCategory = $("prodCategory");
const prodPrice = $("prodPrice");
const prodPhotoFile = $("prodPhotoFile");
const prodImagePreview = $("prodImagePreview");

let myRestaurantId = null;
let myRestaurantRef = null;

// ------- Helpers -------
function cleanCsv(str){
  return String(str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

async function uploadImage(file, folder){
  const safe = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = `${folder}/${Date.now()}_${safe}`;
  const r = sRef(storage, fullPath);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

function moneyToNumber(v){
  const s = String(v || "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function setStatus(active){
  if (!elStatus) return;
  elStatus.textContent = active ? "✅ Status: Ativo" : "⏳ Status: Em análise";
}

function setTab(tab){
  const isOrders = tab === "orders";
  panelOrders?.classList.toggle("hidden", !isOrders);
  panelMenu?.classList.toggle("hidden", isOrders);

  tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
}

function toast(msg, ok=true){
  if (!storeSaveMsg) return;
  storeSaveMsg.textContent = msg;
  storeSaveMsg.style.color = ok ? "var(--text)" : "var(--danger, #ff5c5c)";
  setTimeout(()=>{ if(storeSaveMsg) storeSaveMsg.textContent = ""; }, 2200);
}

function previewFile(inputEl, imgEl){
  const f = inputEl?.files?.[0];
  if(!f || !imgEl) return;
  imgEl.src = URL.createObjectURL(f);
  imgEl.style.display = "block";
}

// ------- UI events -------
btnLogout?.addEventListener("click", () => logoutTo("admin/login.html"));

tabBtns.forEach(b=>{
  b.addEventListener("click", ()=> setTab(b.dataset.tab));
});

$("tabOrders")?.addEventListener("click", (e)=>{ e.preventDefault(); setTab("orders"); });
$("tabMenu")?.addEventListener("click", (e)=>{ e.preventDefault(); setTab("menu"); });

storeLogoFile?.addEventListener("change", ()=> previewFile(storeLogoFile, storeLogoImg));
prodPhotoFile?.addEventListener("change", ()=> previewFile(prodPhotoFile, prodImagePreview));

// ------- Data load -------
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  await loadMyRestaurant(user.uid, user.email);
});

async function loadMyRestaurant(uid, email){
  // Busca restaurante pelo ownerId
  let q = query(collection(db, "restaurants"), where("ownerId", "==", uid));
  let snap = await getDocs(q);

  // Fallback: por ownerEmail (caso cadastro antigo não salvou ownerId)
  if (snap.empty && email){
    q = query(collection(db, "restaurants"), where("ownerEmail", "==", email));
    snap = await getDocs(q);
  }
let data = null;

if (snap.empty){
  // Se você apagou a coleção "restaurants" no Firestore, recriamos sua loja automaticamente
  const ref = doc(db, "restaurants", uid);
  const payload = {
    ownerId: uid,
    ownerEmail: email || "",
    name: "Minha loja",
    description: "",
    segment: "restaurante",
    categories: "",
    cnpj: "",
    address: { street:"", number:"", district:"", complement:"", city:"", cep:"" },
    logoUrl: "",
    isActive: true,
    approvalStatus: "approved",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(ref, payload, { merge: true });

  myRestaurantId = uid;
  myRestaurantRef = ref;
  data = payload;

} else {
  const d = snap.docs[0];
  myRestaurantId = d.id;
  myRestaurantRef = d.ref;
  data = d.data() || {};
}

elRestName.textContent = data.name || "Minha loja";
setStatus(!!data.isActive);


  // Logo
  const logoUrl = data.logoUrl || "./assets/logo-menuclick.png";
  if (storeLogoTop) storeLogoTop.src = logoUrl;
  if (storeLogoImg){
    storeLogoImg.src = logoUrl;
    storeLogoImg.style.display = data.logoUrl ? "block" : "none";
  }

  // Fill profile
  if (storeName) storeName.value = data.name || "";
  if (storeDesc) storeDesc.value = data.description || "";
  if (storeSegment) storeSegment.value = data.segment || "restaurante";
  if (storeCnpj) storeCnpj.value = data.cnpj || "";
  if (storeCats) storeCats.value = (data.categoriesNorm || (Array.isArray(data.categories) ? data.categories.join(", ") : data.categories) || "");

  // Address
  const addr = data.address || {};
  if (addrStreet) addrStreet.value = addr.street || "";
  if (addrNumber) addrNumber.value = addr.number || "";
  if (addrNeighborhood) addrNeighborhood.value = addr.neighborhood || "";
  if (addrComplement) addrComplement.value = addr.complement || "";
  if (addrCity) addrCity.value = (addr.city || data.city || "");
  if (addrCep) addrCep.value = (addr.cep || data.cep || "");

  // Listeners
  listenOrders();
  listenProducts();
}

// ------- Save profile -------
btnSaveProfile?.addEventListener("click", async () => {
  if (!myRestaurantRef) return;

  try{
    btnSaveProfile.disabled = true;

    let logoUrl = null;
    const f = storeLogoFile?.files?.[0];
    if (f){
      logoUrl = await uploadImage(f, `restaurants/${myRestaurantId}/logo`);
    }

    const cats = cleanCsv(storeCats?.value);

    const payload = {
      name: (storeName?.value || "").trim(),
      description: (storeDesc?.value || "").trim(),
      segment: storeSegment?.value || "restaurante",
      cnpj: (storeCnpj?.value || "").trim(),
      categoriesNorm: cats.join(", "),
      categories: cats,
      address: {
        street: (addrStreet?.value || "").trim(),
        number: (addrNumber?.value || "").trim(),
        neighborhood: (addrNeighborhood?.value || "").trim(),
        complement: (addrComplement?.value || "").trim(),
        city: (addrCity?.value || "").trim(),
        cep: (addrCep?.value || "").trim()
      },
      city: (addrCity?.value || "").trim(),
      cep: (addrCep?.value || "").trim(),
      updatedAt: Date.now()
    };

    if (logoUrl){
      payload.logoUrl = logoUrl;
      if (storeLogoTop) storeLogoTop.src = logoUrl;
    }

    await updateDoc(myRestaurantRef, payload);
    toast("Salvo!");
  }catch(e){
    console.error(e);
    toast("Erro ao salvar", false);
  }finally{
    btnSaveProfile.disabled = false;
  }
});

// ------- Products -------
btnAddProd?.addEventListener("click", async () => {
  if (!myRestaurantId) return;

  const name = (prodName?.value || "").trim();
  if (!name){
    toast("Informe o nome do produto", false);
    return;
  }

  try{
    btnAddProd.disabled = true;

    let imageUrl = "";
    const f = prodPhotoFile?.files?.[0];
    if (f){
      imageUrl = await uploadImage(f, `restaurants/${myRestaurantId}/products`);
    }

    const payload = {
      restaurantId: myRestaurantId,
      name,
      description: (prodDesc?.value || "").trim(),
      category: (prodCategory?.value || "").trim(),
      price: moneyToNumber(prodPrice?.value),
      imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await addDoc(collection(db, "products"), payload);

    // clear
    if (prodName) prodName.value = "";
    if (prodDesc) prodDesc.value = "";
    if (prodCategory) prodCategory.value = "";
    if (prodPrice) prodPrice.value = "";
    if (prodPhotoFile) prodPhotoFile.value = "";
    if (prodImagePreview){
      prodImagePreview.src = "";
      prodImagePreview.style.display = "none";
    }

    toast("Produto salvo!");
  }catch(e){
    console.error(e);
    toast("Erro ao salvar produto", false);
  }finally{
    btnAddProd.disabled = false;
  }
});

function listenOrders(){
  if (!elOrders) return;
  const qy = query(collection(db, "orders"), where("restaurantId", "==", myRestaurantId));
  onSnapshot(qy, (snap)=>{
    mOrders && (mOrders.textContent = String(snap.size || 0));
    elOrders.innerHTML = "";

    if (snap.empty){
      elOrders.innerHTML = '<div class="ad-empty">Sem pedidos no momento.</div>';
      return;
    }

    snap.forEach(docu=>{
      const o = docu.data() || {};
      const card = document.createElement("div");
      card.className = "ad-order";
      const items = Array.isArray(o.items) ? o.items.map(i=>`${i.qtd || 1}x ${i.name || "Item"}`).join(", ") : "";
      card.innerHTML = `
        <div class="ad-order__top">
          <div class="ad-order__id">Pedido #${docu.id.slice(-6)}</div>
          <div class="ad-order__total">R$ ${(o.total ?? 0).toFixed ? (o.total).toFixed(2) : (o.total || "0.00")}</div>
        </div>
        <div class="ad-order__muted">${items || "Itens não informados"}</div>
        <div class="ad-order__muted">${(o.customerName || "Cliente")} • ${(o.payment || "Pagamento")} </div>
      `;

      elOrders.appendChild(card);
    });
  });
}


function listenProducts(){
  if (!elMenuList) return;
  const qy = query(collection(db, "products"), where("restaurantId", "==", myRestaurantId));
  onSnapshot(qy, (snap)=>{
    mProducts && (mProducts.textContent = String(snap.size || 0));
    elMenuList.innerHTML = "";

    if (snap.empty){
      elMenuList.innerHTML = '<div class="ad-empty">Nenhum produto cadastrado ainda.</div>';
      return;
    }

    snap.forEach(docu=>{
      const p = docu.data() || {};
      const item = document.createElement("div");
      item.className = "ad-prod";
      const img = p.imageUrl ? `<img class="ad-prod__img" src="${p.imageUrl}" alt="">` : `<div class="ad-prod__img ad-prod__img--ph">📦</div>`;
      item.innerHTML = `
        ${img}
        <div class="ad-prod__info">
          <div class="ad-prod__name">${p.name || "Produto"}</div>
          <div class="ad-prod__muted">${p.category || "Sem categoria"} • R$ ${Number(p.price||0).toFixed(2)}</div>
        </div>
        <button class="ad-btn ad-btn--ghost ad-prod__del" type="button">Remover</button>
      `;
      item.querySelector(".ad-prod__del")?.addEventListener("click", async ()=>{
        if (!confirm("Remover este produto?")) return;
        await deleteDoc(doc(db, "products", docu.id));
      });
      elMenuList.appendChild(item);
    });
  });
}
