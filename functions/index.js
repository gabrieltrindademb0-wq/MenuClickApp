const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const MP_TOKEN = () => functions.config().mercadopago && functions.config().mercadopago.token;

/**
 * Helper: call Mercado Pago REST API
 */
async function mpFetch(path, opts = {}) {
  const token = MP_TOKEN();
  if (!token) throw new Error("Mercado Pago token não configurado (functions:config).");

  const url = `https://api.mercadopago.com${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const bodyText = await res.text();
  let body;
  try { body = JSON.parse(bodyText); } catch { body = { raw: bodyText }; }

  if (!res.ok) {
    throw new Error(`Mercado Pago API error ${res.status}: ${bodyText}`);
  }
  return body;
}

/**
 * Callable: gera link de pagamento (Checkout Pro) para um pedido existente.
 * Frontend chama via httpsCallable("createMpPreference", { orderId })
 */
exports.createMpPreference = functions.https.onCall(async (data, context) => {
  const orderId = (data && data.orderId || "").trim();
  if (!orderId) throw new functions.https.HttpsError("invalid-argument", "orderId é obrigatório.");

  // Descobre a URL do seu site (pra voltar no sucesso/erro)
  const origin =
    (context.rawRequest && context.rawRequest.headers && context.rawRequest.headers.origin) ||
    (functions.config().app && functions.config().app.baseurl) ||
    "";

  if (!origin) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Defina functions config app.baseurl com a URL do seu site (ex: https://seuusuario.github.io/seurepo)."
    );
  }

  const orderRef = admin.firestore().collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Pedido não encontrado.");

  const order = snap.data();

  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    throw new functions.https.HttpsError("failed-precondition", "Pedido sem itens.");
  }

  // Monta itens para Checkout Pro
  const items = order.items.map((it) => ({
    title: String(it.name || "Item"),
    quantity: Number(it.qty || 1),
    unit_price: Number(it.price || 0),
    currency_id: "BRL",
  }));

  const projectId = process.env.GCLOUD_PROJECT;
  const region = "us-central1";
  const notificationUrl = `https://${region}-${projectId}.cloudfunctions.net/mpWebhook`;

  const preference = {
    items,
    external_reference: orderId,
    auto_return: "approved",
    back_urls: {
      success: `${origin}/order.html?order=${orderId}`,
      pending: `${origin}/order.html?order=${orderId}`,
      failure: `${origin}/order.html?order=${orderId}`,
    },
    notification_url: notificationUrl,
    metadata: {
      orderId,
    },
  };

  const created = await mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(preference),
  });

  const initPoint = created && (created.init_point || created.sandbox_init_point);
  if (!initPoint) {
    throw new functions.https.HttpsError("internal", "Mercado Pago não retornou init_point.");
  }

  await orderRef.set(
    {
      paymentProvider: "mercadopago",
      paymentStatus: order.paymentStatus || "unpaid",
      paymentUrl: initPoint,
      mpPreferenceId: created.id || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { init_point: initPoint, preference_id: created.id || "" };
});

/**
 * Webhook: Mercado Pago vai chamar aqui para avisar de mudanças de status.
 * Configure no painel do Mercado Pago (Webhooks) apontando para esta URL.
 */
exports.mpWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Mercado Pago manda ids em query/body dependendo do tipo de notificação
    const type = req.query.type || req.query.topic || req.body?.type || req.body?.topic;
    const dataId =
      req.query["data.id"] ||
      req.body?.data?.id ||
      req.query.id ||
      req.body?.id;

    if (!dataId) {
      res.status(200).send("ok (no id)");
      return;
    }

    // A notificação mais comum é type=payment
    if (String(type).includes("payment")) {
      const payment = await mpFetch(`/v1/payments/${dataId}`, { method: "GET" });

      const orderId = payment.external_reference || payment.metadata?.orderId;
      if (!orderId) {
        res.status(200).send("ok (no external_reference)");
        return;
      }

      const status = payment.status; // approved, pending, rejected...
      const paid = status === "approved";

      await admin.firestore().collection("orders").doc(String(orderId)).set(
        {
          paymentStatus: paid ? "paid" : String(status || "unpaid"),
          mpPaymentId: String(payment.id || dataId),
          mpStatus: String(status || ""),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Se pagou, já pode avançar o status do pedido
          ...(paid ? { status: "Recebido" } : {}),
        },
        { merge: true }
      );

      res.status(200).send("ok");
      return;
    }

    // Outros tópicos: apenas aceitar
    res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("error");
  }
});
