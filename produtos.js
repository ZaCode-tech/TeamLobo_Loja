/* PRODUTOS DE EXEMPLO — usados enquanto a loja não está ligada à planilha.
   Com a planilha (Apps Script) configurada, os produtos e preços passam a vir dela e este arquivo vira reserva.
   preco em CENTAVOS: 8990 = R$ 89,90. Fotos em assets/produtos/. */
window.PRODUTOS = [
  { id: "camiseta-lobo", nome: "Camiseta Team Lobo (exemplo)", categoria: "Camisetas", preco: 100, tamanhos: ["P", "M", "G", "GG"], cores: ["Preta"], fotos: ["assets/produtos/camiseta-1.jpg"], novo: true, descricao: "Camiseta de treino com a marca Team Lobo." },
  { id: "regata-lobo", nome: "Regata Team Lobo (exemplo)", categoria: "Regatas", preco: 7990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preta", "Branca"], fotos: ["assets/produtos/regata-1.jpg"], novo: true, descricao: "Regata para treino." },
  { id: "shorts-lobo", nome: "Shorts de treino (exemplo)", categoria: "Shorts", preco: 9990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preto"], fotos: ["assets/produtos/shorts-1.jpg"], novo: false, descricao: "Shorts leve para treino." }
];
