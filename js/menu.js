// js/menu.js (limpo e funcional)
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const restId = params.get("r");

// ELEMENTOS (IDs do seu HTML)
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

// ====== MENU (Firestore -> se não tiver, usa MOCK) ======
const MOCK_MENU = [
  { id: "1", name: "X-Burger", price: 25.0, desc: "Pão, carne, queijo", cat: "Lanches" },
  { id: "2", name: "X-Salada", price: 28.0, desc: "Completo com salada", cat: "Lanches" },
  { id: "3", name: "Batata Frita", price: 15.0, desc: "Porção média", cat: "Acompanhamentos" },
  { id: "4", name: "Coca-Cola", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: "5", name: "Guaraná", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: "6", name: "Molho Especial", price: 3.0, desc: "Porção pequena", cat: "Extras" }
];

let MENU = [];
let activeCategory = "Todos";

// Carrinho: Map(id -> { item, qty })
const cart = new Map();

// ====== INIT ======
async function init() {
  if (!restId) {
    alert("Restaurante não identificado");
    window.location.href = "index.html";
    return;
  }

  await loadRestaurantInfo();
  await loadMenuFromFirestoreOrMock();

  renderCategories();
  renderMenu();
  updateTotals();
  bindEvents();
}

async function loadRestaurantInfo() {
  try {
    const snap = await getDoc(doc(db, "restaurants", restId));
    if (snap.exists()) {
      const name = snap.data().name || "Restaurante";
      if (elRestName) elRestName.textContent = name;
      if (elRestAvatar) elRestAvatar.textContent = (name.trim()[0] || "R").toUpperCase();
      return;
    }
  } catch (e) {
    console.warn("Falha ao carregar restaurante:", e);
  }

  if (elRestName) elRestName.textContent = "Restaurante";
  if (elRestAvatar) elRestAvatar.textContent = "R";
}

async function loadMenuFromFirestoreOrMock() {
  // tenta: restaurants/{id}/products
  try {
    const snap = await getDocs(collection(db, "restaurants", restId, "products"));
    const list = snap.docs.map(d => ({
      id: d.id,
      name: d.data().name || "Produto",
      desc: d.data().description || d.data().desc || "",
      cat: d.data().category || d.data().cat || "Outros",
      price: Number(d.data().price || 0)
    })).filter(p => p.price > 0);

    MENU = list.length ? list : MOCK_MENU;
  } catch (e) {
    console.warn("Sem produtos no Firestore (usando MOCK):", e);
    MENU = MOCK_MENU;
  }
}

// ====== UI ======
function renderCategories() {
  if (!elChips) return;

  const cats = Array.from(new Set(MENU.map(i => i.cat))).sort();
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

  return MENU.filter(i => {
    const matchesCat = activeCategory === "Todos" ? true : i.cat === activeCategory;
    const hay = (i.name + " " + (i.desc || "")).toLowerCase();
    const matchesQuery = !q ? true : hay.includes(q);
    return matchesCat && matchesQuery;
  });
}

function renderMenu() {
  if (!elMenu) return;
  elMenu.innerHTML = "";

  const list = getFilteredMenu();

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.innerHTML = `
      <div class="emptyState__title">Nada por aqui</div>
      <div class="emptyState__sub">Tente outra busca ou categoria.</div>
    `;
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
        <div class="menuItem__desc">${escapeHtml(item.desc || "")}</div>
        <div class="menuItem__price">${formatBRL(item.price)}</div>

        <div class="menuItem__actions">
          ${qty === 0 ? `
            <button class="addBtn" type="button" data-add="${item.id}">Adicionar</button>
          ` : `
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

    row.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => addToCart(item));
    });
    row.querySelectorAll("[data-sub]").forEach(btn => {
      btn.addEventListener("click", () => subFromCart(item));
    });

    elMenu.appendChild(row);
  });
}

// ====== CART ======
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
    total += (Number(item.price) || 0) * qty;
  });
  return { items, total };
}

function updateTotals() {
  const { items, total } = computeTotals();

  if (elCartCount) elCartCount.textContent = String(items);
  if (elTotal) elTotal.textContent = formatBRL(total);
  if (elSheetTotal) elSheetTotal.textContent = formatBRL(total);
  if (btnFinish) btnFinish.disabled = items === 0;

  if (elCartBar) {
    if (items === 0) elCartBar.classList.add("hidden");
    else elCartBar.classList.remove("hidden");
  }

  renderBag();
}

function renderBag() {
  if (!elBagList) return;

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
        <div class="bagRow__sub">${qty} × ${formatBRL(item.price)}</div>
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

// ====== SHEET ======
function openSheet() {
  if (!elSheet) return;
  elSheet.classList.remove("hidden");
  elSheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("noScroll");
}

function closeSheet() {
  if (!elSheet) return;
  elSheet.classList.add("hidden");
  elSheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("noScroll");
}

// ====== EVENTS ======
function bindEvents() {
  // Busca
  elSearch?.addEventListener("input", renderMenu);

  btnClearSearch?.addEventListener("click", () => {
    if (elSearch) elSearch.value = "";
    renderMenu();
    elSearch?.focus();
  });

  // Abrir/fechar sacola
  btnOpenBag?.addEventListener("click", openSheet);
  btnSheetClose?.addEventListener("click", closeSheet);
  btnSheetCloseBg?.addEventListener("click", closeSheet);

  // ESC fecha
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && elSheet && !elSheet.classList.contains("hidden")) closeSheet();
  });

  // Finalizar (cria pedido)
  btnFinish?.addEventListener("click", finishOrder);
}

async function finishOrder() {
  const { items, total } = computeTotals();
  if (items === 0) return;

  btnFinish.disabled = true;
  btnFinish.textContent = "Criando pedido...";

  try {
    const itemsSummary = Array.from(cart.values()).map(({ item, qty }) => ({
      name: item.name,
      qty,
      price: Number(item.price) || 0
    }));

    const orderData = {
      restaurantId: restId,
      items: itemsSummary,
      total: Number(total) || 0,
      status: "Recebido",
      paymentStatus: "unpaid",
      createdAt: Date.now()
    };

    const ref = await addDoc(collection(db, "orders"), orderData);

    cart.clear();
    updateTotals();
    closeSheet();

    // redireciona se existir a página:
    window.location.href = `order.html?order=${encodeURIComponent(ref.id)}`;
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    alert("Erro ao criar pedido");
    btnFinish.disabled = false;
    btnFinish.textContent = "Finalizar pedido";
  }
}

// ====== HELPERS ======
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBRL(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// START
init();
