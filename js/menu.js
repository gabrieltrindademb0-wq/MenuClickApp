// js/menu.js
import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const restId = params.get("r");

const elRestName = document.getElementById("restName");
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

async async function init() {
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
    // Summarize cart items for the Order Object
    // (Simply grouping by name for the backend display)
    const itemsSummary = Array.from(cart.values()).map(({ item, qty }) => ({
      name: item.name,
      qty,
      price: item.price
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
