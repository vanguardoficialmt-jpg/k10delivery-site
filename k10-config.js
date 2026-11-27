// K10 Delivery · ligação com o banco de dados (Supabase)
// TROQUE os dois valores abaixo pelos do seu NOVO projeto do Supabase
// (Supabase > Project Settings > API Keys / Data API).
// A chave "publishable" pode ficar no site. NUNCA coloque aqui a chave "secret" / "service_role".
window.K10_SB = {
  url: "https://myknerrclisghgmlbgmj.supabase.co",
  key: "sb_publishable_8dqUHx0GrzJe7-LWo-pJwA_AbHR7EIy"
};

// K10 Delivery · pagamento online no checkout (arquivo k10-pagamento.js)
// infinitetag: sua InfiniteTag da InfinitePay, sem o "$" (liga o pagamento com cartão de crédito)
// pixChave / pixTipo: chave Pix da conta que recebe (liga o Pix QR Code e o Pix copia e cola)
//   pixTipo pode ser: "cnpj", "cpf", "celular", "email" ou "aleatoria"
// Deixe vazio para desligar: o checkout volta a mostrar só os pagamentos na entrega.
window.K10_PAG = {
  infinitetag: "",
  pixChave: "",
  pixTipo: "cnpj",
  pixNome: "K10 DELIVERY",
  pixCidade: "CUIABA"
};
