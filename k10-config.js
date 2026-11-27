// K10 Delivery · ligação com o banco de dados (Supabase)
// Estes dois valores são públicos: o navegador de todo cliente precisa deles.
// A proteção dos dados está nas regras do banco (RLS), em supabase/migrations.
// NUNCA coloque aqui a chave "secret" / "service_role": o site recusa e ela ficaria pública.
window.K10_SB = {
  url: "https://myknerrclisghgmlbgmj.supabase.co",
  key: "sb_publishable_8dqUHx0GrzJe7-LWo-pJwA_AbHR7EIy"
};

// Pagamento online pelo Mercado Pago (Pix e cartão). Estes valores também são públicos.
// O Access Token NUNCA vem para cá: ele fica só nos Secrets do Supabase.
window.K10_PAGAMENTO = {
  url: "https://myknerrclisghgmlbgmj.supabase.co/functions/v1/k10-pagamentos",
  publicKey: "APP_USR-62e06e87-5026-4c18-8cf4-875569e3b38b",
  titular: "ANDRE LUIZ SILVA CAMARGO", // nome que aparece como recebedor no Pix; vazio = aviso genérico
  whatsapp: ""        // opcional: número com DDD para o botão "Falar com a K10"
};
