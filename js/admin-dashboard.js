// js/admin-dashboard.js
import { db, storage } from "./firebase.js";
import { logout, checkLoginStatus } from "./auth.js";
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc, limit, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const auth = getAuth();

// Elements
const elRestName = document.getElementById("restName");
const elOrders = document.getElementById("ordersList");
const elOrdersEmpty = document.getElementById("ordersEmpty");
const elMenuList = document.getElementById("menuList");
const elStatOrders = document.getElementById("statOrders");
const elStatProducts = document.getElementById("statProducts");
const elStoreStatus = document.getElementById("storeStatus");

const btnLogout = document.getElementById("btnLogout");
btnLogout && (btnLogout.onclick = logout);

// Tabs
const tabBtns = Array.from(document.querySelectorAll("[data-tab]"));
function setTab(name){
  document.getElementById("tab-orders").style.display = name === "orders" ? "" : "none";
  document.getElementById("tab-menu").style.display = name === "menu" ? "" : "none";
  tabBtns.forEach(b => b.classList.toggle("is-active", b.dataset.tab === name));
}
tabBtns.forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
setTab("orders");

// Jump buttons
document.querySelectorAll("[data-jump]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const t = btn.dataset.jump;
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// Profile inputs
const storeNameInput = document.getElementById("storeNameInput");
const storeDescInput = document.getElementById("storeDescInput");
const storeSegment = document.getElementById("storeSegment");
const storeCnpj = document.getElementById("storeCnpj");
const storeCats = document.getElementById("storeCats");
const storeLogoFile = document.getElementById("storeLogoFile");
const storeLogoImg = document.getElementById("storeLogoImg");

const addrStreet = document.getElementById("addrStreet");
const addrNumber = document.getElementById("addrNumber");
const addrDistrict = document.getElementById("addrDistrict");
const addrComplement = document.getElementById("addrComplement");
const addrCity = document.getElementById("addrCity");
const addrCep = document.getElementById("addrCep");

const btnSaveStore = document.getElementById("btnSaveStore");
const storeSaveHint = document.getElementById("storeSaveHint");

// Product inputs
const inpName = document.getElementById("prodName");
const inpDesc = document.getElementById("prodDesc");
const inpCat = document.getElementById("prodCat");
const inpPrice = document.getElementById("prodPrice");
const prodPhotoFile = document.getElementById("prodPhotoFile");
const btnAdd = document.getElementById("btnAddProd");

// State
let myRestaurantId = null;
let myRestaurantRef = null;
let myRestaurantData = null;

// 1) protect route
checkLoginStatus(true);

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  // Find restaurant by ownerId, fallback ownerEmail
  const rest = await findMyRestaurant(user);
  if (!rest) {
    elRestName.textContent = "Você ainda não tem uma loja cadastrada.";
    return;
  }

  myRestaurantId = rest.id;
  myRestaurantRef = rest.ref;
  myRestaurantData = rest.data;

  fillProfile(rest.data);
  listenOrders();
  loadMenu();
});

async function findMyRestaurant(user){
  let q = query(collection(db, "restaurants"), where("ownerId", "==", user.uid), limit(1));
  let snap = await getDocs(q);

  if (snap.empty && user.email){
    q = query(collection(db, "restaurants"), where("ownerEmail", "==", user.email.toLowerCase()), limit(1));
    snap = await getDocs(q);
    if (!snap.empty){
      // fix ownerId
      await setDoc(snap.docs[0].ref, { ownerId: user.uid }, { merge: true });
    }
  }

  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ref: d.ref, data: d.data() || {} };
}

function fillProfile(data){
  elRestName.textContent = data.name || "Minha Loja";
  elStoreStatus.textContent = (data.isActive ? "Status: Ativo" : "Status: Inativo");

  storeNameInput.value = data.name || "";
  storeDescInput.value = data.description || "";
  storeSegment.value = data.segment || "restaurante";
  storeCnpj.value = data.cnpj || "";
  storeCats.value = data.categoriesText || (Array.isArray(data.categories) ? data.categories.join(", ") : "") || "";

  // address
  const a = data.address || {};
  addrStreet.value = a.street || "";
  addrNumber.value = a.number || "";
  addrDistrict.value = a.district || "";
  addrComplement.value = a.complement || "";
  addrCity.value = a.city || data.city || "";
  addrCep.value = a.cep || data.cep || "";

  // logo
  if (data.logoUrl){
    storeLogoImg.src = data.logoUrl;
  }
}

async function uploadImage(file, path){
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

btnSaveStore?.addEventListener("click", async () => {
  if (!myRestaurantRef) return;

  btnSaveStore.disabled = true;
  storeSaveHint.textContent = "Salvando...";

  try{
    let logoUrl = myRestaurantData?.logoUrl || "";
    const file = storeLogoFile?.files?.[0];
    if (file){
      logoUrl = await uploadImage(file, `stores/${myRestaurantId}/logo_${Date.now()}.jpg`);
    }

    const payload = {
      name: storeNameInput.value.trim(),
      description: storeDescInput.value.trim(),
      segment: storeSegment.value,
      cnpj: storeCnpj.value.trim(),
      categoriesText: storeCats.value.trim(),
      logoUrl,
      address: {
        street: addrStreet.value.trim(),
        number: addrNumber.value.trim(),
        district: addrDistrict.value.trim(),
        complement: addrComplement.value.trim(),
        city: addrCity.value.trim(),
        cep: addrCep.value.trim(),
      },
      // mantém compatibilidade
      city: addrCity.value.trim(),
      cep: (addrCep.value || "").replace(/\D/g,""),
      updatedAt: Date.now()
    };

    await updateDoc(myRestaurantRef, payload);
    myRestaurantData = { ...(myRestaurantData||{}), ...payload };
    fillProfile(myRestaurantData);

    storeSaveHint.textContent = "✅ Alterações salvas!";
  }catch(e){
    console.error(e);
    storeSaveHint.textContent = "❌ Não foi possível salvar. Verifique Storage Rules e login.";
    alert("Não foi possível salvar. Se for upload, habilite Storage e regras.");
  }finally{
    btnSaveStore.disabled = false;
  }
});

// --- Orders ---
function listenOrders() {
  const q = query(collection(db, "orders"), where("restaurantId", "==", myRestaurantId));
  onSnapshot(q, (snap) => {
    elOrders.innerHTML = "";
    let count = 0;

    snap.forEach(d => {
      count++;
      const order = d.data() || {};
      const card = document.createElement("div");
      card.className = "mc-card";
      card.style.padding = "14px";

      const itemsHtml = (order.items || []).map(i => `<li>${i.qty || 1}x ${i.name || "Item"}</li>`).join("");

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <strong>Pedido #${String(d.id).slice(0,5)}</strong>
          <span class="mc-chip" style="padding:6px 10px;">${order.status || "Novo"}</span>
        </div>
        <ul style="margin:10px 0 0; padding-left:18px; color:var(--muted)">${itemsHtml || "<li>(sem itens)</li>"}</ul>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="mc-btn mc-btn--ghost" data-status="Preparando" data-id="${d.id}">Preparando</button>
          <button class="mc-btn" data-status="Saiu p/ Entrega" data-id="${d.id}">Entregar</button>
        </div>
      `;

      elOrders.appendChild(card);
    });

    elStatOrders.textContent = String(count);
    elOrdersEmpty.style.display = count === 0 ? "" : "none";

    // bind status buttons
    elOrders.querySelectorAll("button[data-id]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        await updateDoc(doc(db, "orders", btn.dataset.id), { status: btn.dataset.status });
      });
    });
  });
}

// --- Menu ---
function loadMenu() {
  const q = query(collection(db, "products"), where("restaurantId", "==", myRestaurantId));
  onSnapshot(q, (snap) => {
    elMenuList.innerHTML = "";
    let count = 0;

    snap.forEach(d => {
      count++;
      const p = d.data() || {};
      const row = document.createElement("div");
      row.className = "mc-card";
      row.style.padding = "12px";

      const img = p.photoUrl ? `<img src="${p.photoUrl}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:12px;border:1px solid var(--border)"/>` : `<div style="width:72px;height:72px;border-radius:12px;border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted)">sem foto</div>`;

      row.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center; justify-content:space-between;">
          <div style="display:flex; gap:12px; align-items:center;">
            ${img}
            <div>
              <div style="font-weight:900">${p.name || "Produto"}</div>
              <div class="mc-muted">${p.description || ""}</div>
              <div style="margin-top:6px;font-weight:900">R$ ${Number(p.price||0).toFixed(2)}</div>
            </div>
          </div>
          <button class="mc-btn mc-btn--ghost" data-remove="${d.id}">Remover</button>
        </div>
      `;

      elMenuList.appendChild(row);
    });

    elStatProducts.textContent = String(count);

    elMenuList.querySelectorAll("button[data-remove]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        if (!confirm("Remover este produto?")) return;
        await updateDoc(doc(db, "products", btn.dataset.remove), { deleted: true });
        // opcional: você pode trocar por deleteDoc, mas manter update evita regra extra
      });
    });
  });
}

btnAdd?.addEventListener("click", async () => {
  if(!inpName.value.trim() || !inpPrice.value) return alert("Preencha nome e preço");
  if (!myRestaurantId) return;

  btnAdd.disabled = true;

  try{
    let photoUrl = "";
    const file = prodPhotoFile?.files?.[0];
    if (file){
      photoUrl = await uploadImage(file, `stores/${myRestaurantId}/products/${Date.now()}_${file.name}`);
    }

    await addDoc(collection(db, "products"), {
      restaurantId: myRestaurantId,
      name: inpName.value.trim(),
      description: inpDesc.value.trim(),
      category: inpCat.value.trim(),
      price: parseFloat(inpPrice.value),
      photoUrl,
      createdAt: Date.now(),
      deleted: false
    });

    inpName.value = ""; inpDesc.value = ""; inpCat.value = ""; inpPrice.value = ""; 
    if (prodPhotoFile) prodPhotoFile.value = "";
    alert("Produto salvo!");
  }catch(e){
    console.error(e);
    alert("Não foi possível salvar o produto. Verifique Storage Rules.");
  }finally{
    btnAdd.disabled = false;
  }
});
