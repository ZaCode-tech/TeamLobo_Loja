/* VITRINE 3D — trilho de cabides.
   As peças "caem" no trilho; passando o mouse (ou o dedo) a peça mais próxima gira e vira de frente.
   Tocar em uma peça abre os detalhes: cor, tamanho, quantidade, carrinho e compra. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var C = function () { return window.LojaCore; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var host = $("#vitrine"), lista = [], garms = [], focoX = null, agendado = false, primeira = true, hashFeito = false;
  var rail, legenda, det, atual = 0, corIdx = 0, tamSel = "", voltaFoco = null;

  /* ---------- Cores e desenho das peças (usado quando não há foto) ---------- */
  var HEX = { preta: "#111318", preto: "#111318", branca: "#f1f2f4", branco: "#f1f2f4", cinza: "#8b9099", chumbo: "#3a3f47", grafite: "#2b2f36", vermelha: "#c1272d", vermelho: "#c1272d", azul: "#1f4fb4", marinho: "#14213d", verde: "#1e7a4a", amarela: "#e6b800", amarelo: "#e6b800", laranja: "#e8742a", rosa: "#e86a9a", roxa: "#6b3fa0", roxo: "#6b3fa0", bege: "#d8c8a8", marrom: "#6b4a2f", prata: "#c4c9d2", off: "#e8e4da" };
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function hexDe(nome) {
    var n = norm(nome), m = /#([0-9a-f]{6})/.exec(n); if (m) return "#" + m[1];
    var w = n.split(/[^a-z]+/).filter(Boolean);
    for (var i = 0; i < w.length; i++) if (HEX[w[i]]) return HEX[w[i]];
    var h = 0; for (var k = 0; k < n.length; k++) h = (h * 31 + n.charCodeAt(k)) % 360;
    return "hsl(" + h + " 38% 42%)";
  }
  function claro(hex) { var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex); if (!m) return false; return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255 > 0.62; }
  function tipoDe(p) {
    var s = norm(p.nome + " " + p.categoria);
    if (/regata|tank/.test(s)) return "regata"; if (/short|bermuda/.test(s)) return "shorts";
    if (/moletom|casaco|jaqueta|hoodie/.test(s)) return "moletom"; if (/bone|viseira/.test(s)) return "bone";
    if (/legging|calca/.test(s)) return "calca"; return "camiseta";
  }
  var FORMAS = {
    camiseta: "M60 20L10 55L30 92L55 80V200H145V80L170 92L190 55L140 20Q100 46 60 20Z",
    regata: "M62 18V56Q62 82 42 102L48 200H152L158 102Q138 82 138 56V18H118Q100 52 82 18Z",
    shorts: "M42 20H158L172 150H108L100 84L92 150H28Z",
    moletom: "M72 20Q100 4 128 20L172 42L192 150L164 158L154 104V204H46V104L36 158L8 150L28 42Z",
    calca: "M60 12H140L150 44L130 206H106L100 74L94 206H70L50 44Z",
    bone: "M28 112Q28 42 100 42Q172 42 172 112V122H28Z"
  };
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<linearGradient id="lb-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>' +
    '<linearGradient id="lb-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#a7b1bf"/><stop offset="1" stop-color="#5a6472"/></linearGradient>' +
    '</defs></svg>';
  var PRINT = { camiseta: [79, 80, 42, 50], regata: [80, 84, 40, 47], moletom: [80, 86, 40, 47], bone: [84, 62, 32, 38], shorts: [46, 34, 22, 26] };
  function arteSvg(p, cor) {
    var t = tipoDe(p), hex = hexDe(cor), st = ' stroke="rgba(0,0,0,.3)" stroke-width="1.5" stroke-linejoin="round"';
    var s = '<svg class="art" viewBox="0 0 200 220" aria-hidden="true" focusable="false">';
    if (t === "bone") s += '<path d="M14 124Q100 158 186 124L198 138Q100 188 2 138Z" fill="' + hex + '"' + st + '/><path d="M14 124Q100 158 186 124L198 138Q100 188 2 138Z" fill="rgba(0,0,0,.25)"/>';
    s += '<path d="' + FORMAS[t] + '" fill="' + hex + '"' + st + '/><path d="' + FORMAS[t] + '" fill="url(#lb-shade)"/>';
    if (t === "camiseta") s += '<path d="M60 20Q100 46 140 20Q100 33 60 20Z" fill="rgba(0,0,0,.3)"/>';
    if (t === "moletom") s += '<path d="M72 20Q100 60 128 20Q100 8 72 20Z" fill="rgba(0,0,0,.32)"/><path d="M93 44V76M107 44V76" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
    if (t === "shorts") s += '<path d="M42 20H158L160 34H40Z" fill="rgba(0,0,0,.22)"/>';
    var pr = PRINT[t];
    if (pr) s += '<image href="assets/lobo.webp" x="' + pr[0] + '" y="' + pr[1] + '" width="' + pr[2] + '" height="' + pr[3] + '"' + (claro(hex) ? ' style="filter:brightness(.08)"' : "") + "/>"; // lobo prateado (preto em peças claras)
    return s + "</svg>";
  }
  function fotoDe(p, i) { var f = p.fotos || []; if (!f.length) return ""; return ((p.cores || []).length > 1 && f.length === p.cores.length) ? f[i] : f[0]; }
  function montaArte(box, p, i) {
    var cor = (p.cores && p.cores[i]) || "", url = fotoDe(p, i), svg = function () { box.innerHTML = arteSvg(p, cor); };
    if (!url) return svg();
    var im = new Image(); im.alt = ""; im.decoding = "async"; im.className = "art"; im.onerror = svg;
    box.innerHTML = ""; box.appendChild(im); im.src = url;
  }

  /* ---------- Trilho ---------- */
  var CABIDE = '<svg class="cabide" viewBox="0 0 120 44" aria-hidden="true" focusable="false"><path d="M60 3a8 8 0 1 1 8 8c-4 0-8 3-8 8v5L6 40h108L60 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function render(l) {
    lista = l;
    if (!rail) {
      host.innerHTML = DEFS + '<div class="rail3d" id="rail3d" role="list" aria-label="Peças da loja"><div class="row"></div></div><div class="legenda" aria-live="polite"></div>';
      rail = $("#rail3d"); legenda = $(".legenda", host);
      rail.addEventListener("scroll", agenda, { passive: true }); addEventListener("resize", agenda);
    }
    var row = $(".row", rail);
    if (!l.length) { row.innerHTML = '<p class="vazio">Nenhuma peça encontrada.</p>'; garms = []; legenda.innerHTML = ""; return; }
    row.classList.toggle("drop", primeira);
    row.innerHTML = l.map(function (p, i) {
      return '<button class="gar" type="button" role="listitem" data-i="' + i + '" style="--i:' + i + '" aria-label="' + esc(p.nome + ", " + C().money(p.preco)) + '"><span class="hang">' + CABIDE + '<span class="swing"><span class="artbox"></span>' + (p.novo ? '<span class="tag">Novo</span>' : "") + "</span></span></button>";
    }).join("");
    garms = $$(".gar", row);
    garms.forEach(function (g, i) { montaArte($(".artbox", g), l[i], 0); });
    primeira = false; agenda();
    if (!hashFeito) { hashFeito = true; var m = /#produto=([^&]+)/.exec(location.hash); if (m) { var id = decodeURIComponent(m[1]); for (var k = 0; k < l.length; k++) if (l[k].id === id) { abrir(k); break; } } }
  }
  function agenda() { if (!agendado) { agendado = true; requestAnimationFrame(atualizar); } }
  function atualizar() {
    agendado = false; if (!rail || !garms.length) return;
    var r = rail.getBoundingClientRect(), fx = focoX == null ? r.left + r.width / 2 : focoX, span = Math.max(150, Math.min(340, r.width * 0.3)), best = 9, bi = 0;
    garms.forEach(function (g, i) {
      var b = g.getBoundingClientRect(), d = Math.max(-1, Math.min(1, (b.left + b.width / 2 - fx) / span)), ad = Math.abs(d);
      g.style.setProperty("--ry", (reduce ? 0 : d * 64).toFixed(1) + "deg");
      g.style.setProperty("--sc", (1 + 0.2 * (1 - ad)).toFixed(3));
      g.style.zIndex = Math.round((1 - ad) * 10);
      if (ad < best) { best = ad; bi = i; }
    });
    garms.forEach(function (g, i) { g.classList.toggle("foco", i === bi); });
    var p = lista[bi]; legenda.innerHTML = "<b>" + esc(p.nome) + "</b><span>" + C().money(p.preco) + "</span><small>Toque na peça para ver os detalhes</small>";
  }
  host.addEventListener("pointermove", function (e) { if (e.pointerType !== "touch") { focoX = e.clientX; agenda(); } });
  host.addEventListener("pointerleave", function () { focoX = null; agenda(); });
  host.addEventListener("focusin", function (e) { var g = e.target.closest && e.target.closest(".gar"); if (g) { var b = g.getBoundingClientRect(); focoX = b.left + b.width / 2; agenda(); } });
  host.addEventListener("click", function (e) { var g = e.target.closest(".gar"); if (g) abrir(+g.dataset.i); });

  /* ---------- Detalhes (tela cheia com fundo desfocado) ---------- */
  function criaDetalhe() {
    det = document.createElement("div"); det.className = "det"; det.hidden = true;
    det.setAttribute("role", "dialog"); det.setAttribute("aria-modal", "true"); det.setAttribute("aria-label", "Detalhes da peça");
    det.innerHTML = '<div class="dtop"><button type="button" class="dlink" data-a="fechar">Fechar ✕</button><button type="button" class="dlink" data-a="carrinho">Carrinho <b id="detN">0</b></button></div>' +
      '<div class="dbody"><div class="dstage"><button class="nv" type="button" data-a="prev" aria-label="Peça anterior">‹</button><div class="hang2">' + CABIDE.replace('class="cabide"', 'class="cabide big"') + '<div class="swing2"><div class="artbox big"></div></div></div><button class="nv" type="button" data-a="next" aria-label="Próxima peça">›</button></div>' +
      '<div class="dinfo"><small class="idx"></small><h2 class="dnome"></h2><p class="dpreco"></p><p class="ddesc"></p>' +
      '<div class="dgrp" data-g="cor"><span>Cor: <b class="cnome"></b></span><div class="sw"></div></div><div class="dgrp" data-g="tam"><span>Tamanho</span><div class="tg"></div></div>' +
      '<label class="dqty">Quantidade <input class="dq" type="number" min="1" max="10" value="1"></label>' +
      '<div class="dacts"><button class="btn" type="button" data-a="add">Adicionar ao carrinho</button><button class="btn ghost" type="button" data-a="buy">Comprar agora</button></div><p class="dmsg" role="status"></p><a class="dshare" target="_blank" rel="noopener">Compartilhar no WhatsApp</a></div></div>';
    document.body.appendChild(det);
    det.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a],[data-cor],[data-tam]"); if (!b) return;
      if (b.dataset.cor != null) return trocaCor(+b.dataset.cor);
      if (b.dataset.tam != null) { if (b.disabled) return; tamSel = b.dataset.tam; $$(".tg button", det).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); $(".dmsg", det).textContent = ""; return; }
      var a = b.dataset.a;
      if (a === "fechar") fechar(); else if (a === "prev") abrir(atual - 1, true); else if (a === "next") abrir(atual + 1, true);
      else if (a === "carrinho") { fechar(); C().abrirCarrinho(); } else if (a === "add") comprar(false); else if (a === "buy") comprar(true);
    });
    var st = $(".dstage", det), sw = $(".swing2", det);
    st.addEventListener("pointermove", function (e) { var r = st.getBoundingClientRect(); sw.style.setProperty("--tx", (((e.clientX - r.left) / r.width) - 0.5).toFixed(2)); sw.style.setProperty("--ty", (((e.clientY - r.top) / r.height) - 0.5).toFixed(2)); });
    st.addEventListener("pointerleave", function () { sw.style.setProperty("--tx", 0); sw.style.setProperty("--ty", 0); });
  }
  function abrir(i, troca) {
    if (!lista.length) return; if (!det) criaDetalhe();
    atual = (i + lista.length) % lista.length; corIdx = 0; tamSel = "";
    var p = lista[atual], cores = p.cores || [], tams = p.tamanhos || [], off = p.indisponiveis || [];
    $(".idx", det).textContent = (atual + 1) + " / " + lista.length + (p.categoria ? " · " + p.categoria : "");
    $(".dnome", det).textContent = p.nome; $(".dpreco", det).textContent = C().money(p.preco); $(".ddesc", det).textContent = p.descricao || "";
    var gc = $('[data-g="cor"]', det), gt = $('[data-g="tam"]', det); gc.hidden = !cores.length; gt.hidden = !tams.length;
    $(".sw", det).innerHTML = cores.map(function (c, k) { return '<button type="button" class="swb" data-cor="' + k + '" aria-label="' + esc(c) + '" aria-pressed="' + (k === 0) + '" style="--c:' + hexDe(c) + '"></button>'; }).join("");
    $(".cnome", det).textContent = cores[0] || "";
    $(".tg", det).innerHTML = tams.map(function (t) { var x = off.indexOf(t) >= 0; return '<button type="button" data-tam="' + esc(t) + '" aria-pressed="false"' + (x ? ' disabled title="Esgotado"' : "") + ">" + esc(t) + "</button>"; }).join("");
    $(".dq", det).value = 1; var m = $(".dmsg", det); m.textContent = ""; m.className = "dmsg";
    $("#detN", det).textContent = $("#cartN").textContent;
    $(".dshare", det).href = "https://wa.me/?text=" + encodeURIComponent(p.nome + " — " + location.href.split("#")[0] + "#produto=" + p.id);
    montaArte($(".artbox.big", det), p, 0);
    var h = $(".hang2", det); h.classList.remove("in"); void h.offsetWidth; h.classList.add("in");
    if (det.hidden) { voltaFoco = document.activeElement; det.hidden = false; document.documentElement.classList.add("trava"); $('[data-a="fechar"]', det).focus(); }
    try { history.replaceState(null, "", "#produto=" + encodeURIComponent(p.id)); } catch (e) {}
  }
  function fechar() {
    if (!det || det.hidden) return; det.hidden = true; document.documentElement.classList.remove("trava");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    if (voltaFoco && voltaFoco.focus) voltaFoco.focus();
  }
  function trocaCor(k) {
    var p = lista[atual]; corIdx = k;
    $$(".swb", det).forEach(function (b, n) { b.setAttribute("aria-pressed", n === k); }); $(".cnome", det).textContent = p.cores[k];
    montaArte($(".artbox.big", det), p, k);
    var s = $(".swing2", det); s.classList.remove("troca"); void s.offsetWidth; s.classList.add("troca");
  }
  function comprar(agora) {
    var p = lista[atual], m = $(".dmsg", det);
    if ((p.tamanhos || []).length && !tamSel) { m.textContent = "Escolha um tamanho."; m.className = "dmsg erro"; var b = $(".tg button:not([disabled])", det); if (b) b.focus(); return; }
    C().adicionar(p.id, tamSel, (p.cores && p.cores[corIdx]) || "", Math.max(1, Math.min(10, +$(".dq", det).value || 1)));
    $("#detN", det).textContent = $("#cartN").textContent;
    if (agora) { fechar(); C().abrirCheckout(); return; }
    m.className = "dmsg ok"; m.textContent = "Adicionado ao carrinho ✓";
    var n = $("#detN", det); n.classList.remove("bump"); void n.offsetWidth; n.classList.add("bump");
  }
  document.addEventListener("keydown", function (e) {
    if (!det || det.hidden) return;
    if (e.key === "Escape") fechar(); else if (e.key === "ArrowLeft") abrir(atual - 1, true); else if (e.key === "ArrowRight") abrir(atual + 1, true);
    else if (e.key === "Tab") {
      var f = $$("button:not([disabled]),a[href],input", det).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  window.Vitrine = { render: render, abrir: abrir, fechar: fechar };
})();
