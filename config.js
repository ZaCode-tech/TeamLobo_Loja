window.LOJA = {
  nome: "Team Lobo Store",
  razaoSocial: "Team Lobo",
  cnpj: "00.000.000/0000-00",
  telefone: "(21) 982814880",
  cidade: "Rio de Janeiro - RJ",
  whatsapp: "5521982814880", // DDI + DDD + número (só dígitos)
  oficialUrl: "https://zacode-tech.github.io/Team.Lobo/", // link do site oficial
  freteCentavos: 0, // 0 = "a combinar" | 1500 = R$ 15,00

  // Cole aqui a URL gerada no Passo 3 (enquanto estiver vazio, o site roda em modo demonstração)
  endpoint: "https://script.google.com/macros/s/AKfycbzAbEDLf9hC0prnLKDE7wEIYrRpgmOQZ7XV3SdZCSxEX-HpyHsH1zKHFB2Lccs_ngOE/exec",

  pix: {
    chave: "602f1934-d35a-4e4a-97e1-3cf535231e02", // CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória
    nomeRecebedor: "SID LOBO", // até 25 letras, sem acento
    cidade: "RIO DE JANEIRO"   // até 15 letras, sem acento
  },

  // Links de pagamento (Mercado Pago, InfinitePay, PagBank, etc.)
  cartao: {
    credito: "", // ex: "https://link.mercadopago.com.br/..."
    debito: ""
  }
};
