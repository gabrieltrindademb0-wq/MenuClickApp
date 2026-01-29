// js/order.js
import { db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ URL do seu backend (Vercel)
const BACKEND_URL = "https://menuclick-backend.vercel.app";

// Lê o ID do pedido pela URL: order.html?order=XXXX
const params = new URLSearchParams(location.search);
const orderId = params.get("order");

// Elementos da tela
const elOrderId = document.getElementById("orderId");
const elStatus = document.getElementById("status");
const elUpdated = document.getElementById("updated");

const payHint = document.getElementById("payHint");
const payBtn = document.getElementById("payBtn");

if (elOrderId) elOrderId.textContent = orderId || "(vazio)";

// Helper para mensagens do pagamento
function showPay(text, showButton) {
  if (payHint) payHint.textContent = text || "";
  if (payBtn) payBtn.classList.toggle("hidden", !showButton);
}

// Se não tiver orderId, mostra erro
if (!orderId) {
  if (elStatus) elStatus.textContent = "Pedido inválido";
  showPay("Pedido inválido.", false);
} else {
  // Escuta o pedido em tempo real
  const ref = doc(db, "orders", orderId);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (elStatus) elStatus.textContent = "Não encontrado";
      showPay("Pedido não encontrado.", false);
      return;
    }

    const data = snap.data();

    if (elStatus) elStatus.textContent = data.status || "—";
    if (elUpdated) elUpdated.textContent = "Atualiza automaticamente.";

    const paymentStatus = data.paymentStatus || "unpaid";
    const paymentUrl = data.paymentUrl || "";

    if (paymentStatus === "paid") {
      showPay("Pagamento confirmado ✅", false);
    } else if (paymentUrl) {
      // Se já tem link salvo no pedido, pode pagar direto
      showPay("Pagamento pendente. Clique para pagar.", true);
    } else {
      // Ainda não gerou link
      showPay("Pagamento pendente. Gere o link de pagamento.", true);
    }
  });
}

// Clique do botão pagar
payBtn?.addEventListener("click", async () => {
  try {
    payBtn.disabled = true;
    showPay("Gerando link de pagamento...", false);

    // Busca o pedido para ver se já tem paymentUrl
    // (não é obrigatório, mas deixa mais esperto)
    const orderRef = doc(db, "orders", orderId);

    // Se quiser evitar leitura extra, pode remover essa parte.
    // Aqui eu mantive simples: sempre chama o backend e ele devolve/atualiza.

    const resp = await fetch(`${BACKEND_URL}/api/create_preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });

    const data = await resp.json();

    if (!data?.paymentUrl) {
      showPay("Não foi possível gerar o pagamento. Tente novamente.", true);
      payBtn.disabled = false;
      return;
    }

    // Abre o Checkout Pro do Mercado Pago
    window.location.href = data.paymentUrl;
  } catch (err) {
    console.error(err);
    showPay("Erro ao gerar pagamento. Verifique o backend (Vercel).", true);
    payBtn.disabled = false;
  }
});
