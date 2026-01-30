# Pagamento (Mercado Pago) — Cloud Functions

## 1) Instalar Firebase CLI
- https://firebase.google.com/docs/cli

## 2) Inicializar Functions (se ainda não fez)
Dentro da pasta do projeto:
- `firebase init functions`
Escolha **JavaScript** e Node 18.

Depois copie/mescle o conteúdo deste diretório `functions/` para o `functions/` gerado pelo Firebase.

## 3) Configurar variáveis (token Mercado Pago + URL do site)
No terminal:

`firebase functions:config:set mercadopago.token="SEU_ACCESS_TOKEN_DO_MP" app.baseurl="https://SEUUSUARIO.github.io/SEUREPO"`

Depois:
`firebase deploy --only functions`

## 4) Webhook no Mercado Pago
No painel do Mercado Pago, configure Webhooks apontando para:

`https://us-central1-SEU_PROJECT_ID.cloudfunctions.net/mpWebhook`

Eventos: **Payments**

## 5) Fluxo no app
O cliente abre `order.html?order=...` e clica **Pagar agora**.  
O app chama a function `createMpPreference`, recebe `init_point` e redireciona para o Checkout Pro.
