/* CONFIGURAÇÃO DA LOJA (site) — este arquivo DEVE começar com "window.LOJA = {".
   Ele não é o Code.gs. O Code.gs (Apps Script) fica só no Google, nunca aqui. */
window.LOJA = {
  nome: "Team Lobo Store",
  razaoSocial: "Team Lobo",                    // igual ao Code.gs
  cnpj: "00.000.000/0000-00",                  // <- troque (igual ao Code.gs)
  telefone: "(21) 982814880",                  // igual ao Code.gs
  cidade: "Rio de Janeiro - RJ",
  whatsapp: "5521982814880",                   // WhatsApp da loja (só números, com 55 + DDD)
  oficialUrl: "https://zacode-tech.github.io/TeamLobo/",

  /* PIX: a chave aleatória aparece para todo cliente na hora de pagar, então pode ficar aqui. */
  pix: {
    chave: "",                                 // <- cole a chave aleatória (ex.: 123e4567-e89b-12d3-a456-426614174000)
    nomeRecebedor: "TEAM LOBO",                // até 25 letras, sem acento (nome que aparece no banco do cliente)
    cidade: "RIO DE JANEIRO"                   // até 15 letras, sem acento
  },

  /* CARTÃO: o site NUNCA pede número de cartão. Use um link de pagamento do seu provedor
     (Mercado Pago, InfinitePay, PagBank...). Vazio = a loja envia o link pelo WhatsApp. */
  cartao: { credito: "", debito: "" },

  freteCentavos: 0,                            // igual ao FRETE_CENTAVOS do Code.gs (0 = "a combinar")
  endpoint: ""                                 // <- cole aqui a URL do Apps Script que termina em /exec
};
