/* PRODUTOS DE EXEMPLO — só aparecem enquanto a loja não está ligada à planilha (config.js sem endpoint).
   Com a planilha ligada, os produtos e preços vêm dela: edite lá (aba Produtos), não aqui.
   preco em CENTAVOS: 8990 = R$ 89,90. Se não houver foto, o site desenha a peça na cor escolhida. */
window.PRODUTOS = [
  { id: "camiseta-preta", nome: "Camiseta Team Lobo", categoria: "Camisetas", preco: 8990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preta", "Branca", "Cinza"], fotos: [], novo: true, descricao: "Camiseta de treino com o lobo prateado no peito.", indisponiveis: ["GG"] },
  { id: "regata-lobo", nome: "Regata Team Lobo", categoria: "Regatas", preco: 7990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preta", "Branca"], fotos: [], novo: true, descricao: "Regata leve para treino.", indisponiveis: [] },
  { id: "shorts-lobo", nome: "Shorts de treino", categoria: "Shorts", preco: 9990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preto", "Azul marinho"], fotos: [], novo: false, descricao: "Shorts leve com cós elástico.", indisponiveis: [] },
  { id: "moletom-lobo", nome: "Moletom Team Lobo", categoria: "Moletons", preco: 16990, tamanhos: ["P", "M", "G", "GG"], cores: ["Preto", "Cinza"], fotos: [], novo: true, descricao: "Moletom com capuz para os dias frios.", indisponiveis: [] },
  { id: "bone-lobo", nome: "Boné Team Lobo", categoria: "Acessórios", preco: 5990, tamanhos: [], cores: ["Preto", "Branco"], fotos: [], novo: false, descricao: "Boné ajustável com a marca.", indisponiveis: [] },
  { id: "camiseta-vermelha", nome: "Camiseta Competição", categoria: "Camisetas", preco: 9490, tamanhos: ["P", "M", "G"], cores: ["Vermelha"], fotos: [], novo: false, descricao: "Camiseta para a equipe de competição.", indisponiveis: [] },
  { id: "legging-lobo", nome: "Legging de treino", categoria: "Leggings", preco: 11990, tamanhos: ["P", "M", "G"], cores: ["Preta", "Grafite"], fotos: [], novo: false, descricao: "Legging de compressão leve.", indisponiveis: [] }
];
