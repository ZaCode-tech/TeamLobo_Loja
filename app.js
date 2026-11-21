/* LOJA TEAM LOBO — vitrine, carrinho, checkout e Pix (JavaScript puro) */
(function () {
  "use strict";
  var L = window.LOJA || {}, root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var money = function (c) { return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var produtos = [], carrinho = [], filtro = "Todos", fonte = "reserva (produtos.js)";

  /* ---------- Pix (BR Code) ---------- */
  function emv(id, v) { return id + ("0" + v.length).slice(-2) + v; }
  function crc16(s) {
    var c = 0xFFFF;
    for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; }
    return ("000" + c.toString(16).toUpperCase()).slice(-4);
  }
  function limpa(s, n) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, n); }
  function pixPayload(chave, nome, cidade, centavos, txid) {
    var p = emv("00", "01") + emv("01", "11") + emv("26", emv("00", "br.gov.bcb.pix") + emv("01", chave)) + emv("52", "0000") + emv("53", "986") +
      emv("54", (centavos / 100).toFixed(2)) + emv("58", "BR") + emv("59", limpa(nome, 25) || "LOJA") + emv("60", limpa(cidade, 15) || "BRASIL") +
      emv("62", emv("05", String(txid).replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***")) + "6304";
    return p + crc16(p);
  }
  window.__pix = { pixPayload: pixPayload, crc16: crc16 }; // usado nos testes

  /* ---------- Validações e máscaras ---------- */
  function cpfOk(c) {
    c = c.replace(/\D/g, "");
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); if (((s * 10) % 11) % 10 !== +c[t]) return false; }
    return true;
  }
  var masks = {
    cpf: function (v) { v = v.replace(/\D/g, "").slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); },
    tel: function (v) { v = v.replace(/\D/g, "").slice(0, 11); return v.length > 10 ? v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, ""); },
    cep: function (v) { v = v.replace(/\D/g, "").slice(0, 8); return v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v; }
  };

  /* ---------- Carrinho ---------- */
  function salvar() { try { localStorage.setItem("tl-loja-cart", JSON.stringify(carrinho)); } catch (e) {} atualizaBadge(); }
  function carregarCarrinho() { try { carrinho = JSON.parse(localStorage.getItem("tl-loja-cart") || "[]"); } catch (e) { carrinho = []; } }
  function prod(id) { return produtos.filter(function (p) { return p.id === id; })[0]; }
  function linhas() { return carrinho.map(function (i) { var p = prod(i.id); return p ? { i: i, p: p } : null; }).filter(Boolean); }
  function subtotal() { return linhas().reduce(function (s, l) { return s + l.p.preco * l.i.qtd; }, 0); }
  function atualizaBadge() { $("#cartN").textContent = carrinho.reduce(function (s, i) { return s + i.qtd; }, 0); }
  function adicionar(id, tam, cor, qtd) {
    var ex = carrinho.filter(function (i) { return i.id === id && i.tam === tam && i.cor === cor; })[0];
    if (ex) ex.qtd = Math.min(10, ex.qtd + qtd); else carrinho.push({ id: id, tam: tam, cor: cor, qtd: Math.min(10, qtd) });
    salvar();
  }

  /* ---------- Diálogos ---------- */
  function abrir(d) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  $$("dialog").forEach(function (d) {
    d.addEventListener("click", function (e) { if (e.target === d || (e.target.dataset && "close" in e.target.dataset)) d.close(); });
  });

  /* ---------- Vitrine ---------- */
  function foto(p, cls) {
    var mono = esc(p.nome.split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase());
    return '<div class="ph ' + (cls || "") + '" data-mono="' + mono + '">' + (p.fotos && p.fotos[0] ? '<img src="' + esc(p.fotos[0]) + '" alt="' + esc(p.nome) + '" loading="lazy" decoding="async">' : "") + "</div>";
  }
  function plano(el) { $$(".ph img", el).forEach(function (im) { var f = function () { im.parentNode.classList.add("noimg"); }; im.addEventListener("error", f); if (im.complete && !im.naturalWidth) f(); }); $$(".ph", el).forEach(function (d) { if (!$("img", d)) d.classList.add("noimg"); }); }
  function renderCats() {
    var cats = ["Todos"].concat(produtos.map(function (p) { return p.categoria; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    $("#cats").innerHTML = cats.map(function (c) { return '<button type="button" class="chip" aria-pressed="' + (c === filtro) + '">' + esc(c) + "</button>"; }).join("");
  }
  function renderGrid() {
    var q = $("#q").value.trim().toLowerCase(), o = $("#ord").value;
    var lista = produtos.filter(function (p) { return (filtro === "Todos" || p.categoria === filtro) && (!q || (p.nome + " " + p.categoria).toLowerCase().indexOf(q) >= 0); });
    lista.sort(function (a, b) { return o === "menor" ? a.preco - b.preco : o === "maior" ? b.preco - a.preco : (b.novo ? 1 : 0) - (a.novo ? 1 : 0); });
    var g = $("#grid");
    g.innerHTML = lista.length ? lista.map(function (p) {
      return '<button type="button" class="pcard" data-id="' + esc(p.id) + '">' + foto(p) + (p.novo ? '<span class="badge">Novo</span>' : "") + "<h3>" + esc(p.nome) + '</h3><p class="price">' + money(p.preco) + "</p></button>";
    }).join("") : '<p class="vazio">Nenhum produto encontrado.</p>';
    plano(g);
  }
  $("#cats").addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; filtro = b.textContent; renderCats(); renderGrid(); });
  $("#q").addEventListener("input", renderGrid); $("#ord").addEventListener("change", renderGrid);
  $("#grid").addEventListener("click", function (e) { var b = e.target.closest(".pcard"); if (b) abrirProduto(b.dataset.id); });

  function abrirProduto(id) {
    var p = prod(id); if (!p) return;
    var tam = p.tamanhos && p.tamanhos.length, cor = p.cores && p.cores.length;
    var chips = function (nome, arr) { return arr.map(function (v, i) { return '<label class="sel"><input type="radio" name="' + nome + '" value="' + esc(v) + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(v) + "</span></label>"; }).join(""); };
    $("#prodBody").innerHTML = '<div class="pdet">' + foto(p, "big") + "<div><h2>" + esc(p.nome) + '</h2><p class="price big">' + money(p.preco) + "</p><p>" + esc(p.descricao || "") + "</p>" +
      (tam ? '<fieldset class="opts"><legend>Tamanho</legend>' + chips("tam", p.tamanhos) + "</fieldset>" : "") + (cor ? '<fieldset class="opts"><legend>Cor</legend>' + chips("cor", p.cores) + "</fieldset>" : "") +
      '<label class="qty">Quantidade<input id="qtd" type="number" min="1" max="10" value="1"></label>' +
      '<div class="acts"><button class="btn" type="button" id="addC">Adicionar ao carrinho</button><button class="btn ghost" type="button" id="buyN">Comprar agora</button></div></div></div>';
    plano($("#prodBody"));
    var ler = function () { var t = $('input[name="tam"]:checked', $("#prodBody")), c = $('input[name="cor"]:checked', $("#prodBody")); return [t ? t.value : "", c ? c.value : "", Math.max(1, Math.min(10, +$("#qtd").value || 1))]; };
    $("#addC").onclick = function () { var v = ler(); adicionar(p.id, v[0], v[1], v[2]); $("#dlgProd").close(); abrirCarrinho(); };
    $("#buyN").onclick = function () { var v = ler(); adicionar(p.id, v[0], v[1], v[2]); $("#dlgProd").close(); abrirCheckout(); };
    abrir($("#dlgProd"));
  }

  function abrirCarrinho() {
    var ls = linhas(), b = $("#cartBody");
    if (!ls.length) { b.innerHTML = "<h2>Carrinho</h2><p>Seu carrinho está vazio.</p>"; abrir($("#dlgCart")); return; }
    b.innerHTML = "<h2>Carrinho</h2>" + ls.map(function (l, n) {
      return '<div class="item">' + foto(l.p, "mini") + '<div><b>' + esc(l.p.nome) + "</b><small>" + esc([l.i.tam, l.i.cor].filter(Boolean).join(" · ")) + "</small><span>" + money(l.p.preco) + '</span></div><div class="stp"><button type="button" data-n="' + n + '" data-d="-1" aria-label="Diminuir">−</button><span>' + l.i.qtd + '</span><button type="button" data-n="' + n + '" data-d="1" aria-label="Aumentar">+</button><button type="button" data-n="' + n + '" data-d="x" aria-label="Remover">🗑</button></div></div>';
    }).join("") + '<p class="tot">Subtotal <b>' + money(subtotal()) + '</b></p><button class="btn" type="button" id="goCheck">Finalizar compra</button>';
    plano(b); $("#goCheck").onclick = function () { $("#dlgCart").close(); abrirCheckout(); }; abrir($("#dlgCart"));
  }
  $("#cartBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-d]"); if (!b) return; var ls = linhas(), l = ls[+b.dataset.n]; if (!l) return;
    if (b.dataset.d === "x") carrinho.splice(carrinho.indexOf(l.i), 1); else l.i.qtd = Math.max(0, Math.min(10, l.i.qtd + +b.dataset.d));
    carrinho = carrinho.filter(function (i) { return i.qtd > 0; }); salvar(); abrirCarrinho();
  });
  $("#cartBtn").onclick = abrirCarrinho;

  /* ---------- Checkout ---------- */
  var form = $("#form"), checkHtml = $("#checkBody").innerHTML;
  function abrirCheckout() {
    if (!linhas().length) { abrirCarrinho(); return; }
    var fr = L.freteCentavos || 0;
    $("#resumo").innerHTML = linhas().map(function (l) { return "<div><span>" + l.i.qtd + "× " + esc(l.p.nome) + " " + esc([l.i.tam, l.i.cor].filter(Boolean).join(" · ")) + "</span><b>" + money(l.p.preco * l.i.qtd) + "</b></div>"; }).join("") +
      "<div><span>Frete</span><b>" + (fr ? money(fr) : "a combinar") + '</b></div><div class="t"><span>Total</span><b>' + money(subtotal() + fr) + "</b></div>";
    $("#erro").textContent = ""; abrir($("#dlgCheck"));
  }
  ["cpf", "telefone", "telefone2", "cep"].forEach(function (n) {
    var el = form.elements[n], m = n === "cpf" ? masks.cpf : n === "cep" ? masks.cep : masks.tel;
    el.addEventListener("input", function () { el.value = m(el.value); });
  });
  form.elements.cep.addEventListener("blur", function () {
    var c = form.elements.cep.value.replace(/\D/g, ""); if (c.length !== 8) return;
    fetch("https://viacep.com.br/ws/" + c + "/json/").then(function (r) { return r.json(); }).then(function (j) {
      if (j.erro) return; form.elements.rua.value = j.logradouro || form.elements.rua.value; form.elements.bairro.value = j.bairro || form.elements.bairro.value;
      form.elements.cidade.value = j.localidade || ""; form.elements.uf.value = j.uf || ""; form.elements.numero.focus();
    }).catch(function () {});
  });
  function dados() {
    var f = form.elements, v = function (n) { return f[n].value.trim(); };
    return { itens: carrinho.map(function (i) { return { id: i.id, tam: i.tam, cor: i.cor, qtd: i.qtd }; }), pagamento: $('input[name="pagamento"]:checked').value, consentimento: f.ok.checked, hp: f.hp.value,
      comprador: { nome: v("nome"), email: v("email"), cpf: v("cpf"), telefone: v("telefone"), telefone2: v("telefone2"), cep: v("cep"), rua: v("rua"), numero: v("numero"), complemento: v("complemento"), bairro: v("bairro"), cidade: v("cidade"), uf: v("uf") } };
  }
  function validar(d) {
    var c = d.comprador, dig = function (s) { return s.replace(/\D/g, ""); };
    if (c.nome.split(/\s+/).filter(Boolean).length < 2) return "Informe o nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return "E-mail inválido.";
    if (!cpfOk(c.cpf)) return "CPF inválido.";
    if (dig(c.telefone).length < 10) return "Telefone inválido.";
    if (c.telefone2 && dig(c.telefone2).length < 10) return "Telefone secundário inválido.";
    if (dig(c.cep).length !== 8 || !c.rua || !c.numero || !c.bairro || !c.cidade || c.uf.length !== 2) return "Preencha o endereço completo.";
    if (!d.consentimento) return "Marque a autorização de uso dos dados para continuar.";
    return "";
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = dados(), msg = validar(d); if (msg) { $("#erro").textContent = msg; return; }
    $("#erro").textContent = ""; var btn = $("#enviar"); btn.disabled = true; btn.textContent = "Enviando…";
    var fim = function () { btn.disabled = false; btn.textContent = "Finalizar pedido"; };
    if (!L.endpoint) { // modo demonstração: nada é enviado
      var sub = subtotal(), fr = L.freteCentavos || 0; mostrarResultado(d, { ok: true, id: "TL-DEMO01", total: sub + fr }, true); fim(); return;
    }
    var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 25000);
    fetch(L.endpoint, { method: "POST", body: JSON.stringify(d), signal: ctl.signal }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(to); fim();
      if (!j.ok) { $("#erro").textContent = j.erro || "Não foi possível registrar o pedido."; return; }
      mostrarResultado(d, j, false);
    }).catch(function () { clearTimeout(to); fim(); $("#erro").textContent = "Sem conexão com a loja. Tente de novo em instantes."; });
  });

  function mostrarResultado(d, r, demo) {
    var b = $("#checkBody"), email = esc(d.comprador.email), zap = "https://wa.me/" + (L.whatsapp || "") + "?text=" + encodeURIComponent("Olá! Fiz o pedido " + r.id + " (" + money(r.total) + ") na " + (L.nome || "loja") + ".");
    var topo = (demo ? '<p class="aviso">MODO DEMONSTRAÇÃO: este pedido não foi enviado para a loja.</p>' : "") + "<h2>Pedido " + esc(r.id) + " registrado</h2><p>Total: <b>" + money(r.total) + "</b></p>";
    var fim = '<p class="hint">Quando a loja confirmar o pagamento, o comprovante de venda chega em <b>' + email + '</b>. Guarde o código do pedido.</p><a class="btn ghost" href="' + zap + '" target="_blank" rel="noopener">Avisar a loja no WhatsApp</a> <button class="btn" type="button" data-close>Fechar</button>';
    if (d.pagamento === "pix") {
      if (!L.pix || !L.pix.chave) { b.innerHTML = topo + '<p class="erro">A chave Pix da loja ainda não foi configurada. Fale com a loja pelo WhatsApp.</p>' + fim; limpa(); return; }
      var code = pixPayload(L.pix.chave, L.pix.nomeRecebedor, L.pix.cidade, r.total, r.id.replace(/-/g, "")), qr = qrcode(0, "M"); qr.addData(code); qr.make();
      b.innerHTML = topo + '<div class="qr">' + qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }) + '</div><p class="hint">Abra o app do seu banco, escolha Pix e leia o QR code, ou use o Pix copia e cola:</p><textarea id="cola" readonly rows="3">' + esc(code) + '</textarea><button class="btn" type="button" id="copiar">Copiar código Pix</button>' +
        "<p class=\"hint\">Confira o valor e o nome do recebedor antes de pagar.</p>" + fim;
      $("#copiar").onclick = function () { var t = $("#cola"); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).catch(function () { document.execCommand("copy"); }); this.textContent = "Código copiado ✓"; };
    } else {
      var link = L.cartao && L.cartao[d.pagamento];
      b.innerHTML = topo + (link ? '<p>Pague no cartão pelo link seguro do provedor de pagamento. Informe o código <b>' + esc(r.id) + '</b> se pedido.</p><a class="btn" href="' + esc(link) + '" target="_blank" rel="noopener">Pagar no cartão</a>'
        : "<p>A loja vai enviar o link para você pagar no cartão por WhatsApp ou e-mail.</p>") + fim;
    }
    limpa();
    function limpa() { if (!demo) { carrinho = []; salvar(); } }
  }
  $("#dlgCheck").addEventListener("close", function () { if ($("#checkBody").innerHTML.indexOf("registrado") >= 0) { $("#checkBody").innerHTML = checkHtml; location.reload(); } });

  /* ---------- Tema, rodapé e início ---------- */
  var tb = $(".theme");
  tb.addEventListener("click", function () { var n = root.dataset.theme === "dark" ? "light" : "dark"; root.dataset.theme = n; try { localStorage.setItem("tl-theme", n); } catch (e) {} });
  $("#oficial").href = $("#oficial2").href = L.oficialUrl || "#";
  $("#zap").href = "https://wa.me/" + (L.whatsapp || "");
  $("#rodape").textContent = [L.nome, L.razaoSocial, "CNPJ " + L.cnpj, L.telefone, L.cidade].filter(Boolean).join(" · ");

  function carregar() {
    var reserva = function () { return window.PRODUTOS || []; };
    if (!L.endpoint) return Promise.resolve(reserva());
    var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(L.endpoint + "?action=catalogo&_=" + Date.now(), { signal: ctl.signal, cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(to); if (j.ok && j.produtos.length) { fonte = "planilha"; return j.produtos; } return reserva(); }).catch(function () { return reserva(); });
  }
  function aviso(t) { var d = document.createElement("div"); d.className = "demo-bar"; d.textContent = t; document.body.insertBefore(d, document.body.firstChild); }
  if (!window.LOJA) aviso("Atenção: o arquivo config.js não carregou. Ele precisa começar com window.LOJA = { e não pode conter o código do Code.gs.");
  else if (!L.endpoint) aviso("Modo demonstração: a loja ainda não está ligada à planilha (endpoint vazio no config.js). Os produtos vêm do produtos.js e os pedidos não são enviados.");
  carregarCarrinho();
  carregar().then(function (lista) { if (/[?&]debug\b/.test(location.search)) aviso("Catálogo lido de: " + fonte + (fonte === "planilha" ? ". Para mudar preços, edite a aba Produtos da planilha." : ". O produtos.js é só reserva: se a planilha estiver ligada, edite os preços nela.")); produtos = lista; carrinho = carrinho.filter(function (i) { return prod(i.id); }); salvar(); renderCats(); renderGrid(); });
})();
