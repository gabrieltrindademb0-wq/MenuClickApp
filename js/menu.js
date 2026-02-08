// js/menu.js
import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { initThemeToggle } from "./theme.js";

initThemeToggle();

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

const MOCK_MENU = [
  { id: 1, name: "X-Burger", price: 25.0, desc: "Pão, carne, queijo", cat: "Lanches" },
  { id: 2, name: "X-Salada", price: 28.0, desc: "Completo com salada", cat: "Lanches" },
  { id: 3, name: "Batata Frita", price: 15.0, desc: "Porção média", cat: "Acompanhamentos" },
  { id: 4, name: "Coca-Cola", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: 5, name: "Guaraná", price: 8.0, desc: "Lata 350ml", cat: "Bebidas" },
  { id: 6, name: "Molho Especial", price: 3.0, desc: "Porção pequena", cat: "Extras" }
];

// cart: Map(id => { item, qty })
const cart = new Map();
let activeCategory = "Todos";

async function init() {
  if (!restId) {
    alert("Restaurante não identificado");
    window.location.href = "index.html";
    return;
  }

  // Restaurante
  try {
    const docSnap = await getDoc(doc(db, "restaurants", restId));
    if (docSnap.exists()) {
      const name = docSnap.data().name || "Restaurante";
      if (elRestName) elRestName.textContent = name;
      if (elRestAvatar) elRestAvatar.textContent = (name.trim()[0] || "R").toUpperCase();
    }
  } catch (e) {
    console.log("Falha ao carregar restaurante:", e);
    if (elRestName) elRestName.textContent = "Restaurante";
    if (elRestAvatar) elRestAvatar.textContent = "R";
  }

  renderCategories();
  renderMenu();
  updateTotals();
}

function renderCategories() {
  const cats = Array.from(new Set(MOCK_MENU.map(i => i.cat))).sort();
  const all = ["Todos", ...cats];
  if (!elChips) return;

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
  if (!elMenu) return;
  elMenu.innerHTML = "";

  const list = getFilteredMenu();
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "emptyState";
    empty.innerHTML = `<div class="emptyState__title">Nada por aqui</div><div>Tente outra busca ou categoria.</div>`;
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
        <div class="menuItem__price">${formatBRL(item.price)}</div>
        <div class="menuItem__actions">
          ${
            qty === 0
              ? `<button class="addBtn" type="button" data-add="${item.id}">Adicionar</button>`
              : `
                <div class="qty">
                  <button class="qty__btn" type="button" data-sub="${item.id}">−</button>
                  <span class="qty__value">${qty}</span>
                  <button class="qty__btn" type="button" data-add="${item.id}">+</button>
                </div>
              `
          }
        </div>
      </div>
      <div class="menuItem__img" aria-hidden="true">🍔</div>
    `;

    row.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); addToCart(item); });
    });
    row.querySelectorAll("[data-sub]").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); subFromCart(item); });
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

function openSheet() {
  if (!elSheet) return;
  elSheet.classList.remove("hidden");
  document.body.classList.add("noScroll");
}
function closeSheet() {
  if (!elSheet) return;
  elSheet.classList.add("hidden");
  document.body.classList.remove("noScroll");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function formatBRL(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// handlers
elSearch?.addEventListener("input", renderMenu);

btnClearSearch?.addEventListener("click", () => {
  if (elSearch) elSearch.value = "";
  renderMenu();
  elSearch?.focus();
});

btnOpenBag?.addEventListener("click", openSheet);
btnSheetClose?.addEventListener("click", closeSheet);
btnSheetCloseBg?.addEventListener("click", closeSheet);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && elSheet && !elSheet.classList.contains("hidden")) closeSheet();
});

init();
