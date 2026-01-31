// js/order.js
import { db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Troque pelo seu domínio do backend Vercel:
const BACKEND_URL = "https://menuclick-backend-6175ydag1-gabriel-trindades-projects-d84b41c8.vercel.app/";

const params = new URLSearchParams(location.search);
const orderId = params.get("order");

const elOrderId = document.getElementById("orderId");
const elStatus = document.getElementById("status");
const elUpdated = document.getElementById("updated");

const payHint = document.getElementById("payHint");
const payBtn = document.getElementById("payBtn");

if (elOrderId) elOrderId.textContent = orderId || "(vazio)";

function showPay(text, showButton) {
  if (payHint) payHint.textContent = text || "";
  if (payBtn) payBtn.classList.toggle("hidden", !showButton);
}

let lastPaymentUrl = "";

if (!orderId) {
  if (elStatus) elStatus.textContent = "Pedido inválido";
  showPay("Pedido inválido.", false);
} else {
  const ref = doc(db, "orders", orderId);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (elStatus) elStatus.textContent = "Não encontrado";
      showPay("Pedido não encontrado.", false);
      return;
    }

    const data = snap.data() || {};
    if (elStatus) elStatus.textContent = data.status || "—";
    if (elUpdated) elUpdated.textContent = "Atualiza automaticamente.";

    const paymentStatus = data.paymentStatus || "unpaid";
    const paymentUrl = data.paymentUrl || "";
    lastPaymentUrl = paymentUrl;

    if (paymentStatus === "paid") {
      showPay("Pagamento confirmado ✅", false);
      return;
    }

    if (paymentUrl) {
      showPay("Pagamento pendente. Clique para pagar.", true);
    } else {
      showPay("Pagamento pendente. Gere o link de pagamento.", true);
    }
  });
}

payBtn?.addEventListener("click", async () => {
  try {
    payBtn.disabled = true;

    // Se já existe link salvo, abre direto
    if (lastPaymentUrl) {
      window.location.href = lastPaymentUrl;
      return;
    }

    showPay("Gerando link de pagamento...", false);

    const resp = await fetch(`${BACKEND_URL}/api/create_preference`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Backend error:", data);
      showPay("Não foi possível gerar o pagamento. Tente novamente.", true);
      payBtn.disabled = false;
      return;
    }

    if (!data?.paymentUrl) {
      showPay("Não foi possível gerar o pagamento. Tente novamente.", true);
      payBtn.disabled = false;
      return;
    }

    window.location.href = data.paymentUrl;
  } catch (err) {
    console.error(err);
    showPay("Erro ao gerar pagamento. Verifique o backend (Vercel).", true);
    payBtn.disabled = false;
  }
});
