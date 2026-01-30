// js/app.js
import { db } from "./firebase.js";
import {
  collection, getDocs, query, where, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const elRestaurants = document.getElementById("restaurants");
const elItems = document.getElementById("items");
const menuSection = document.getElementById("menuSection");
const restaurantTitle = document.getElementById("restaurantTitle");
const backBtn = document.getElementById("backBtn");

const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");
const cartList = document.getElementById("cartList");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");

const checkoutForm = document.getElementById("checkoutForm");
const orderInfo = document.getElementById("orderInfo"); // mostra link/código do pedido

let selectedRestaurant = null;

const params = new URLSearchParams(location.search);
const rParam = params.get("r"); // id do restaurante (do Firestore)

let cart = []; // {id,name,price,qty}

function money(v){ return v.toFixed(2); }

function updateCartUI(){
  const count = cart.reduce((s,i)=>s+i.qty,0);
  cartCount.textContent = String(count);

  cartList.innerHTML = "";
  if(cart.length === 0){
    cartList.innerHTML = `<p class="hint">Carrinho vazio.</p>`;
    cartTotal.textContent = "0.00";
    return;
  }

  cart.forEach((i,idx)=>{
    const row = document.createElement("div");
    row.className = "cartItem";
    row.innerHTML = `
      <div>
        <div class="cartName">${i.name}</div>
        <div class="hint">R$ ${money(i.price)} • qtd: ${i.qty}</div>
      </div>
      <div class="row gap">
        <button class="btn" data-dec="${idx}">-</button>
        <button class="btn" data-inc="${idx}">+</button>
        <button class="btn ghost" data-del="${idx}">remover</button>
      </div>
    `;
    cartList.appendChild(row);
  });

  const total = cart.reduce((s,i)=>s+(i.price*i.qty),0);
  cartTotal.textContent = money(total);

  cartList.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const dec = e.currentTarget.getAttribute("data-dec");
      const inc = e.currentTarget.getAttribute("data-inc");
      const del = e.currentTarget.getAttribute("data-del");

      if(dec !== null){
        cart[dec].qty = Math.max(1, cart[dec].qty - 1);
      }
      if(inc !== null){
        cart[inc].qty += 1;
      }
      if(del !== null){
        cart.splice(Number(del),1);
      }
      updateCartUI();
    });
  });
}

async function loadRestaurants(){
  elRestaurants.innerHTML = `<p class="hint">Carregando...</p>`;
  const snap = await getDocs(collection(db,"restaurants"));
  const list = snap.docs.map(d=>({id:d.id, ...d.data()}));

// Se o link tiver ?r=ID, abre direto esse restaurante
if (rParam) {
  const found = list.find(x => x.id === rParam);
  if (found) openRestaurant(found);
}


  if(list.length === 0){
    elRestaurants.innerHTML = `<p class="hint">Nenhum restaurante cadastrado (entre no Admin e crie um).</p>`;
    return;
  }

  elRestaurants.innerHTML = "";
  list.forEach(r=>{
    const card = document.createElement("button");
    card.className = "card";
    card.innerHTML = `
      <div class="cardTitle">${r.name ?? "Sem nome"}</div>
      <div class="hint">${r.description ?? ""}</div>
    `;
    card.addEventListener("click", ()=>openRestaurant(r));
    elRestaurants.appendChild(card);
  });
}

async function openRestaurant(r){
  selectedRestaurant = r;
  restaurantTitle.textContent = `Cardápio — ${r.name}`;
  menuSection.classList.remove("hidden");

  elItems.innerHTML = `<p class="hint">Carregando itens...</p>`;
  const q = query(collection(db,"items"), where("restaurantId","==", r.id));
  const snap = await getDocs(q);
  const items = snap.docs.map(d=>({id:d.id, ...d.data()}));

  elItems.innerHTML = "";
  if(items.length === 0){
    elItems.innerHTML = `<p class="hint">Sem itens nesse restaurante (cadastre no Admin).</p>`;
    return;
  }

  items.forEach(it=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="cardTitle">${it.name}</div>
      <div class="hint">R$ ${money(Number(it.price||0))}</div>
      <button class="btn primary full">Adicionar</button>
    `;
    card.querySelector("button").addEventListener("click", ()=>{
      const existing = cart.find(x=>x.id===it.id);
      if(existing) existing.qty += 1;
      else cart.push({id: it.id, name: it.name, price: Number(it.price||0), qty: 1});
      updateCartUI();
    });
    elItems.appendChild(card);
  });
}

backBtn.addEventListener("click", ()=>{
  menuSection.classList.add("hidden");
  selectedRestaurant = null;
});

cartBtn.addEventListener("click", ()=>{
  cartModal.classList.remove("hidden");
  orderInfo.textContent = "";
  updateCartUI();
});
closeCart.addEventListener("click", ()=> cartModal.classList.add("hidden"));

checkoutForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!selectedRestaurant){
    orderInfo.textContent = "Selecione um restaurante antes de finalizar.";
    return;
  }
  if(cart.length === 0){
    orderInfo.textContent = "Carrinho vazio.";
    return;
  }

  const customerName = document.getElementById("name").value.trim();
  const address = document.getElementById("address").value.trim();
  const payment = document.getElementById("payment").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);

  const docRef = await addDoc(collection(db,"orders"),{
    createdAt: serverTimestamp(),
    status: "Recebido",
    customerName, address, payment, notes,
    restaurantId: selectedRestaurant.id,
    items: cart.map(i=>({name:i.name, price:i.price, qty:i.qty})),
    total
  });

  cart = [];
  updateCartUI();
  checkoutForm.reset();
  orderInfo.textContent = `Pedido criado! Código: ${docRef.id} (status: Recebido)`;
    // abre a tela de acompanhamento/pagamento
    location.href = `./order.html?order=${docRef.id}`;
});

loadRestaurants();
updateCartUI();