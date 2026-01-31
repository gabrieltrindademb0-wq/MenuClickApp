// js/app.js
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const elRestaurants = document.getElementById("restaurants");
const searchInp = document.getElementById("searchInp");

const params = new URLSearchParams(location.search);
const rParam = params.get("r"); // id do restaurante

let restaurantsCache = [];

function renderRestaurants(list){
  elRestaurants.innerHTML = "";
  list.forEach(r=>{
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="cardTitle">${escapeHtml(r.name || "Restaurante")}</div>
      <p class="cardSub">${escapeHtml(r.description || "Clique para abrir")}</p>
      <hr/>
      <button class="btn btnAccent">Abrir</button>
      <p class="cardSub" style="margin-top:10px">Link: <code>/?r=${r.id}</code></p>
    `;
    div.querySelector("button").onclick = ()=> openRestaurant(r);
    elRestaurants.appendChild(div);
  });
}

function openRestaurant(r){
  // Navigate to menu
  window.location.href = `menu.html?r=${r.id}`;
}

async function loadRestaurants(){
  elRestaurants.innerHTML = `<p class="hint">Carregando...</p>`;
  const snap = await getDocs(collection(db, "restaurants"));
  const list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  restaurantsCache = list;

  // ✅ se tiver ?r=ID abre direto
  if (rParam){
    const found = list.find(x=>x.id === rParam);
    if (found){
      openRestaurant(found);
      return;
    }
  }

  renderRestaurants(list);
}

searchInp?.addEventListener("input", ()=>{
  const q = (searchInp.value || "").toLowerCase().trim();
  const filtered = restaurantsCache.filter(r =>
    String(r.name||"").toLowerCase().includes(q)
  );
  renderRestaurants(filtered);
});

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

loadRestaurants();
