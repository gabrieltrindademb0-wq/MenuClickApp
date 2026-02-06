// js/app.js
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const elRestaurants = document.getElementById("restaurants");
const searchInp = document.getElementById("searchInp");

// Empty state (cria se não existir no HTML)
let emptyState = document.getElementById("emptyState");
if (!emptyState) {
  emptyState = document.createElement("div");
  emptyState.id = "emptyState";
  emptyState.className = "emptyState";
  emptyState.style.display = "none";
  emptyState.innerHTML = `
    <div class="emptyState__title">Nada por aqui</div>
    <div>Cadastre um restaurante no painel Admin para aparecer aqui.</div>
  `;
  // coloca antes da lista de restaurantes se possível
  (elRestaurants?.parentElement || document.querySelector(".mc-container") || document.body)
    .insertBefore?.(emptyState, elRestaurants || null);
}

const params = new URLSearchParams(location.search);
const rParam = params.get("r"); // id do restaurante

let restaurantsCache = [];

function hashCode(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function fakeMeta(id){
  const h = hashCode(String(id));
  const rating = (4.2 + (h % 8) * 0.1).toFixed(1); // 4.2 - 4.9
  const min = 20 + (h % 20); // 20-39
  const fee = (h % 2) ? 0 : (4.99 + (h % 7) * 0.5);
  return { rating, min, fee };
}

function renderSkeleton(){
  if (!elRestaurants) return;
  elRestaurants.innerHTML = "";
  emptyState.style.display = "none";

  for (let i=0; i<6; i++){
    const div = document.createElement("div");
    div.className = "mc-card";
    div.innerHTML = `
      <div class="mc-banner mc-skel"></div>
      <div class="mc-cardbody">
        <div class="mc-skel" style="height:14px;width:70%;margin-bottom:10px"></div>
        <div class="mc-skel" style="height:12px;width:95%;margin-bottom:6px"></div>
        <div class="mc-skel" style="height:12px;width:78%;margin-bottom:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div class="mc-skel" style="height:26px;width:74px;border-radius:999px"></div>
          <div class="mc-skel" style="height:26px;width:74px;border-radius:999px"></div>
          <div class="mc-skel" style="height:26px;width:74px;border-radius:999px"></div>
        </div>
      </div>
    `;
    elRestaurants.appendChild(div);
  }
}

function renderRestaurants(list){
  if (!elRestaurants) return;
  elRestaurants.innerHTML = "";

  if (!list || list.length === 0){
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  list.forEach(r => {
    const meta = fakeMeta(r.id);
    const div = document.createElement("div");
    div.className = "mc-card";
    div.innerHTML = `
      <div class="mc-banner"></div>
      <div class="mc-cardbody">
        <p class="mc-title">${escapeHtml(r.name || "Restaurante")}</p>
        <p class="mc-desc">${escapeHtml(r.description || "Clique para abrir o cardápio.")}</p>
        <div class="mc-meta">
          <span class="mc-badge">⭐ ${meta.rating}</span>
          <span class="mc-badge">⏱ ${meta.min}–${meta.min+10} min</span>
          <span class="mc-badge">${meta.fee === 0 ? "Entrega grátis" : `Taxa R$ ${meta.fee.toFixed(2)}`}</span>
        </div>
      </div>
    `;
    div.addEventListener("click", ()=> openRestaurant(r));
    elRestaurants.appendChild(div);
  });
}

function openRestaurant(r){
  window.location.href = `menu.html?r=${encodeURIComponent(r.id)}`;
}

async function loadRestaurants(){
  renderSkeleton();

  try {
    const snap = await getDocs(collection(db, "restaurants"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    restaurantsCache = list;

    // se tiver ?r=ID abre direto
    if (rParam){
      const found = list.find(x => x.id === rParam);
      if (found){
        openRestaurant(found);
        return;
      }
    }

    renderRestaurants(list);
    if (!list.length) showToast("Nenhum restaurante cadastrado ainda.");
  } catch (err) {
    console.error("Falha ao carregar restaurantes:", err);

    // fallback demo (não quebra o app)
    const demo = [
      { id: "demo-1", name: "MenuClick Demo", description: "Configure o Firebase para listar seus restaurantes." },
      { id: "demo-2", name: "Restaurante Exemplo", description: "Clique para abrir o cardápio (demo)." }
    ];
    restaurantsCache = demo;
    renderRestaurants(demo);
    showToast("Não consegui acessar o banco. Mostrando modo demo.");
  }
}

searchInp?.addEventListener("input", () => {
  const q = (searchInp.value || "").toLowerCase().trim();
  const filtered = restaurantsCache.filter(r =>
    String(r.name || "").toLowerCase().includes(q)
  );
  renderRestaurants(filtered);
});

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

loadRestaurants();

function showToast(msg){
  let t = document.getElementById("mcToast");
  if (!t){
    t = document.createElement("div");
    t.id = "mcToast";
    t.className = "mc-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__mcToastTimer);
  window.__mcToastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
