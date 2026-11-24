/* PRODUTOS DE RESERVA — usados enquanto a planilha não responde.
   Cada produto usa 2 imagens em assets/produtos/: [frente, costas].
   preco em CENTAVOS: 7990 = R$ 79,90. */
window.PRODUTOS = [
  {
    id: "camiseta-lobo",
    nome: "Top Cropped Alcinha Team Lobo",
    categoria: "Tops",
    preco: 7990,
    tamanhos: ["P", "M", "G", "GG"],
    cores: ["Preta", "Branca", "Chumbo", "Vermelha"],
    fotos: [
      "assets/produtos/camiseta-lobo.png",
      "assets/produtos/camiseta-lobo-costas.png"
    ],
    novo: true,
    descricao: "Top cropped esportivo de alcinha com acabamento em viés, barra dupla e estampa frontal Team Lobo."
  },
  {
    id: "camiseta-treino",
    nome: "Camiseta Dry-Fit Team Lobo",
    categoria: "Camisetas",
    preco: 8990,
    tamanhos: ["P", "M", "G", "GG"],
    cores: ["Preta", "Branca", "Chumbo"],
    fotos: [
      "assets/produtos/camiseta-treino.png",
      "assets/produtos/camiseta-treino-costas.png"
    ],
    novo: true,
    descricao: "Camiseta esportiva respirável com estampa frontal Team Lobo."
  },
  {
    id: "regata-lobo",
    nome: "Regata Treino Team Lobo",
    categoria: "Regatas",
    preco: 7490,
    tamanhos: ["P", "M", "G", "GG"],
    cores: ["Preta", "Branca", "Grafite"],
    fotos: [
      "assets/produtos/regata-lobo.png",
      "assets/produtos/regata-lobo-costas.png"
    ],
    novo: false,
    descricao: "Regata cavada leve para musculação e alta performance."
  },
  {
    id: "shorts-lobo",
    nome: "Shorts de Treino Team Lobo",
    categoria: "Shorts",
    preco: 9990,
    tamanhos: ["P", "M", "G", "GG"],
    cores: ["Preto", "Grafite", "Azul"],
    fotos: [
      "assets/produtos/shorts-lobo.png",
      "assets/produtos/shorts-lobo-costas.png"
    ],
    novo: false,
    descricao: "Shorts esportivo de treino com brasão Team Lobo na perna."
  }
];
