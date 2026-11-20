/**
 * BACKEND DA LOJA TEAM LOBO — Google Apps Script
 * Guarda os pedidos numa planilha, avisa o dono pelo Gmail e envia o comprovante de venda ao comprador.
 * Passo a passo de instalação: veja o LEIA-ME.md.
 */
var CONFIG = {
  LOJA: {
    nome: "Team Lobo Store",
    razaoSocial: "NOME COMPLETO DA EMPRESA",   // <- troque
    cnpj: "00.000.000/0000-00",                // <- troque
    telefone: "(21) 00000-0000",               // <- troque
    cidade: "Rio de Janeiro - RJ",
    email: "team_lobo@yahoo.com"
  },
  EMAIL_DONO: "",        // vazio = usa o Gmail da conta que publicou este script
  FRETE_CENTAVOS: 0      // 0 = "a combinar". Exemplo: 1500 = R$ 15,00 fixos
};

var ABA_PEDIDOS = "Pedidos", ABA_PRODUTOS = "Produtos";
var COLS_PEDIDOS = ["Pedido", "Data", "Status", "Pagamento", "Subtotal", "Frete", "Total", "Nome", "CPF", "E-mail", "Telefone", "Telefone 2", "CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "UF", "Itens (texto)", "Itens (json)", "Comprovante enviado"];
var COLS_PRODUTOS = ["id", "nome", "categoria", "preco (R$)", "tamanhos", "cores", "fotos", "novo", "ativo", "descricao"];
var ROTULO_PAG = { pix: "Pix", credito: "Cartão de crédito", debito: "Cartão de débito" };

/* ---------- Rode UMA vez (menu Executar > setup) ---------- */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  aba_(ss, ABA_PEDIDOS, COLS_PEDIDOS);
  var p = aba_(ss, ABA_PRODUTOS, COLS_PRODUTOS);
  if (p.getLastRow() < 2) {
    p.getRange(2, 1, 3, COLS_PRODUTOS.length).setValues([
      ["camiseta-lobo", "Camiseta Team Lobo (exemplo)", "Camisetas", 89.9, "P,M,G,GG", "Preta", "assets/produtos/camiseta-1.jpg", "sim", "sim", "Camiseta de treino com a marca Team Lobo."],
      ["regata-lobo", "Regata Team Lobo (exemplo)", "Regatas", 79.9, "P,M,G,GG", "Preta,Branca", "assets/produtos/regata-1.jpg", "sim", "sim", "Regata para treino."],
      ["shorts-lobo", "Shorts de treino (exemplo)", "Shorts", 99.9, "P,M,G,GG", "Preto", "assets/produtos/shorts-1.jpg", "nao", "sim", "Shorts leve para treino."]
    ]);
  }
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty("SEGREDO")) props.setProperty("SEGREDO", Utilities.getUuid() + Utilities.getUuid());
}

/* ---------- Entradas web ---------- */
function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || "";
  if (a === "catalogo") return json_({ ok: true, produtos: catalogo_() });
  if (a === "confirmar" || a === "cancelar") return pagina_(e.parameter.id, e.parameter.t, a);
  return json_({ ok: true, loja: CONFIG.LOJA.nome });
}
function doPost(e) {
  try { return json_(criarPedido_(JSON.parse(e.postData.contents))); }
  catch (err) { return json_({ ok: false, erro: String((err && err.message) || err) }); }
}

/* ---------- Pedido ---------- */
function criarPedido_(d) {
  if (d.hp) throw "Pedido inválido.";
  var c = d.comprador || {};
  var nome = txt_(c.nome, 80), email = txt_(c.email, 100).toLowerCase(), cpf = num_(c.cpf), tel = num_(c.telefone), tel2 = num_(c.telefone2), cep = num_(c.cep);
  var rua = txt_(c.rua, 100), numero = txt_(c.numero, 12), compl = txt_(c.complemento, 60), bairro = txt_(c.bairro, 60), cidade = txt_(c.cidade, 60), uf = txt_(c.uf, 2).toUpperCase();
  if (nome.split(" ").filter(String).length < 2) throw "Informe o nome completo.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw "E-mail inválido.";
  if (!cpfValido_(cpf)) throw "CPF inválido.";
  if (tel.length < 10 || tel.length > 11) throw "Telefone inválido.";
  if (tel2 && (tel2.length < 10 || tel2.length > 11)) throw "Telefone secundário inválido.";
  if (cep.length !== 8 || !rua || !numero || !bairro || !cidade || uf.length !== 2) throw "Endereço incompleto.";
  var pag = String(d.pagamento);
  if (!ROTULO_PAG[pag]) throw "Forma de pagamento inválida.";
  if (d.consentimento !== true) throw "É preciso aceitar o uso dos dados para finalizar a compra.";
  var itens = d.itens;
  if (!Array.isArray(itens) || !itens.length || itens.length > 20) throw "Carrinho inválido.";

  // preços SEMPRE vêm da planilha, nunca do navegador
  var cat = {}; catalogo_().forEach(function (p) { cat[p.id] = p; });
  var linhas = [], subtotal = 0;
  itens.forEach(function (i) {
    var p = cat[String(i.id)];
    if (!p) throw "Um produto do carrinho não está mais disponível.";
    var qtd = Math.floor(Number(i.qtd)), tam = String(i.tam || ""), cor = String(i.cor || "");
    if (!(qtd >= 1 && qtd <= 10)) throw "Quantidade inválida.";
    if (p.tamanhos.length && p.tamanhos.indexOf(tam) < 0) throw "Tamanho inválido para " + p.nome + ".";
    if (p.cores.length && p.cores.indexOf(cor) < 0) throw "Cor inválida para " + p.nome + ".";
    subtotal += p.preco * qtd;
    linhas.push({ id: p.id, nome: p.nome, tam: tam, cor: cor, qtd: qtd, preco: p.preco });
  });

  var cache = CacheService.getScriptCache(), k = "rl:" + email, n = Number(cache.get(k) || 0);
  if (n >= 3) throw "Muitos pedidos em pouco tempo. Tente de novo em uma hora.";
  cache.put(k, String(n + 1), 3600);

  var frete = CONFIG.FRETE_CENTAVOS, total = subtotal + frete;
  var sh = aba_(SpreadsheetApp.getActiveSpreadsheet(), ABA_PEDIDOS, COLS_PEDIDOS);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  var id;
  try {
    var usados = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(function (r) { return r[0]; });
    do { id = "TL-" + sufixo_(6); } while (usados.indexOf(id) >= 0);
    sh.appendRow([id, new Date(), "Aguardando pagamento", ROTULO_PAG[pag], subtotal / 100, frete / 100, total / 100, nome, "'" + cpf, email, "'" + tel, tel2 ? "'" + tel2 : "", "'" + cep, rua, numero, compl, bairro, cidade, uf,
      linhas.map(function (l) { return l.qtd + "x " + l.nome + " (" + [l.tam, l.cor].filter(String).join(", ") + ")"; }).join("\n"), JSON.stringify(linhas), ""]);
  } finally { lock.releaseLock(); }

  var p = lerPedido_(sh, sh.getLastRow());
  avisarDono_(p);
  return { ok: true, id: id, subtotal: subtotal, frete: frete, total: total };
}

/* ---------- E-mail para o dono ---------- */
function avisarDono_(p) {
  var base = ScriptApp.getService().getUrl(), t = token_(p.id);
  var link = base + "?action=confirmar&id=" + encodeURIComponent(p.id) + "&t=" + t;
  var linkC = base + "?action=cancelar&id=" + encodeURIComponent(p.id) + "&t=" + t;
  var html = '<div style="font-family:Arial,sans-serif;max-width:560px">' +
    "<h2>🛒 Novo pedido " + esc_(p.id) + "</h2>" +
    "<p><b>Valor:</b> " + reais_(p.total) + " · <b>Pagamento:</b> " + esc_(p.pagamento) + " · <b>Status:</b> aguardando pagamento</p>" +
    "<p>Confira no app do seu banco se entrou um Pix de <b>" + reais_(p.total) + "</b> em nome de <b>" + esc_(p.nome) + "</b> (código " + esc_(p.id) + ").</p>" +
    "<p><a href=\"" + link + "\" style=\"background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none\">Verificar e confirmar pagamento</a></p>" +
    "<p style=\"font-size:13px\"><a href=\"" + linkC + "\">Cancelar este pedido</a></p><hr>" +
    "<p><b>Comprador</b><br>" + esc_(p.nome) + "<br>CPF " + esc_(p.cpf) + "<br>" + esc_(p.email) + "<br>Tel. " + esc_(p.telefone) + (p.telefone2 ? " · " + esc_(p.telefone2) : "") + "</p>" +
    "<p><b>Entrega</b><br>" + esc_(enderecoDe_(p)) + "</p><p><b>Itens</b><br>" + esc_(p.itensTexto).replace(/\n/g, "<br>") + "</p></div>";
  GmailApp.sendEmail(CONFIG.EMAIL_DONO || Session.getEffectiveUser().getEmail(), "🛒 Novo pedido " + p.id + " — " + reais_(p.total) + " (aguardando pagamento)", "Abra este e-mail em um leitor com HTML.", { htmlBody: html, name: CONFIG.LOJA.nome });
}

/* ---------- Página de confirmação (link do e-mail) ---------- */
function pagina_(id, t, acao) {
  var out = function (corpo) { return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:520px;margin:2rem auto;padding:0 1rem">' + corpo + "</div>").setTitle("Pedido " + id); };
  if (!id || !t || t !== token_(String(id))) return out("<h2>Link inválido</h2><p>Use o link enviado no e-mail do pedido.</p>");
  var ref = acharPedido_(String(id));
  if (!ref) return out("<h2>Pedido não encontrado</h2>");
  var p = ref.p;
  var fn = acao === "confirmar" ? "confirmarPagamento" : "cancelarPedido";
  var rotulo = acao === "confirmar" ? "Confirmar pagamento recebido e enviar comprovante" : "Cancelar pedido";
  return out("<h2>Pedido " + esc_(p.id) + "</h2><p><b>" + reais_(p.total) + "</b> · " + esc_(p.pagamento) + " · status atual: <b>" + esc_(p.status) + "</b></p><p>" + esc_(p.nome) + "<br>" + esc_(p.email) + "</p><p>" + esc_(p.itensTexto).replace(/\n/g, "<br>") + "</p>" +
    '<button id="b" style="padding:14px 18px;border:0;border-radius:8px;background:#111;color:#fff;font-size:16px;cursor:pointer">' + rotulo + '</button><p id="m"></p>' +
    "<script>document.getElementById('b').onclick=function(){var b=this;b.disabled=true;google.script.run.withSuccessHandler(function(m){document.getElementById('m').textContent=m}).withFailureHandler(function(e){b.disabled=false;document.getElementById('m').textContent='Erro: '+e.message})." + fn + "(" + JSON.stringify(String(id)) + "," + JSON.stringify(String(t)) + ")}</script>");
}
function confirmarPagamento(id, t) {
  if (t !== token_(String(id))) throw new Error("Link inválido.");
  var ref = acharPedido_(String(id)); if (!ref) throw new Error("Pedido não encontrado.");
  if (ref.p.status === "Pago") return "Este pedido já estava confirmado. O comprovante já foi enviado.";
  if (ref.p.status === "Cancelado") throw new Error("Este pedido foi cancelado.");
  ref.sh.getRange(ref.row, 3).setValue("Pago");
  enviarComprovante_(ref.p);
  ref.sh.getRange(ref.row, COLS_PEDIDOS.length).setValue(new Date());
  return "Pagamento confirmado. O comprovante de venda foi enviado para " + ref.p.email + ".";
}
function cancelarPedido(id, t) {
  if (t !== token_(String(id))) throw new Error("Link inválido.");
  var ref = acharPedido_(String(id)); if (!ref) throw new Error("Pedido não encontrado.");
  if (ref.p.status === "Pago") throw new Error("Pedido já pago. Não dá para cancelar por aqui.");
  ref.sh.getRange(ref.row, 3).setValue("Cancelado");
  return "Pedido cancelado.";
}

/* ---------- Comprovante de venda (PDF por e-mail) ---------- */
function enviarComprovante_(p) {
  var pdf = Utilities.newBlob(comprovanteHtml_(p), "text/html", "comprovante.html").getAs("application/pdf").setName("Comprovante-" + p.id + ".pdf");
  var dono = CONFIG.EMAIL_DONO || Session.getEffectiveUser().getEmail();
  GmailApp.sendEmail(p.email, "Comprovante de venda " + p.id + " — " + CONFIG.LOJA.nome, "Olá, " + p.nome + "! Seu pagamento foi confirmado. O comprovante de venda está em anexo.",
    { htmlBody: "<p>Olá, <b>" + esc_(p.nome) + "</b>!</p><p>Seu pagamento do pedido <b>" + esc_(p.id) + "</b> foi confirmado. O comprovante de venda está em anexo.</p><p>Obrigado por comprar na " + esc_(CONFIG.LOJA.nome) + ".</p>", attachments: [pdf], bcc: dono, name: CONFIG.LOJA.nome });
}
function comprovanteHtml_(p) {
  var L = CONFIG.LOJA, th = "text-align:left;border-bottom:1px solid #999;padding:6px 4px", td = "padding:6px 4px;border-bottom:1px solid #ddd";
  var itens = JSON.parse(p.itensJson).map(function (i) {
    return "<tr><td style=\"" + td + "\">" + esc_(i.nome) + " (" + esc_([i.tam, i.cor].filter(String).join(", ")) + ")</td><td style=\"" + td + "\">" + i.qtd + "</td><td style=\"" + td + "\">" + reais_(i.preco) + "</td><td style=\"" + td + "\">" + reais_(i.preco * i.qtd) + "</td></tr>";
  }).join("");
  return '<html><body style="font-family:Arial,sans-serif;font-size:13px;color:#111"><h1 style="margin:0">Comprovante de venda</h1><p style="margin:2px 0 14px">Pedido <b>' + esc_(p.id) + "</b> · " + esc_(Utilities.formatDate(new Date(p.data), "America/Sao_Paulo", "dd/MM/yyyy HH:mm")) + "</p>" +
    "<h3>Loja</h3><p>" + esc_(L.nome) + "<br>" + esc_(L.razaoSocial) + "<br>CNPJ " + esc_(L.cnpj) + "<br>Tel. " + esc_(L.telefone) + "<br>" + esc_(L.cidade) + " · " + esc_(L.email) + "</p>" +
    "<h3>Comprador</h3><p>" + esc_(p.nome) + "<br>CPF " + esc_(p.cpf) + "<br>" + esc_(p.email) + "<br>Tel. " + esc_(p.telefone) + (p.telefone2 ? " · " + esc_(p.telefone2) : "") + "<br>" + esc_(enderecoDe_(p)) + "</p>" +
    "<h3>Itens</h3><table style=\"width:100%;border-collapse:collapse\"><tr><th style=\"" + th + "\">Produto</th><th style=\"" + th + "\">Qtd</th><th style=\"" + th + "\">Unitário</th><th style=\"" + th + "\">Total</th></tr>" + itens + "</table>" +
    "<p style=\"text-align:right\">Subtotal: " + reais_(p.subtotal) + "<br>Frete: " + (p.frete ? reais_(p.frete) : "a combinar") + "<br><b>Total: " + reais_(p.total) + "</b><br>Pagamento: " + esc_(p.pagamento) + " (confirmado)</p>" +
    "<p style=\"font-size:11px;color:#555\">Documento de comprovação da compra, sem valor fiscal. Não substitui a nota fiscal.</p></body></html>";
}

/* ---------- Funções auxiliares ---------- */
function catalogo_() {
  var v = aba_(SpreadsheetApp.getActiveSpreadsheet(), ABA_PRODUTOS, COLS_PRODUTOS).getDataRange().getValues(), h = v.shift(), ix = indices_(h), out = [];
  v.forEach(function (r) {
    if (!r[ix.id] || String(r[ix.ativo]).toLowerCase() !== "sim") return;
    var pr = r[ix["preco (R$)"]]; pr = typeof pr === "number" ? pr : parseFloat(String(pr).replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!(pr > 0)) return;
    out.push({ id: String(r[ix.id]), nome: String(r[ix.nome]), categoria: String(r[ix.categoria] || "Outros"), preco: Math.round(pr * 100), tamanhos: lista_(r[ix.tamanhos], ","), cores: lista_(r[ix.cores], ","), fotos: lista_(r[ix.fotos], "|"), novo: String(r[ix.novo]).toLowerCase() === "sim", descricao: String(r[ix.descricao] || "") });
  });
  return out;
}
function acharPedido_(id) {
  var sh = aba_(SpreadsheetApp.getActiveSpreadsheet(), ABA_PEDIDOS, COLS_PEDIDOS), ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = 1; i < ids.length; i++) if (ids[i][0] === id) return { sh: sh, row: i + 1, p: lerPedido_(sh, i + 1) };
  return null;
}
function lerPedido_(sh, row) {
  var r = sh.getRange(row, 1, 1, COLS_PEDIDOS.length).getValues()[0], c = function (n) { return r[COLS_PEDIDOS.indexOf(n)]; }, cents = function (x) { return Math.round(Number(x) * 100); };
  return { id: c("Pedido"), data: c("Data"), status: c("Status"), pagamento: c("Pagamento"), subtotal: cents(c("Subtotal")), frete: cents(c("Frete")), total: cents(c("Total")), nome: c("Nome"), cpf: String(c("CPF")), email: c("E-mail"), telefone: String(c("Telefone")), telefone2: String(c("Telefone 2")), cep: String(c("CEP")), rua: c("Rua"), numero: c("Número"), complemento: c("Complemento"), bairro: c("Bairro"), cidade: c("Cidade"), uf: c("UF"), itensTexto: c("Itens (texto)"), itensJson: c("Itens (json)") };
}
function enderecoDe_(p) { return p.rua + ", " + p.numero + (p.complemento ? " - " + p.complemento : "") + " · " + p.bairro + " · " + p.cidade + "/" + p.uf + " · CEP " + p.cep; }
function aba_(ss, nome, cols) {
  var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold"); sh.setFrozenRows(1); }
  return sh;
}
function indices_(h) { var o = {}; h.forEach(function (n, i) { o[n] = i; }); return o; }
function lista_(s, sep) { return String(s || "").split(sep).map(function (x) { return x.trim(); }).filter(String); }
function token_(id) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(id, PropertiesService.getScriptProperties().getProperty("SEGREDO"))).replace(/=+$/, "").slice(0, 24); }
function sufixo_(n) { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = ""; for (var i = 0; i < n; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
function num_(s) { return String(s || "").replace(/\D/g, ""); }
function txt_(s, max) { return String(s || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function esc_(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function reais_(c) { return "R$ " + (c / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+,)/g, "."); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function cpfValido_(c) {
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i); if (((s * 10) % 11) % 10 !== Number(c[t])) return false; }
  return true;
}
