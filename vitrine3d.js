/* VITRINE 3D "TRY THE LOOK" — Carrossel de modelos com profundidade de campo (desfoque lateral),
   modo foco isolado ao clicar no modelo e painel lateral sincronizado com cores, tamanhos e sacola. */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var C = function () { return window.LojaCore; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var host = $("#vitrine");
  var looks = [], centerIdx = 0, focused = false;
  var selecao = {}; // { [lookIdx_pieceIdx]: { corIdx: 0, tam: "M" } }
  var dragStartX = null, dragMoved = false;

  /* ---------- Paleta e ilustração de peças/modelos ---------- */
  var HEX = {
    preta: "#15181e", preto: "#15181e", branca: "#f0f2f5", branco: "#f0f2f5",
    cinza: "#8c939e", chumbo: "#393e46", grafite: "#2a2e35",
    vermelha: "#c1272d", vermelho: "#c1272d", azul: "#1f4fb4", marinho: "#14213d",
    verde: "#1e7a4a", amarela: "#e6b800", amarelo: "#e6b800", laranja: "#e8742a",
    rosa: "#e86a9a", roxa: "#6b3fa0", roxo: "#6b3fa0", bege: "#d8c8a8",
    marrom: "#6b4a2f", prata: "#c4c9d2", off: "#e8e4da"
  };

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function hexDe(nome) {
    var n = norm(nome), m = /#([0-9a-f]{6})/.exec(n);
    if (m) return "#" + m[1];
    var w = n.split(/[^a-z]+/).filter(Boolean);
    for (var i = 0; i < w.length; i++) if (HEX[w[i]]) return HEX[w[i]];
    return "#1c2028";
  }
  function claro(hex) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex);
    if (!m) return false;
    return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255 > 0.62;
  }
  function tipoDe(p) {
    var s = norm((p.nome || "") + " " + (p.categoria || ""));
    if (/regata|tank/.test(s)) return "regata";
    if (/short|bermuda/.test(s)) return "shorts";
    if (/moletom|casaco|jaqueta|hoodie/.test(s)) return "moletom";
    if (/bone|viseira/.test(s)) return "bone";
    if (/legging|calca/.test(s)) return "calca";
    return "camiseta";
  }

  var FORMAS = {
    camiseta: "M60 20L10 55L30 92L55 80V200H145V80L170 92L190 55L140 20Q100 46 60 20Z",
    regata: "M62 18V56Q62 82 42 102L48 200H152L158 102Q138 82 138 56V18H118Q100 52 82 18Z",
    shorts: "M42 20H158L172 150H108L100 84L92 150H28Z",
    moletom: "M72 20Q100 4 128 20L172 42L192 150L164 158L154 104V204H46V104L36 158L8 150L28 42Z",
    calca: "M60 12H140L150 44L130 206H106L100 74L94 206H70L50 44Z",
    bone: "M28 112Q28 42 100 42Q172 42 172 112V122H28Z"
  };
  var WOLF = "M10 260L32 205C40 172 62 150 80 132L76 98L84 58L102 90L120 78L166 30L174 34L172 40L143 67L172 55L170 62L133 100L142 112L134 120L148 130L140 142L156 152L150 166L162 176L176 222L178 260Z";

  function pecaSvg(p, cor) {
    var t = tipoDe(p), hex = hexDe(cor), logoFill = claro(hex) ? "#111318" : "#d8dee6";
    var s = '<svg viewBox="0 0 200 220" aria-hidden="true">';
    if (t === "bone") s += '<path d="M14 124Q100 158 186 124L198 138Q100 188 2 138Z" fill="' + hex + '" stroke="rgba(255,255,255,.15)" stroke-width="1.5"/>';
    s += '<path d="' + FORMAS[t] + '" fill="' + hex + '" stroke="rgba(255,255,255,.16)" stroke-width="1.5" stroke-linejoin="round"/>';
    s += '<svg x="78" y="76" width="44" height="52" viewBox="0 0 220 260"><path d="' + WOLF + '" fill="' + logoFill + '"/></svg>';
    return s + "</svg>";
  }

  /* Modelo de corpo inteiro vestindo o look (usado quando não há foto de modelo cadastrada) */
  function modeloLookSvg(look, lookIdx) {
    var topPeca = look.pecas[0];
    var botPeca = look.pecas.filter(function (x) { return tipoDe(x) === "shorts" || tipoDe(x) === "calca"; })[0];
    var capPeca = look.pecas.filter(function (x) { return tipoDe(x) === "bone"; })[0];

    var stTop = getSel(lookIdx, 0, topPeca);
    var topHex = hexDe((topPeca.cores && topPeca.cores[stTop.corIdx]) || "Preta");
    var topTipo = tipoDe(topPeca);
    var logoFill = claro(topHex) ? "#111318" : "#e2e7ee";

    var botIdx = botPeca ? look.pecas.indexOf(botPeca) : -1;
    var stBot = botPeca ? getSel(lookIdx, botIdx, botPeca) : { corIdx: 0 };
    var botHex = botPeca ? hexDe((botPeca.cores && botPeca.cores[stBot.corIdx]) || "Grafite") : "#1b1f27";

    var capIdx = capPeca ? look.pecas.indexOf(capPeca) : -1;
    var stCap = capPeca ? getSel(lookIdx, capIdx, capPeca) : { corIdx: 0 };
    var capHex = capPeca ? hexDe((capPeca.cores && capPeca.cores[stCap.corIdx]) || "Preto") : "";

    var skin = ["#c89674", "#8d5b3c", "#dfa988", "#6d442c"][lookIdx % 4];
    var s = '<svg viewBox="0 0 260 520" aria-hidden="true">';
    // Sombra no chão do estúdio
    s += '<ellipse cx="130" cy="504" rx="68" ry="10" fill="rgba(0,0,0,.38)"/>';
    // Pernas e tênis esportivos
    s += '<path d="M98 310 L92 468 L114 468 L122 310 Z" fill="' + skin + '"/>';
    s += '<path d="M138 310 L146 468 L168 468 L162 310 Z" fill="' + skin + '"/>';
    s += '<path d="M84 466 Q102 460 118 468 L122 494 L76 494 Q76 476 84 466 Z" fill="#f1f3f6"/>';
    s += '<path d="M142 468 Q158 460 176 466 Q184 476 184 494 L138 494 Z" fill="#f1f3f6"/>';
    s += '<rect x="76" y="488" width="46" height="7" rx="3" fill="#2a2f38"/><rect x="138" y="488" width="46" height="7" rx="3" fill="#2a2f38"/>';
    // Braços atléticos
    s += '<path d="M74 128 L52 248 L70 254 L88 152 Z" fill="' + skin + '"/>';
    s += '<path d="M186 128 L208 248 L190 254 L172 152 Z" fill="' + skin + '"/>';
    // Pescoço e cabeça
    s += '<rect x="118" y="84" width="24" height="28" rx="10" fill="' + skin + '"/>';
    s += '<ellipse cx="130" cy="62" rx="23" ry="28" fill="' + skin + '"/>';
    s += '<path d="M107 56 Q108 30 130 30 Q152 30 153 56 Q146 42 130 42 Q114 42 107 56 Z" fill="#14161b"/>';
    if (capPeca) {
      s += '<path d="M105 48 Q130 24 155 48 Z" fill="' + capHex + '"/>';
      s += '<path d="M104 48 Q130 56 164 50 L158 55 Q130 61 104 52 Z" fill="' + capHex + '" stroke="rgba(255,255,255,.2)" stroke-width="1"/>';
    }
    // Shorts / Calça
    if (botPeca && tipoDe(botPeca) === "calca") {
      s += '<path d="M90 238 H170 L172 470 H142 L130 305 L118 470 H88 Z" fill="' + botHex + '" stroke="rgba(255,255,255,.14)" stroke-width="1.5"/>';
    } else {
      s += '<path d="M90 238 H170 L178 344 H135 L130 286 L125 344 H82 Z" fill="' + botHex + '" stroke="rgba(255,255,255,.14)" stroke-width="1.5"/>';
    }
    // Peça superior (Camiseta, Regata ou Moletom)
    if (topTipo === "regata") {
      s += '<path d="M96 106 H112 Q130 134 148 106 H164 L172 246 H88 Z" fill="' + topHex + '" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>';
    } else if (topTipo === "moletom") {
      s += '<path d="M94 104 Q130 122 166 104 L194 126 L210 246 L186 252 L172 164 V252 H88 V164 L74 252 L50 246 L66 126 Z" fill="' + topHex + '" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>';
    } else {
      s += '<path d="M94 106 Q130 126 166 106 L196 132 L182 166 L168 156 V248 H92 V156 L78 166 L64 132 Z" fill="' + topHex + '" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>';
    }
    // Logo Lobo Team Lobo no peito
    s += '<svg x="112" y="148" width="36" height="42" viewBox="0 0 220 260"><path d="' + WOLF + '" fill="' + logoFill + '"/></svg>';
    return s + "</svg>";
  }

  /* ---------- Montagem dos Looks a partir dos produtos ---------- */
  function montarLooks(produtos) {
    if (!produtos.length) return [];
    var bottoms = produtos.filter(function (p) { var t = tipoDe(p); return t === "shorts" || t === "calca"; });
    var tops = produtos.filter(function (p) { var t = tipoDe(p); return t !== "shorts" && t !== "calca"; });
    if (!tops.length) tops = produtos.slice();

    return tops.map(function (top, idx) {
      var pecas = [top];
      if (bottoms.length) pecas.push(bottoms[idx % bottoms.length]);
      var titulo = top.look || ("Look " + top.nome.replace(/\s*\(exemplo\)/i, ""));
      var total = pecas.reduce(function (s, x) { return s + x.preco; }, 0);
      return { id: top.id, titulo: titulo, novo: top.novo, pecas: pecas, total: total };
    });
  }

  function getSel(lIdx, pIdx, p) {
    var key = lIdx + "_" + pIdx;
    if (!selecao[key]) {
      var tams = (p && p.tamanhos) || [];
      selecao[key] = { corIdx: 0, tam: tams[0] || "" };
    }
    return selecao[key];
  }

  /* ---------- Renderização do Estúdio 3D ---------- */
  function render(produtos) {
    looks = montarLooks(produtos);
    centerIdx = Math.min(centerIdx, Math.max(0, looks.length - 1));
    focused = false;

    if (!looks.length) {
      host.innerHTML = '<p class="vazio">Nenhuma peça encontrada para esse filtro.</p>';
      return;
    }

    host.innerHTML =
      '<div class="look-studio">' +
        '<div class="look-stage" id="lookStage">' +
          '<div class="stage-top">' +
            '<button type="button" class="back-looks" id="btnBackLooks" hidden>← Voltar aos looks</button>' +
            '<span class="stage-hint" id="stageHint">Deslize ou clique no modelo para focar</span>' +
          '</div>' +
          '<div class="look-track" id="lookTrack" role="region" aria-label="Carrossel 3D de looks"></div>' +
          '<div class="stage-foot">' +
            '<button type="button" class="nav-arrow" id="prevLook" aria-label="Look anterior">‹</button>' +
            '<div class="dots" id="lookDots"></div>' +
            '<button type="button" class="nav-arrow" id="nextLook" aria-label="Próximo look">›</button>' +
          '</div>' +
        '</div>' +
        '<aside class="look-panel" id="lookPanel" aria-label="Peças do look selecionado"></aside>' +
      '</div>';

    var track = $("#lookTrack", host);
    track.innerHTML = looks.map(function (lk, i) {
      return '<button type="button" class="look-card" data-look="' + i + '" aria-label="' + esc(lk.titulo) + '">' +
        (lk.novo ? '<span class="look-badge">Novo</span>' : "") +
        '<div class="model-box" id="mbox-' + i + '"></div>' +
      '</button>';
    }).join("");

    $("#lookDots", host).innerHTML = looks.map(function (lk, i) {
      return '<button type="button" class="dot" data-dot="' + i + '" aria-label="Ver ' + esc(lk.titulo) + '"></button>';
    }).join("");

    bindEvents();
    atualizarTudo();
  }

  function atualizarModelos() {
    looks.forEach(function (lk, i) {
      var box = $("#mbox-" + i, host);
      if (!box) return;
      var top = lk.pecas[0];
      var st = getSel(i, 0, top);
      var fotos = top.fotos || [];
      var url = ((top.cores || []).length > 1 && fotos.length === top.cores.length) ? fotos[st.corIdx] : fotos[0];
      if (url) {
        var im = new Image();
        im.alt = lk.titulo;
        im.onerror = function () { box.innerHTML = modeloLookSvg(lk, i); };
        box.innerHTML = "";
        box.appendChild(im);
        im.src = url;
      } else {
        box.innerHTML = modeloLookSvg(lk, i);
      }
    });
  }

  function atualizarPosicoes3D() {
    var stage = $("#lookStage", host);
    if (!stage) return;
    stage.classList.toggle("is-focused", focused);
    $("#btnBackLooks", host).hidden = !focused;
    $("#stageHint", host).textContent = focused ? "Modo foco · Escolha cor e tamanho ao lado" : "Clique no modelo central para focar";

    var mobile = window.innerWidth <= 860;
    var stepX = mobile ? 145 : 195;

    $$(".look-card", host).forEach(function (card, i) {
      var off = i - centerIdx;
      var abs = Math.abs(off);
      var isCenter = off === 0;
      card.classList.toggle("is-center", isCenter);
      card.style.zIndex = String(20 - abs);

      if (focused) {
        card.style.setProperty("--tx", isCenter ? "0px" : (off * stepX * 1.4) + "px");
        card.style.setProperty("--tz", isCenter ? "20px" : "-220px");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--sc", isCenter ? "1.06" : "0.75");
        card.style.setProperty("--op", isCenter ? "1" : "0");
        card.style.setProperty("--bl", isCenter ? "0px" : "10px");
        card.style.pointerEvents = isCenter ? "auto" : "none";
      } else {
        var tx = off * stepX;
        var tz = -abs * 130;
        var ry = reduce ? 0 : Math.max(-28, Math.min(28, -off * 14));
        var sc = Math.max(0.66, 1 - abs * 0.16);
        var op = abs > 2 ? 0 : Math.max(0.45, 1 - abs * 0.24);
        var bl = reduce ? 0 : Math.min(7, abs * 3.2);
        card.style.setProperty("--tx", tx + "px");
        card.style.setProperty("--tz", tz + "px");
        card.style.setProperty("--ry", ry + "deg");
        card.style.setProperty("--sc", sc.toFixed(3));
        card.style.setProperty("--op", op.toFixed(2));
        card.style.setProperty("--bl", bl.toFixed(1) + "px");
        card.style.pointerEvents = abs > 2 ? "none" : "auto";
      }
    });

    $$(".dot", host).forEach(function (d, i) {
      d.setAttribute("aria-current", i === centerIdx ? "true" : "false");
    });
  }

  function atualizarPainel() {
    var panel = $("#lookPanel", host);
    var lk = looks[centerIdx];
    if (!panel || !lk) return;

    var pecasHtml = lk.pecas.map(function (p, pIdx) {
      var st = getSel(centerIdx, pIdx, p);
      var cores = p.cores || [];
      var tams = p.tamanhos || [];
      var corAtual = cores[st.corIdx] || "";
      var fotos = p.fotos || [];
      var thumbUrl = (cores.length > 1 && fotos.length === cores.length) ? fotos[st.corIdx] : fotos[0];

      var swHtml = cores.length ? '<div class="sw-row">' + cores.map(function (c, k) {
        return '<button type="button" class="sw-dot" data-p="' + pIdx + '" data-cor="' + k + '" aria-label="Cor ' + esc(c) + '" aria-pressed="' + (k === st.corIdx) + '" style="--c:' + hexDe(c) + '"></button>';
      }).join("") + "</div>" : "";

      var tamHtml = tams.length ? '<div class="tam-row">' + tams.map(function (t) {
        return '<button type="button" class="tam-pill" data-p="' + pIdx + '" data-tam="' + esc(t) + '" aria-pressed="' + (t === st.tam) + '">' + esc(t) + "</button>";
      }).join("") + "</div>" : "";

      return '<div class="piece-card">' +
        '<div class="piece-thumb" data-thumb="' + pIdx + '">' + (thumbUrl ? '<img src="' + esc(thumbUrl) + '" alt="' + esc(p.nome) + '">' : pecaSvg(p, corAtual)) + '</div>' +
        '<div class="piece-body">' +
          '<div class="piece-top"><span class="piece-name">' + esc(p.nome) + '</span><span class="piece-price">' + C().money(p.preco) + '</span></div>' +
          '<div class="piece-controls">' + swHtml + tamHtml + '</div>' +
          '<div class="piece-foot">' +
            '<span class="piece-var">' + esc([corAtual, st.tam].filter(Boolean).join(" · ") || "Tamanho único") + '</span>' +
            '<button type="button" class="add-one" data-addone="' + pIdx + '">+ Adicionar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    panel.innerHTML =
      '<div>' +
        '<div class="panel-head">' +
          '<div>' +
            '<span class="panel-kicker">Look ' + (centerIdx + 1) + ' de ' + looks.length + '</span>' +
            '<h2 class="panel-title">' + esc(lk.titulo) + '</h2>' +
            '<p class="panel-sub">' + lk.pecas.length + (lk.pecas.length > 1 ? ' peças combinadas' : ' peça selecionada') + '</p>' +
          '</div>' +
          '<span class="panel-total">' + C().money(lk.total) + '</span>' +
        '</div>' +
        '<div class="piece-list">' + pecasHtml + '</div>' +
      '</div>' +
      '<div class="panel-foot">' +
        '<p class="panel-msg" id="panelMsg" role="status"></p>' +
        '<div class="panel-actions">' +
          '<button type="button" class="btn" id="addLookBtn">Adicionar look à sacola</button>' +
          '<button type="button" class="btn ghost" id="buyLookBtn">Comprar</button>' +
        '</div>' +
      '</div>';

    // Fallback se alguma imagem real falhar ao carregar
    $$(".piece-thumb img", panel).forEach(function (im) {
      im.onerror = function () {
        var idx = +im.parentNode.dataset.thumb;
        var p = lk.pecas[idx];
        var st = getSel(centerIdx, idx, p);
        im.parentNode.innerHTML = pecaSvg(p, (p.cores && p.cores[st.corIdx]) || "");
      };
    });
  }

  function atualizarTudo() {
    atualizarModelos();
    atualizarPosicoes3D();
    atualizarPainel();
  }

  function irPara(idx) {
    if (!looks.length) return;
    centerIdx = (idx + looks.length) % looks.length;
    atualizarPosicoes3D();
    atualizarPainel();
  }

  function bindEvents() {
    var track = $("#lookTrack", host);

    // Clique nos modelos 3D: lateral traz para o centro; central ativa modo foco isolado
    host.addEventListener("click", function (e) {
      if (dragMoved) { dragMoved = false; return; }

      var card = e.target.closest(".look-card");
      if (card) {
        var idx = +card.dataset.look;
        if (idx !== centerIdx) {
          focused = false;
          irPara(idx);
        } else {
          focused = !focused;
          atualizarPosicoes3D();
        }
        return;
      }

      if (e.target.closest("#btnBackLooks")) {
        focused = false;
        atualizarPosicoes3D();
        return;
      }
      if (e.target.closest("#prevLook")) { irPara(centerIdx - 1); return; }
      if (e.target.closest("#nextLook")) { irPara(centerIdx + 1); return; }

      var dot = e.target.closest("[data-dot]");
      if (dot) { irPara(+dot.dataset.dot); return; }

      // Troca de cor no painel
      var sw = e.target.closest("[data-cor]");
      if (sw) {
        var pIdx = +sw.dataset.p, cIdx = +sw.dataset.cor;
        var st = getSel(centerIdx, pIdx, looks[centerIdx].pecas[pIdx]);
        st.corIdx = cIdx;
        atualizarModelos();
        atualizarPainel();
        return;
      }

      // Troca de tamanho no painel
      var tm = e.target.closest("[data-tam]");
      if (tm) {
        var pIdx2 = +tm.dataset.p;
        var st2 = getSel(centerIdx, pIdx2, looks[centerIdx].pecas[pIdx2]);
        st2.tam = tm.dataset.tam;
        atualizarPainel();
        return;
      }

      // Adicionar uma peça individual
      var addOne = e.target.closest("[data-addone]");
      if (addOne) {
        var pIdx3 = +addOne.dataset.addone;
        var peca = looks[centerIdx].pecas[pIdx3];
        var st3 = getSel(centerIdx, pIdx3, peca);
        C().adicionar(peca.id, st3.tam, (peca.cores && peca.cores[st3.corIdx]) || "", 1);
        addOne.textContent = "✓ Na sacola";
        addOne.classList.add("added");
        var msg = $("#panelMsg", host);
        if (msg) { msg.className = "panel-msg ok"; msg.textContent = peca.nome + " adicionada à sacola!"; }
        setTimeout(function () { if (addOne) { addOne.textContent = "+ Adicionar"; addOne.classList.remove("added"); } }, 1400);
        return;
      }

      // Adicionar look completo ou comprar direto
      if (e.target.closest("#addLookBtn") || e.target.closest("#buyLookBtn")) {
        var buyNow = !!e.target.closest("#buyLookBtn");
        var lk = looks[centerIdx];
        lk.pecas.forEach(function (peca, idx) {
          var st = getSel(centerIdx, idx, peca);
          C().adicionar(peca.id, st.tam, (peca.cores && peca.cores[st.corIdx]) || "", 1);
        });
        if (buyNow) {
          C().abrirCheckout();
        } else {
          var msg2 = $("#panelMsg", host);
          if (msg2) { msg2.className = "panel-msg ok"; msg2.textContent = "Look completo adicionado à sacola ✓"; }
        }
      }
    });

    // Arraste por mouse e dedo (swipe horizontal no celular)
    track.addEventListener("pointerdown", function (e) {
      dragStartX = e.clientX;
      dragMoved = false;
    });
    track.addEventListener("pointermove", function (e) {
      if (dragStartX == null) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 36) {
        dragMoved = true;
        dragStartX = e.clientX;
        irPara(centerIdx + (dx < 0 ? 1 : -1));
      }
    });
    var endDrag = function () { dragStartX = null; };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", atualizarPosicoes3D);
  }

  document.addEventListener("keydown", function (e) {
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "Escape" && focused) { focused = false; atualizarPosicoes3D(); }
    else if (e.key === "ArrowLeft") irPara(centerIdx - 1);
    else if (e.key === "ArrowRight") irPara(centerIdx + 1);
  });

  window.Vitrine = { render: render };
})();
