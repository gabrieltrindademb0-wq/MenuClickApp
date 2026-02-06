// js/menu.js
import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const restId = params.get("r");

const elRestName = document.getElementById("restName");
<<<<<<< HEAD
const elRestInfo = document.getElementById("restInfo");

const elList = document.getElementById("productList");
const elEmpty = document.getElementById("productsEmpty");

const elChips = document.getElementById("catChips");
const inpSearch = document.getElementById("productSearch");

const overlay = document.getElementById("overlay");
const cartSheet = document.getElementById("cartSheet");
const productSheet = document.getElementById("productSheet");

const cartBar = document.getElementById("cartBar");
const btnOpenCart = document.getElementById("openCartBtn");
const btnCloseCart = document.getElementById("closeCartBtn");
const btnContinue = document.getElementById("continueBtn");
const btnFinish = document.getElementById("finishBtn");
const elCartItems = document.getElementById("cartItems");
const elCartEmpty = document.getElementById("cartEmpty");

const elCartCount = document.getElementById("cartCount");
const elCartTotal = document.getElementById("cartTotal");
const elCartSub = document.getElementById("cartSub");
const elSubtotal = document.getElementById("subtotal");
const elFee = document.getElementById("fee");
const elTotal = document.getElementById("total");

// Product modal
const pName = document.getElementById("pName");
const pPrice = document.getElementById("pPrice");
const pDesc = document.getElementById("pDesc");
const pThumb = document.getElementById("pThumb");
const pNotes = document.getElementById("pNotes");
const notesCount = document.getElementById("notesCount");
const pMinus = document.getElementById("pMinus");
const pPlus = document.getElementById("pPlus");
const pQty = document.getElementById("pQty");
const pAddBtn = document.getElementById("pAddBtn");
const btnCloseProduct = document.getElementById("closeProductBtn");

document.getElementById("backBtn")?.addEventListener("click", ()=> history.length > 1 ? history.back() : (location.href="./index.html"));

/**
 * Mock do cardápio para MVP.
 * Você pode trocar para Firestore depois sem mexer no layout.
 */
const MOCK_MENU = [
  { id: "p1", name: "X-Burger", price: 25.00, desc: "Pão, carne, queijo e molho da casa.", cat: "Lanches" },
  { id: "p2", name: "X-Salada", price: 28.00, desc: "Completo com alface, tomate e queijo.", cat: "Lanches" },
  { id: "p3", name: "X-Bacon", price: 32.00, desc: "Bacon crocante + cheddar.", cat: "Lanches" },
  { id: "p4", name: "Batata Frita", price: 15.00, desc: "Porção média, bem sequinha.", cat: "Porções" },
  { id: "p5", name: "Onion Rings", price: 18.00, desc: "Anéis de cebola crocantes.", cat: "Porções" },
  { id: "p6", name: "Coca-Cola", price: 8.00, desc: "Lata 350ml gelada.", cat: "Bebidas" },
  { id: "p7", name: "Guaraná", price: 8.00, desc: "Lata 350ml.", cat: "Bebidas" },
  { id: "p8", name: "Água", price: 4.00, desc: "Sem gás 500ml.", cat: "Bebidas" }
];

const STORAGE_KEY = () => `mc_cart_${restId || "unknown"}`;

let activeCat = "Tudo";
let activeQuery = "";
let cart = {}; // { [id]: { item, qty, notes } }

let currentProduct = null;
let currentQty = 1;

function formatBRL(v){
  return Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function hashCode(str){
  let h=0;
  for (let i=0;i<str.length;i++) h = ((h<<5)-h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function productThumbStyle(id){
  const h = hashCode(String(id));
  const a = 30 + (h % 40);
  const b = 8 + (h % 18);
  return `linear-gradient(135deg, rgba(226,93,27,.${a}), rgba(226,93,27,.${b}))`;
}

function openOverlay(){
  overlay.classList.add("is-open");
}
function closeOverlay(){
  overlay.classList.remove("is-open");
}
function openSheet(sheet){
  openOverlay();
  sheet.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeSheet(sheet){
  sheet.classList.remove("is-open");
  const anyOpen = cartSheet.classList.contains("is-open") || productSheet.classList.contains("is-open");
  if (!anyOpen){
    closeOverlay();
    document.body.style.overflow = "";
  }
}

overlay?.addEventListener("click", ()=>{
  closeSheet(productSheet);
  closeSheet(cartSheet);
});

btnOpenCart?.addEventListener("click", ()=> openSheet(cartSheet));
btnCloseCart?.addEventListener("click", ()=> closeSheet(cartSheet));
btnContinue?.addEventListener("click", ()=> closeSheet(cartSheet));
btnCloseProduct?.addEventListener("click", ()=> closeSheet(productSheet));

function loadCart(){
  try{
    const raw = sessionStorage.getItem(STORAGE_KEY());
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") cart = parsed;
  }catch(_){}
}
function saveCart(){
  try{ sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(cart)); }catch(_){}
}

function cartCount(){
  return Object.values(cart).reduce((acc, x)=> acc + (x.qty || 0), 0);
}
function cartSubtotal(){
  return Object.values(cart).reduce((acc, x)=> acc + (x.qty || 0) * (x.item?.price || 0), 0);
}

function renderChips(){
  const cats = ["Tudo", ...Array.from(new Set(MOCK_MENU.map(p=>p.cat)))];
  elChips.innerHTML = "";
  cats.forEach(c=>{
    const b = document.createElement("button");
    b.className = "mc-chip" + (c === activeCat ? " is-active" : "");
    b.type = "button";
    b.textContent = c;
    b.addEventListener("click", ()=>{
      activeCat = c;
      renderChips();
      renderProducts();
    });
    elChips.appendChild(b);
  });
}

function filterProducts(){
  const q = (activeQuery || "").toLowerCase().trim();
  return MOCK_MENU.filter(p=>{
    const catOk = activeCat === "Tudo" ? true : p.cat === activeCat;
    const qOk = !q ? true : (p.name.toLowerCase().includes(q) || (p.desc||"").toLowerCase().includes(q));
    return catOk && qOk;
  });
}

function renderSkeletonProducts(){
  elList.innerHTML = "";
  for (let i=0;i<6;i++){
    const row = document.createElement("div");
    row.className = "mc-item";
    row.style.cursor = "default";
    row.innerHTML = `
      <div class="mc-thumb mc-skel"></div>
      <div class="mc-item-main">
        <div class="mc-skel" style="height:14px;width:60%;margin:2px 0 10px;border-radius:10px"></div>
        <div class="mc-skel" style="height:12px;width:95%;margin:0 0 6px;border-radius:10px"></div>
        <div class="mc-skel" style="height:12px;width:80%;margin:0 0 10px;border-radius:10px"></div>
        <div class="mc-row" style="margin-top:10px">
          <div class="mc-skel" style="height:14px;width:80px;border-radius:10px"></div>
          <div class="mc-skel" style="height:38px;width:110px;border-radius:999px"></div>
        </div>
      </div>
    `;
    elList.appendChild(row);
  }
=======
const elRestAvatar = document.getElementById("restAvatar");

const elMenu = document.getElementById("menuList");
const elChips = document.getElementById("catChips");
const elSearch = document.getElementById("itemSearch");
const btnClearSearch = document.getElementById("clearSearch");

const elCartBar = document.getElementById("cartBar");
const elCartCount = document.getElementById("cartCount");
const elTotal = document.getElementById("totalDisplay");
const btnOpenBag = document.getElementById("openBagBtn");

const elSheet = document.getElementById("cartSheet");
const elBagList = document.getElementById("bagList");
const elSheetTotal = document.getElementById("sheetTotal");
const btnSheetClose = document.getElementById("sheetClose");
const btnSheetCloseBg = document.getElementById("sheetCloseBg");
const btnFinish = document.getElementById("finishBtn");

// Mock Data (em produção, isso viria do Firestore)
const MOCK_MENU = [
  { id: 1, name: "X-Burger", price: 25.0, desc: "Pão, carne, queijo", cat: "Lanches" },
  { id: 2, name: "X-Salada", price: 28.0, desc: "Completo com salada", cat: "Lanches" },
  { id: 3, name: "Batata Frita", price: 15.0, desc: "Porção média", cat: "Acompanhamentos" },
  { id: 4, name: "Coca-Cola", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: 5, name: "Guaraná", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: 6, name: "Molho Especial", price: 3.0, desc: "Porção pequena", cat: "Extras" }
];

// Carrinho: { [id]: { item, qty } }
const cart = new Map();
let activeCategory = "Todos";

async function init() {
  if (!restId) {
    alert("Restaurante não identificado");
    window.location.href = "index.html";
    return;
  }
  
  // Load Restaurant Info
  try {
    const docSnap = await getDoc(doc(db, "restaurants", restId));
    if (docSnap.exists()) {
      const name = docSnap.data().name || "Restaurante";
      elRestName.textContent = name;
      if (elRestAvatar) elRestAvatar.textContent = (name.trim()[0] || "R").toUpperCase();
    }
  } catch(e) { console.log(e); }

  renderCategories();
  renderMenu();
  updateTotals();
}

function renderCategories() {
  const cats = Array.from(new Set(MOCK_MENU.map(i => i.cat))).sort();
  const all = ["Todos", ...cats];
  elChips.innerHTML = "";

  all.forEach(cat => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (cat === activeCategory ? " chip--active" : "");
    b.textContent = cat;
    b.onclick = () => {
      activeCategory = cat;
      renderCategories();
      renderMenu();
    };
    elChips.appendChild(b);
  });
}

function getFilteredMenu() {
  const q = (elSearch?.value || "").trim().toLowerCase();
  return MOCK_MENU.filter(i => {
    const matchesCat = activeCategory === "Todos" ? true : i.cat === activeCategory;
    const matchesQuery = !q ? true : (i.name + " " + i.desc).toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });
}

function renderMenu() {
  elMenu.innerHTML = "";
  const list = getFilteredMenu();

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.innerHTML = `<div class="emptyState__title">Nada por aqui</div><div class="emptyState__sub">Tente outra busca ou categoria.</div>`;
    elMenu.appendChild(empty);
    return;
  }

  list.forEach(item => {
    const row = document.createElement("div");
    row.className = "menuItem";

    const inCart = cart.get(item.id);
    const qty = inCart?.qty || 0;

    row.innerHTML = `
      <div class="menuItem__main">
        <div class="menuItem__title">${escapeHtml(item.name)}</div>
        <div class="menuItem__desc">${escapeHtml(item.desc)}</div>
        <div class="menuItem__price">${item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
        <div class="menuItem__actions">
          ${qty === 0 ? `<button class="addBtn" type="button" data-add="${item.id}">Adicionar</button>` : `
            <div class="qty">
              <button class="qty__btn" type="button" data-sub="${item.id}">−</button>
              <span class="qty__value">${qty}</span>
              <button class="qty__btn" type="button" data-add="${item.id}">+</button>
            </div>
          `}
        </div>
      </div>
      <div class="menuItem__img" aria-hidden="true">🍔</div>
    `;

    // handlers
    row.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => addToCart(item));
    });
    row.querySelectorAll("[data-sub]").forEach(btn => {
      btn.addEventListener("click", () => subFromCart(item));
    });

    elMenu.appendChild(row);
  });
}

function addToCart(item) {
  const cur = cart.get(item.id);
  cart.set(item.id, { item, qty: (cur?.qty || 0) + 1 });
  updateTotals();
  renderMenu();
}

function subFromCart(item) {
  const cur = cart.get(item.id);
  if (!cur) return;
  const next = cur.qty - 1;
  if (next <= 0) cart.delete(item.id);
  else cart.set(item.id, { item, qty: next });
  updateTotals();
  renderMenu();
}

function computeTotals() {
  let items = 0;
  let total = 0;
  cart.forEach(({ item, qty }) => {
    items += qty;
    total += item.price * qty;
  });
  return { items, total };
}

function updateTotals() {
  const { items, total } = computeTotals();
  elCartCount.textContent = String(items);
  elTotal.textContent = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  elSheetTotal.textContent = elTotal.textContent;
  btnFinish.disabled = items === 0;

  if (items === 0) {
    elCartBar.classList.add("hidden");
  } else {
    elCartBar.classList.remove("hidden");
  }

  renderBag();
}

function renderBag() {
  elBagList.innerHTML = "";
  const entries = Array.from(cart.values());
  if (entries.length === 0) {
    elBagList.innerHTML = `<div class="emptyBag">Sua sacola está vazia.</div>`;
    return;
  }

  entries.forEach(({ item, qty }) => {
    const row = document.createElement("div");
    row.className = "bagRow";
    row.innerHTML = `
      <div class="bagRow__info">
        <div class="bagRow__title">${escapeHtml(item.name)}</div>
        <div class="bagRow__sub">${qty} × ${item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
      </div>
      <div class="qty">
        <button class="qty__btn" type="button" data-sub="${item.id}">−</button>
        <span class="qty__value">${qty}</span>
        <button class="qty__btn" type="button" data-add="${item.id}">+</button>
      </div>
    `;
    row.querySelector("[data-add]").onclick = () => addToCart(item);
    row.querySelector("[data-sub]").onclick = () => subFromCart(item);
    elBagList.appendChild(row);
  });
}

function openSheet() {
  elSheet.classList.remove("hidden");
  elSheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("noScroll");
}

function closeSheet() {
  elSheet.classList.add("hidden");
  elSheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("noScroll");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
>>>>>>> 96c179ddd244000e4107e8f4d2a5e129d74ef1bc
}

function renderProducts(){
  const list = filterProducts();
  elList.innerHTML = "";

  if (!list.length){
    elEmpty.style.display = "block";
  } else {
    elEmpty.style.display = "none";
  }

  list.forEach(item=>{
    const inCart = cart[item.id]?.qty || 0;

    const row = document.createElement("div");
    row.className = "mc-item";
    row.innerHTML = `
      <div class="mc-thumb" style="background:${productThumbStyle(item.id)}"></div>
      <div class="mc-item-main">
        <p class="mc-item-title">${escapeHtml(item.name)}</p>
        <p class="mc-item-desc">${escapeHtml(item.desc || "")}</p>
        <div class="mc-item-foot">
          <div class="mc-price">${formatBRL(item.price)}</div>
          <div class="mc-actions">
            ${inCart > 0 ? `
              <div class="mc-qty" data-qty>
                <button type="button" data-minus>−</button>
                <strong>${inCart}</strong>
                <button type="button" data-plus>+</button>
              </div>
            ` : `
              <button class="mc-add" type="button" data-add>Adicionar</button>
            `}
          </div>
        </div>
      </div>
    `;

    // Abre modal ao clicar no item (mas não quando clicar nos botões)
    row.addEventListener("click", (e)=>{
      const t = e.target;
      if (t && (t.closest("[data-add]") || t.closest("[data-minus]") || t.closest("[data-plus]") || t.closest("[data-qty]"))) return;
      openProductModal(item);
    });

    row.querySelector("[data-add]")?.addEventListener("click", (e)=>{
      e.stopPropagation();
      addToCart(item, 1, "");
    });

    row.querySelector("[data-plus]")?.addEventListener("click", (e)=>{
      e.stopPropagation();
      addToCart(item, 1, cart[item.id]?.notes || "");
    });

    row.querySelector("[data-minus]")?.addEventListener("click", (e)=>{
      e.stopPropagation();
      removeOne(item.id);
    });

    elList.appendChild(row);
  });

  updateCartUI();
}

function openProductModal(item){
  currentProduct = item;
  currentQty = Math.max(1, cart[item.id]?.qty || 1);

  pName.textContent = item.name;
  pPrice.textContent = formatBRL(item.price);
  pDesc.textContent = item.desc || "";
  pThumb.style.background = productThumbStyle(item.id);

  const existingNotes = cart[item.id]?.notes || "";
  pNotes.value = existingNotes;
  notesCount.textContent = String(existingNotes.length);

  pQty.textContent = String(currentQty);
  pAddBtn.textContent = (cart[item.id]?.qty ? "Atualizar na sacola" : "Adicionar à sacola");

  openSheet(productSheet);
}

pNotes?.addEventListener("input", ()=>{
  notesCount.textContent = String((pNotes.value || "").length);
});

pMinus?.addEventListener("click", ()=>{
  currentQty = Math.max(1, (currentQty || 1) - 1);
  pQty.textContent = String(currentQty);
});
pPlus?.addEventListener("click", ()=>{
  currentQty = (currentQty || 1) + 1;
  pQty.textContent = String(currentQty);
});

pAddBtn?.addEventListener("click", ()=>{
  if (!currentProduct) return;
  const notes = (pNotes.value || "").trim();
  setQty(currentProduct, currentQty, notes);
  closeSheet(productSheet);
  openSheet(cartSheet);
});

function addToCart(item, qty, notes){
  const current = cart[item.id]?.qty || 0;
  cart[item.id] = { item, qty: current + (qty || 1), notes: notes || cart[item.id]?.notes || "" };
  saveCart();
  renderProducts(); // re-render for qty controls
}

function setQty(item, qty, notes){
  const q = Math.max(1, Number(qty || 1));
  cart[item.id] = { item, qty: q, notes: notes || "" };
  saveCart();
  renderProducts();
}

function removeOne(id){
  const cur = cart[id];
  if (!cur) return;
  const next = (cur.qty || 0) - 1;
  if (next <= 0){
    delete cart[id];
  } else {
    cart[id] = { ...cur, qty: next };
  }
  saveCart();
  renderProducts();
}

function removeAll(id){
  delete cart[id];
  saveCart();
  renderCartSheet();
  updateCartUI();
  renderProducts();
}

function renderCartSheet(){
  const items = Object.values(cart);

  elCartItems.innerHTML = "";
  if (!items.length){
    elCartEmpty.style.display = "block";
  } else {
    elCartEmpty.style.display = "none";
  }

  items.forEach(({ item, qty, notes })=>{
    const row = document.createElement("div");
    row.className = "mc-card";
    row.style.cursor = "default";
    row.style.padding = "12px";
    row.innerHTML = `
      <div class="mc-row" style="align-items:flex-start">
        <div style="min-width:0">
          <div style="font-weight:1000">${escapeHtml(item.name)}</div>
          ${notes ? `<div class="mc-muted" style="font-size:12px;margin-top:4px;white-space:pre-wrap">${escapeHtml(notes)}</div>` : `<div class="mc-muted" style="font-size:12px;margin-top:4px">Sem observações</div>`}
          <div class="mc-muted" style="font-size:12px;margin-top:6px">${formatBRL(item.price)} • unidade</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
          <div style="font-weight:1000">${formatBRL((qty||0) * item.price)}</div>
          <div class="mc-qty">
            <button type="button" data-minus>−</button>
            <strong>${qty||0}</strong>
            <button type="button" data-plus>+</button>
          </div>
          <button class="mc-close" type="button" data-remove style="padding:8px 10px">Remover</button>
        </div>
      </div>
    `;

    row.querySelector("[data-plus]")?.addEventListener("click", ()=> addToCart(item, 1, notes || ""));
    row.querySelector("[data-minus]")?.addEventListener("click", ()=> removeOne(item.id));
    row.querySelector("[data-remove]")?.addEventListener("click", ()=> removeAll(item.id));

    elCartItems.appendChild(row);
  });

  const sub = cartSubtotal();
  const fee = 0; // estética: se quiser, você pode calcular taxa aqui
  const total = sub + fee;

  elSubtotal.textContent = formatBRL(sub);
  elFee.textContent = formatBRL(fee);
  elTotal.textContent = formatBRL(total);

  const count = cartCount();
  elCartSub.textContent = count ? `${count} item(ns) • ${formatBRL(sub)}` : "—";

  btnFinish.disabled = count === 0;
  btnFinish.textContent = count ? "Finalizar pedido" : "Adicione itens para finalizar";
}

function updateCartUI(){
  const count = cartCount();
  const sub = cartSubtotal();

  elCartCount.textContent = String(count);
  elCartTotal.textContent = formatBRL(sub);

  if (count > 0){
    cartBar.style.display = "flex";
  } else {
    cartBar.style.display = "none";
  }

  renderCartSheet();
}

inpSearch?.addEventListener("input", ()=>{
  activeQuery = inpSearch.value || "";
  renderProducts();
});

btnFinish?.addEventListener("click", async ()=>{
  btnFinish.disabled = true;
  btnFinish.textContent = "Criando pedido...";

  try {
<<<<<<< HEAD
    const itemsSummary = Object.values(cart).map(x => ({
      name: x.item.name,
      qty: x.qty || 1,
      price: x.item.price,
      notes: x.notes || ""
=======
    // Summarize cart items for the Order Object
    // (Simply grouping by name for the backend display)
    const itemsSummary = Array.from(cart.values()).map(({ item, qty }) => ({
      name: item.name,
      qty,
      price: item.price
>>>>>>> 96c179ddd244000e4107e8f4d2a5e129d74ef1bc
    }));

    const orderData = {
      restaurantId: restId,
      items: itemsSummary,
      status: "Recebido",
      paymentStatus: "unpaid",
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);

    // Limpa sacola dessa loja
    cart = {};
    saveCart();

    window.location.href = `order.html?order=${docRef.id}`;
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Erro ao criar pedido");
    btnFinish.disabled = false;
    btnFinish.textContent = "Finalizar pedido";
  }
});

<<<<<<< HEAD
async function init(){
  if (!restId){
    alert("Restaurante não identificado");
    window.location.href = "index.html";
    return;
  }

  // Restaurant Info
  try{
    const docSnap = await getDoc(doc(db, "restaurants", restId));
    if (docSnap.exists()){
      const data = docSnap.data() || {};
      elRestName.textContent = data.name || "Restaurante";
    }
  }catch(e){ console.log(e); }

  // Info estética
  elRestInfo.textContent = "⭐ 4,8 • ⏱ 25–35 min • Entrega grátis";

  loadCart();
  renderChips();
  renderSkeletonProducts();
  setTimeout(()=> renderProducts(), 280);
}

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

init();
=======
// Search handlers
if (elSearch) {
  elSearch.addEventListener("input", () => {
    renderMenu();
  });
}

if (btnClearSearch) {
  btnClearSearch.onclick = () => {
    if (elSearch) elSearch.value = "";
    renderMenu();
    elSearch?.focus();
  };
}

// Bag handlers
btnOpenBag.onclick = openSheet;
btnSheetClose.onclick = closeSheet;
btnSheetCloseBg.onclick = closeSheet;

// Close on ESC
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !elSheet.classList.contains("hidden")) closeSheet();
});

init();
>>>>>>> 96c179ddd244000e4107e8f4d2a5e129d74ef1bc
