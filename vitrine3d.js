/* VITRINE 3D WEBGL (THREE.JS) — Team Lobo Store
   - Deslize Esquerda / Direita: navega entre as 4 roupas com profundidade de campo e desfoque lateral.
   - Deslize Cima / Baixo (ou toque no botão/peça): gira a roupa 180° em 3D para mostrar Frente e Costas.
   - Inclui modelagem 3D fiel do Conjunto Top e Short Team Lobo (com estampa frontal, brasão na perna e recorte traseiro). */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var C = function () { return window.LojaCore; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var host = $("#vitrine");
  var lista = [], centerIdx = 0, isBack = false, dragRotOffset = 0;
  var selecao = {}; // { [id]: { corIdx: 0, tam: "M" } }
  var scenes = [], rafId = 0;

  /* ---------- Paleta de cores ---------- */
  var HEX = {
    preta: "#14161b", preto: "#14161b", branca: "#f0f2f5", branco: "#f0f2f5",
    cinza: "#8c939e", chumbo: "#363b44", grafite: "#282c33",
    vermelha: "#b82329", vermelho: "#b82329", azul: "#1d4aa8", marinho: "#14213d",
    verde: "#1c7245", amarela: "#dfb100", amarelo: "#dfb100", laranja: "#e06d24",
    rosa: "#df6291", roxa: "#653b96", roxo: "#653b96", bege: "#d4c3a3",
    marrom: "#63442b", prata: "#c4c9d2", off: "#e8e4da"
  };

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function hexDe(nome) {
    var n = norm(nome), m = /#([0-9a-f]{6})/.exec(n);
    if (m) return "#" + m[1];
    var w = n.split(/[^a-z]+/).filter(Boolean);
    for (var i = 0; i < w.length; i++) if (HEX[w[i]]) return HEX[w[i]];
    return "#16181f";
  }
  function claro(hex) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex);
    if (!m) return false;
    return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255 > 0.62;
  }
  function tipoDe(p) {
    var s = norm((p.id || "") + " " + (p.nome || "") + " " + (p.categoria || ""));
    if (/conjunto|top/.test(s)) return "conjunto";
    if (/regata|tank/.test(s)) return "regata";
    if (/short|bermuda/.test(s)) return "shorts";
    if (/moletom|casaco|jaqueta/.test(s)) return "moletom";
    return "camiseta";
  }

  /* ---------- Texturas dinâmicas em Canvas para logos Team Lobo ---------- */
  function drawWolfMark(ctx, cx, cy, scale, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-45, 55);
    ctx.lineTo(-32, 15);
    ctx.lineTo(-10, -18);
    ctx.lineTo(-14, -42);
    ctx.lineTo(-5, -66);
    ctx.lineTo(8, -44);
    ctx.lineTo(22, -52);
    ctx.lineTo(52, -80);
    ctx.lineTo(56, -74);
    ctx.lineTo(36, -54);
    ctx.lineTo(55, -62);
    ctx.lineTo(30, -34);
    ctx.lineTo(36, -24);
    ctx.lineTo(28, -16);
    ctx.lineTo(38, -8);
    ctx.lineTo(32, 2);
    ctx.lineTo(44, 12);
    ctx.lineTo(38, 22);
    ctx.lineTo(48, 32);
    ctx.lineTo(54, 55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function makeTopFrontTexture(lightFabric) {
    var cv = document.createElement("canvas");
    cv.width = 512; cv.height = 256;
    var ctx = cv.getContext("2d");
    var ink = lightFabric ? "#121419" : "#f4f6f9";
    ctx.fillStyle = ink;
    ctx.font = "900 50px 'Barlow Condensed', Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText("TEAM", 224, 132);
    ctx.textAlign = "left";
    ctx.fillText("LOBO", 286, 132);
    drawWolfMark(ctx, 255, 132, 0.42, ink);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeShortCrestTexture(lightFabric) {
    var cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    var ctx = cv.getContext("2d");
    var ink = lightFabric ? "#121419" : "#f4f6f9";
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 122, 68, -Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
    // Barra de supino estilizada no topo
    ctx.fillStyle = ink;
    ctx.fillRect(62, 76, 132, 8);
    ctx.fillRect(54, 62, 10, 36);
    ctx.fillRect(192, 62, 10, 36);
    drawWolfMark(ctx, 128, 126, 0.56, ink);
    ctx.font = "900 26px 'Barlow Condensed', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TEAM LOBO", 128, 222);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeChestCrestTexture(lightFabric) {
    var cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    var ctx = cv.getContext("2d");
    var ink = lightFabric ? "#121419" : "#e6ebf2";
    drawWolfMark(ctx, 128, 108, 0.85, ink);
    ctx.fillStyle = ink;
    ctx.font = "900 32px 'Barlow Condensed', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TEAM LOBO", 128, 200);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ---------- Construtores de Malhas 3D Reais (Frente & Costas) ---------- */
  function buildGarment3D(tipo, hexColor) {
    var group = new THREE.Group();
    var isLight = claro(hexColor);
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
    var seamMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor).multiplyScalar(isLight ? 0.86 : 1.35),
      roughness: 0.8,
      metalness: 0.05
    });

    if (tipo === "conjunto") {
      /* === 1. TOP CROPPED DE ALCINHA (Frente + Costas + Alças) === */
      var topGeo = new THREE.CylinderGeometry(0.58, 0.52, 0.62, 48, 16, true);
      var pos = topGeo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        // Achatamento anatômico do tronco (mais largo no eixo X, mais fino no eixo Z)
        z *= 0.64;
        // Volume frontal do busto (z > 0) e costas retas (z < 0)
        if (z > 0) {
          var bust = Math.exp(-Math.pow((Math.abs(x) - 0.22) / 0.22, 2)) * Math.exp(-Math.pow(y / 0.22, 2));
          z += bust * 0.14;
        } else {
          // Costas levemente cavadas na parte superior
          if (y > 0.15) y -= 0.04 * (1 - Math.abs(x) / 0.58);
        }
        pos.setXYZ(i, x, y, z);
      }
      topGeo.computeVertexNormals();
      var topMesh = new THREE.Mesh(topGeo, mat);
      topMesh.position.y = 0.86;
      group.add(topMesh);

      // Elástico inferior do top
      var hemGeo = new THREE.TorusGeometry(0.51, 0.022, 12, 48);
      hemGeo.rotateX(Math.PI / 2);
      hemGeo.scale(1, 1, 0.64);
      var hemMesh = new THREE.Mesh(hemGeo, seamMat);
      hemMesh.position.y = 0.56;
      group.add(hemMesh);

      // Duas alças finas (frente -> ombro -> costas)
      [-0.34, 0.34].forEach(function (sx) {
        var curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 1.14, 0.29),
          new THREE.Vector3(sx * 0.96, 1.46, 0.12),
          new THREE.Vector3(sx * 0.94, 1.47, -0.10),
          new THREE.Vector3(sx * 0.95, 1.12, -0.30)
        ]);
        var strapGeo = new THREE.TubeGeometry(curve, 24, 0.017, 8, false);
        group.add(new THREE.Mesh(strapGeo, mat));
      });

      // Estampa frontal "TEAM [Lobo] LOBO" curvada no busto
      var logoGeo = new THREE.CylinderGeometry(0.61, 0.59, 0.34, 32, 1, true, -0.58, 1.16);
      var lPos = logoGeo.attributes.position;
      for (var j = 0; j < lPos.count; j++) {
        var lx = lPos.getX(j), ly = lPos.getY(j), lz = lPos.getZ(j) * 0.66;
        var lb = Math.exp(-Math.pow((Math.abs(lx) - 0.22) / 0.22, 2)) * Math.exp(-Math.pow(ly / 0.22, 2));
        lPos.setXYZ(j, lx, ly, lz + lb * 0.145 + 0.012);
      }
      logoGeo.computeVertexNormals();
      var logoMat = new THREE.MeshBasicMaterial({ map: makeTopFrontTexture(isLight), transparent: true, depthWrite: false });
      var logoMesh = new THREE.Mesh(logoGeo, logoMat);
      logoMesh.position.y = 0.86;
      group.add(logoMesh);

      /* === 2. SHORT CINTURA ALTA EMPINA BUMBUM (Frente + Costas com Scrunch) === */
      var waistGeo = new THREE.CylinderGeometry(0.51, 0.64, 0.64, 48, 20, true);
      var wPos = waistGeo.attributes.position;
      for (var k = 0; k < wPos.count; k++) {
        var wx = wPos.getX(k), wy = wPos.getY(k), wz = wPos.getZ(k);
        wz *= 0.66;
        // Volume anatômico dos glúteos nas costas (wz < 0) + vinco central (empina bumbum)
        if (wz < 0 && wy < 0.08) {
          var glute = Math.exp(-Math.pow((Math.abs(wx) - 0.24) / 0.24, 2)) * Math.exp(-Math.pow((wy + 0.12) / 0.22, 2));
          var scrunch = Math.exp(-Math.pow(wx / 0.055, 2)) * Math.exp(-Math.pow((wy + 0.10) / 0.24, 2));
          wz -= glute * 0.19;
          wz += scrunch * 0.09; // sulco central traseiro
        }
        wPos.setXYZ(k, wx, wy, wz);
      }
      waistGeo.computeVertexNormals();
      var waistMesh = new THREE.Mesh(waistGeo, mat);
      waistMesh.position.y = 0.02;
      group.add(waistMesh);

      // Costura em V do cós traseiro + costura vertical do scrunch
      var vCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.48, 0.12, -0.18),
        new THREE.Vector3(0, 0.03, -0.43),
        new THREE.Vector3(0.48, 0.12, -0.18)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(vCurve, 24, 0.011, 8, false), seamMat));

      var scrunchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.03, -0.43),
        new THREE.Vector3(0, -0.12, -0.37),
        new THREE.Vector3(0, -0.28, -0.39)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(scrunchCurve, 16, 0.013, 8, false), seamMat));

      // Pernas do short (esquerda e direita)
      [-0.27, 0.27].forEach(function (lx, idx) {
        var legGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.56, 32, 8, true);
        legGeo.scale(1, 1, 0.88);
        var legMesh = new THREE.Mesh(legGeo, mat);
        legMesh.position.set(lx, -0.52, -0.02);
        legMesh.rotation.z = idx === 0 ? -0.05 : 0.05;
        group.add(legMesh);
      });

      // Brasão circular TEAM LOBO na coxa esquerda (visível de frente)
      var crestGeo = new THREE.CylinderGeometry(0.275, 0.26, 0.34, 24, 1, true, -0.45, 0.9);
      crestGeo.scale(1, 1, 0.9);
      var crestMat = new THREE.MeshBasicMaterial({ map: makeShortCrestTexture(isLight), transparent: true, depthWrite: false });
      var crestMesh = new THREE.Mesh(crestGeo, crestMat);
      crestMesh.position.set(0.27, -0.49, 0.005);
      crestMesh.rotation.set(0, 0.22, 0.05);
      group.add(crestMesh);

    } else if (tipo === "camiseta" || tipo === "regata") {
      /* === CAMISETA OU REGATA ESPORTIVA === */
      var bodyGeo = new THREE.CylinderGeometry(0.62, 0.56, 1.55, 44, 16, true);
      bodyGeo.scale(1, 1, 0.62);
      var bodyMesh = new THREE.Mesh(bodyGeo, mat);
      bodyMesh.position.y = 0.25;
      group.add(bodyMesh);

      // Gola
      var collarGeo = new THREE.TorusGeometry(0.26, 0.03, 12, 32);
      collarGeo.rotateX(Math.PI / 2.2);
      var collar = new THREE.Mesh(collarGeo, seamMat);
      collar.position.set(0, 1.02, 0.04);
      group.add(collar);

      if (tipo === "camiseta") {
        [-0.74, 0.74].forEach(function (sx, idx) {
          var slv = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.58, 24, 1, true), mat);
          slv.position.set(sx, 0.76, 0);
          slv.rotation.z = idx === 0 ? 0.56 : -0.56;
          group.add(slv);
        });
      }

      // Estampa no peito
      var cGeo = new THREE.CylinderGeometry(0.635, 0.62, 0.48, 28, 1, true, -0.45, 0.9);
      cGeo.scale(1, 1, 0.63);
      var cMat = new THREE.MeshBasicMaterial({ map: makeChestCrestTexture(isLight), transparent: true, depthWrite: false });
      var cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.y = 0.54;
      group.add(cMesh);

    } else {
      /* === SHORTS DE TREINO === */
      var sWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.60, 0.42, 40, 1, true), mat);
      sWaist.scale.set(1, 1, 0.66);
      sWaist.position.y = 0.46;
      group.add(sWaist);

      [-0.29, 0.29].forEach(function (lx, idx) {
        var sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.29, 0.68, 28, 1, true), mat);
        sLeg.scale.set(1, 1, 0.85);
        sLeg.position.set(lx, -0.05, 0);
        sLeg.rotation.z = idx === 0 ? -0.06 : 0.06;
        group.add(sLeg);
      });

      var scGeo = new THREE.CylinderGeometry(0.315, 0.30, 0.34, 24, 1, true, -0.4, 0.8);
      scGeo.scale(1, 1, 0.86);
      var scMat = new THREE.MeshBasicMaterial({ map: makeShortCrestTexture(isLight), transparent: true, depthWrite: false });
      var scMesh = new THREE.Mesh(scGeo, scMat);
      scMesh.position.set(0.29, -0.14, 0.01);
      scMesh.rotation.y = 0.22;
      group.add(scMesh);
    }

    return group;
  }

  /* ---------- Gerenciamento dos Renderizadores WebGL ---------- */
  function disposeScenes() {
    cancelAnimationFrame(rafId);
    scenes.forEach(function (s) { if (s.renderer) s.renderer.dispose(); });
    scenes = [];
  }

  function createCardViewer(container, p, idx) {
    if (!window.THREE) {
      container.innerHTML = '<div style="padding:1rem;text-align:center"><b>' + esc(p.nome) + '</b></div>';
      return null;
    }
    var w = 320, h = 460;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 20);
    camera.position.set(0, 0.18, 4.35);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    var key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(2.2, 3.2, 3.5);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xdbeafe, 0.85);
    rim.position.set(-2.5, 2.0, -3.2);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(0, -2.5, 2.0);
    scene.add(fill);

    var st = getSel(p);
    var corInicial = (p.cores && p.cores[st.corIdx]) || "Preto";
    var tipo = tipoDe(p);
    var pivot = new THREE.Group();
    pivot.add(buildGarment3D(tipo, hexDe(corInicial)));
    scene.add(pivot);

    return {
      idx: idx,
      produto: p,
      tipo: tipo,
      renderer: renderer,
      scene: scene,
      camera: camera,
      pivot: pivot,
      currentRotY: 0,
      setColor: function (hex) {
        while (pivot.children.length) pivot.remove(pivot.children[0]);
        pivot.add(buildGarment3D(tipo, hex));
      }
    };
  }

  function animateLoop(t) {
    rafId = requestAnimationFrame(animateLoop);
    var sec = (t || 0) * 0.001;
    scenes.forEach(function (sc) {
      var isCenter = sc.idx === centerIdx;
      var targetY = (isCenter && isBack ? Math.PI : 0) + (isCenter ? dragRotOffset : 0);
      sc.currentRotY += (targetY - sc.currentRotY) * 0.16;
      sc.pivot.rotation.y = sc.currentRotY;
      // Flutuação sutil de estúdio na peça em destaque
      sc.pivot.position.y = isCenter && !reduce ? Math.sin(sec * 2.1) * 0.035 : 0;
      sc.renderer.render(sc.scene, sc.camera);
    });
  }

  function getSel(p) {
    if (!selecao[p.id]) {
      var tams = p.tamanhos || [];
      selecao[p.id] = { corIdx: 0, tam: tams[0] || "" };
    }
    return selecao[p.id];
  }

  /* ---------- Renderização Principal da Vitrine ---------- */
  function render(produtos) {
    disposeScenes();
    lista = produtos;
    centerIdx = Math.min(centerIdx, Math.max(0, lista.length - 1));
    isBack = false;
    dragRotOffset = 0;

    if (!lista.length) {
      host.innerHTML = '<p class="vazio">Nenhuma peça encontrada.</p>';
      return;
    }

    host.innerHTML =
      '<div class="look-studio">' +
        '<div class="look-stage" id="lookStage">' +
          '<div class="stage-top">' +
            '<button type="button" class="side-pill" id="btnFlipSide" aria-label="Virar peça frente e costas"><span class="side-dot"></span><span id="sideLabel">Vista: Frente · Girar ↻</span></button>' +
            '<span class="stage-hint">← → Troca peça · ↑ ↓ Vira costas</span>' +
          '</div>' +
          '<div class="look-track" id="lookTrack" role="region" aria-label="Palco 3D interativo"></div>' +
          '<div class="stage-foot">' +
            '<button type="button" class="nav-arrow" id="prevLook" aria-label="Peça anterior">‹</button>' +
            '<div class="dots" id="lookDots"></div>' +
            '<button type="button" class="nav-arrow" id="nextLook" aria-label="Próxima peça">›</button>' +
          '</div>' +
        '</div>' +
        '<aside class="look-panel" id="lookPanel" aria-label="Detalhes da peça selecionada"></aside>' +
      '</div>';

    var track = $("#lookTrack", host);
    track.innerHTML = lista.map(function (p, i) {
      return '<div class="look-card" role="button" tabindex="0" data-look="' + i + '" aria-label="' + esc(p.nome) + '">' +
        (p.novo ? '<span class="look-badge">Novo</span>' : "") +
        '<div class="model-box" id="mbox-' + i + '"></div>' +
      '</div>';
    }).join("");

    $("#lookDots", host).innerHTML = lista.map(function (p, i) {
      return '<button type="button" class="dot" data-dot="' + i + '" aria-label="Ver ' + esc(p.nome) + '"></button>';
    }).join("");

    lista.forEach(function (p, i) {
      var viewer = createCardViewer($("#mbox-" + i, host), p, i);
      if (viewer) scenes.push(viewer);
    });

    bindEvents();
    atualizarPosicoes3D();
    atualizarPainel();
    animateLoop(0);
  }

  function atualizarPosicoes3D() {
    var pill = $("#btnFlipSide", host);
    var lbl = $("#sideLabel", host);
    if (pill && lbl) {
      pill.classList.toggle("is-back", isBack);
      lbl.textContent = isBack ? "Vista: Costas · Ver frente ↻" : "Vista: Frente · Ver costas ↻";
    }

    var mobile = window.innerWidth <= 860;
    var stepX = mobile ? 145 : 200;

    $$(".look-card", host).forEach(function (card, i) {
      var off = i - centerIdx;
      var abs = Math.abs(off);
      card.style.zIndex = String(20 - abs);

      var tx = off * stepX;
      var tz = -abs * 140;
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
    });

    $$(".dot", host).forEach(function (d, i) {
      d.setAttribute("aria-current", i === centerIdx ? "true" : "false");
    });
  }

  function atualizarPainel() {
    var panel = $("#lookPanel", host);
    var p = lista[centerIdx];
    if (!panel || !p) return;

    var st = getSel(p);
    var cores = p.cores || [];
    var tams = p.tamanhos || [];
    var corAtual = cores[st.corIdx] || "";

    var swHtml = cores.length ? '<div class="piece-row"><span class="piece-label">Cor: <b>' + esc(corAtual) + '</b></span><div class="sw-row">' +
      cores.map(function (c, k) {
        return '<button type="button" class="sw-dot" data-cor="' + k + '" aria-label="Cor ' + esc(c) + '" aria-pressed="' + (k === st.corIdx) + '" style="--c:' + hexDe(c) + '"></button>';
      }).join("") + '</div></div>' : "";

    var tamHtml = tams.length ? '<div class="piece-row"><span class="piece-label">Tamanho</span><div class="tam-row">' +
      tams.map(function (t) {
        return '<button type="button" class="tam-pill" data-tam="' + esc(t) + '" aria-pressed="' + (t === st.tam) + '">' + esc(t) + '</button>';
      }).join("") + '</div></div>' : "";

    panel.innerHTML =
      '<div>' +
        '<div class="panel-head">' +
          '<div>' +
            '<span class="panel-kicker">Peça ' + (centerIdx + 1) + ' de ' + lista.length + (p.categoria ? ' · ' + esc(p.categoria) : '') + '</span>' +
            '<h2 class="panel-title">' + esc(p.nome) + '</h2>' +
            '<p class="panel-sub">' + esc(p.descricao || "") + '</p>' +
          '</div>' +
          '<span class="panel-total">' + C().money(p.preco) + '</span>' +
        '</div>' +
        '<div class="piece-card">' + swHtml + tamHtml + '</div>' +
      '</div>' +
      '<div class="panel-foot">' +
        '<p class="panel-msg" id="panelMsg" role="status"></p>' +
        '<div class="panel-actions">' +
          '<button type="button" class="btn" id="addLookBtn">Adicionar à sacola</button>' +
          '<button type="button" class="btn ghost" id="buyLookBtn">Comprar</button>' +
        '</div>' +
      '</div>';
  }

  function irPara(idx) {
    if (!lista.length) return;
    centerIdx = (idx + lista.length) % lista.length;
    isBack = false;
    dragRotOffset = 0;
    atualizarPosicoes3D();
    atualizarPainel();
  }

  function bindEvents() {
    var track = $("#lookTrack", host);
    var startX = null, startY = null, axis = null, moved = false, lastDy = 0;

    track.addEventListener("pointerdown", function (e) {
      startX = e.clientX;
      startY = e.clientY;
      axis = null;
      moved = false;
      lastDy = 0;
      if (track.setPointerCapture) {
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    track.addEventListener("pointermove", function (e) {
      if (startX == null || startY == null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (!axis && Math.hypot(dx, dy) > 12) {
        axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        moved = true;
      }

      if (axis === "x" && Math.abs(dx) > 44) {
        startX = e.clientX;
        irPara(centerIdx + (dx < 0 ? 1 : -1));
      } else if (axis === "y") {
        lastDy = dy;
        dragRotOffset = Math.max(-Math.PI, Math.min(Math.PI, (-dy / 160) * Math.PI));
      }
    });

    var finishGesture = function (e) {
      if (axis === "y" && Math.abs(lastDy) > 32) {
        isBack = !isBack;
        atualizarPosicoes3D();
      } else if (!moved && e && e.target) {
        var card = e.target.closest(".look-card");
        if (card) {
          var idx = +card.dataset.look;
          if (idx !== centerIdx) irPara(idx);
          else { isBack = !isBack; atualizarPosicoes3D(); }
        }
      }
      startX = null;
      startY = null;
      axis = null;
      dragRotOffset = 0;
    };

    track.addEventListener("pointerup", finishGesture);
    track.addEventListener("pointercancel", function () { startX = null; startY = null; axis = null; dragRotOffset = 0; });

    host.addEventListener("click", function (e) {
      if (e.target.closest("#btnFlipSide")) { isBack = !isBack; atualizarPosicoes3D(); return; }
      if (e.target.closest("#prevLook")) { irPara(centerIdx - 1); return; }
      if (e.target.closest("#nextLook")) { irPara(centerIdx + 1); return; }

      var dot = e.target.closest("[data-dot]");
      if (dot) { irPara(+dot.dataset.dot); return; }

      var sw = e.target.closest("[data-cor]");
      if (sw) {
        var p = lista[centerIdx];
        var st = getSel(p);
        st.corIdx = +sw.dataset.cor;
        var sc = scenes[centerIdx];
        if (sc) sc.setColor(hexDe(p.cores[st.corIdx]));
        atualizarPainel();
        return;
      }

      var tm = e.target.closest("[data-tam]");
      if (tm) {
        var p2 = lista[centerIdx];
        getSel(p2).tam = tm.dataset.tam;
        atualizarPainel();
        return;
      }

      if (e.target.closest("#addLookBtn") || e.target.closest("#buyLookBtn")) {
        var buyNow = !!e.target.closest("#buyLookBtn");
        var peca = lista[centerIdx];
        var sel = getSel(peca);
        C().adicionar(peca.id, sel.tam, (peca.cores && peca.cores[sel.corIdx]) || "", 1);
        if (buyNow) {
          C().abrirCheckout();
        } else {
          var msg = $("#panelMsg", host);
          if (msg) { msg.className = "panel-msg ok"; msg.textContent = peca.nome + " adicionada à sacola ✓"; }
        }
      }
    });

    window.addEventListener("resize", atualizarPosicoes3D);
  }

  document.addEventListener("keydown", function (e) {
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft") irPara(centerIdx - 1);
    else if (e.key === "ArrowRight") irPara(centerIdx + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); isBack = !isBack; atualizarPosicoes3D(); }
  });

  window.Vitrine = { render: render };
})();
