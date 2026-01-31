import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const restId = params.get("r");

const elRestName = document.getElementById("restName");
const elMenu = document.getElementById("menuGrid");
const elTotal = document.getElementById("totalDisplay");
const btnFinish = document.getElementById("finishBtn");

// Mock Data (In a real app, this would come from Firestore 'products' subcollection)
const MOCK_MENU = [
  { id: 1, name: "X-Burger", price: 25.00, desc: "Pão, carne, queijo" },
  { id: 2, name: "X-Salada", price: 28.00, desc: "Completo com salada" },
  { id: 3, name: "Coca-Cola", price: 8.00, desc: "Lata 350ml" },
  { id: 4, name: "Batata Frita", price: 15.00, desc: "Porção média" }
];

let cart = [];

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
      elRestName.textContent = docSnap.data().name;
    }
  } catch(e) { console.log(e); }

  renderMenu();
}

function renderMenu() {
  elMenu.innerHTML = "";
  MOCK_MENU.forEach(item => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="cardTitle">${item.name}</div>
      <p class="cardSub">${item.desc}</p>
      <div style="margin-top:10px; font-weight:bold">R$ ${item.price.toFixed(2)}</div>
      <button class="btn" style="width:100%; margin-top:10px" id="add-${item.id}">Adicionar</button>
    `;
    div.querySelector(`#add-${item.id}`).onclick = () => addToCart(item);
    elMenu.appendChild(div);
  });
}

function addToCart(item) {
  cart.push(item);
  updateTotal();
}

function updateTotal() {
  const total = cart.reduce((acc, item) => acc + item.price, 0);
  elTotal.textContent = total.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
  btnFinish.disabled = cart.length === 0;
  btnFinish.textContent = `Finalizar (${cart.length} itens)`;
}

btnFinish.onclick = async () => {
  btnFinish.disabled = true;
  btnFinish.textContent = "Criando pedido...";

  try {
    // Summarize cart items for the Order Object
    // (Simply grouping by name for the backend display)
    const itemsSummary = cart.map(i => ({
      name: i.name,
      qty: 1, // simplified for MVP
      price: i.price
    }));

    const orderData = {
      restaurantId: restId,
      items: itemsSummary,
      status: "Recebido",
      paymentStatus: "unpaid",
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);
    
    // Redirect to Order Page
    window.location.href = `order.html?order=${docRef.id}`;

  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Erro ao criar pedido");
    btnFinish.disabled = false;
  }
};

init();