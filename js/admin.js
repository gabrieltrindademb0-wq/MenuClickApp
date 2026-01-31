import { db } from "./firebase.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const orderIdInp = document.getElementById("orderIdInp");
const statusSel = document.getElementById("statusSel");
const saveBtn = document.getElementById("saveBtn");
const msg = document.getElementById("msg");

saveBtn.onclick = async () => {
  const id = (orderIdInp.value || "").trim();
  const st = statusSel.value;

  if (!id) {
    msg.textContent = "Informe o ID do pedido.";
    return;
  }

  try {
    await updateDoc(doc(db, "orders", id), {
      status: st,
      updatedAt: Date.now(),
    });
    msg.textContent = "Status atualizado ✅";
  } catch (e) {
    console.error(e);
    msg.textContent = "Erro ao salvar.";
  }
};
