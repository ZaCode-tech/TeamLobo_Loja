/* VITRINE 3D WEBGL (THREE.JS) — Team Lobo Store
   - Apenas a roupa pendurada em cabide metálico cromado 3D (sem boneco).
   - Deslize Esquerda / Direita: troca entre as 4 roupas no carrossel 3D com desfoque lateral.
   - Deslize Cima / Baixo (ou clique na peça / botão): gira a roupa + cabide 180° (Frente ↔ Costas). */
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
    preta: "#14161a", preto: "#14161a", branca: "#f0f2f5", branco: "#f0f2f5",
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
    return "#14161a";
  }
  function claro(hex) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(hex);
    if (!m) return false;
    return (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255 > 0.62;
  }
  function tipoDe(p) {
    var s = norm((p.id || "") + " " + (p.nome || "") + " " + (p.categoria || ""));
    if (/camiseta-lobo|top|cropped|alcinha|blusa/.test(s)) return "top-alcinha";
    if (/regata|tank/.test(s)) return "regata";
    if (/short|bermuda/.test(s)) return "shorts";
    if (/moletom|casaco|jaqueta|hoodie/.test(s)) return "moletom";
    return "camiseta";
  }

  /* ---------- Textura de micro-trama esportiva + Logos Team Lobo ---------- */
  var weaveBumpTex = null;
  function getWeaveBump() {
    if (weaveBumpTex) return weaveBumpTex;
    var cv = document.createElement("canvas");
    cv.width = 64; cv.height = 64;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 64, 64);
    for (var y = 0; y < 64; y += 2) {
      for (var x = 0; x < 64; x += 2) {
        ctx.fillStyle = ((x + y) % 4 === 0) ? "#969696" : "#6a6a6a";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    weaveBumpTex = new THREE.CanvasTexture(cv);
    weaveBumpTex.wrapS = THREE.RepeatWrapping;
    weaveBumpTex.wrapT = THREE.RepeatWrapping;
    weaveBumpTex.repeat.set(22, 22);
    return weaveBumpTex;
  }

  function drawWolfSilhouette(ctx, cx, cy, scale, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    // Silhueta exata do lobo uivando para a direita (camiseta-lobo.png)
    ctx.moveTo(-36, 56);
    ctx.lineTo(-24, 24);
    ctx.lineTo(-34, 14);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-36, -14);
    ctx.lineTo(-10, -24);
    ctx.lineTo(-14, -46);
    ctx.lineTo(-4, -68);
    ctx.lineTo(6, -44);
    ctx.lineTo(18, -50);
    ctx.lineTo(44, -76);
    ctx.lineTo(49, -70);
    ctx.lineTo(32, -52);
    ctx.lineTo(50, -58);
    ctx.lineTo(28, -32);
    ctx.lineTo(34, -22);
    ctx.lineTo(26, -14);
    ctx.lineTo(35, -6);
    ctx.lineTo(28, 4);
    ctx.lineTo(38, 14);
    ctx.lineTo(31, 24);
    ctx.lineTo(40, 34);
    ctx.lineTo(20, 48);
    ctx.lineTo(8, 66);
    ctx.lineTo(2, 48);
    ctx.lineTo(-14, 52);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function makeTopFrontTexture(lightFabric) {
    var cv = document.createElement("canvas");
    cv.width = 1024; cv.height = 512;
    var ctx = cv.getContext("2d");
    var ink = lightFabric ? "#121419" : "#dce1e8";

    ctx.fillStyle = ink;
    ctx.font = "italic 900 94px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.textBaseline = "middle";

    ctx.textAlign = "right";
    ctx.fillText("TEAM", 442, 266);

    ctx.textAlign = "left";
    ctx.fillText("LOBO", 582, 266);

    drawWolfSilhouette(ctx, 512, 258, 1.05, ink);

    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeChestCrestTexture(lightFabric) {
    var cv = document.createElement("canvas");
    cv.width = 512; cv.height = 512;
    var ctx = cv.getContext("2d");
    var ink = lightFabric ? "#121419" : "#e2e7ee";
    drawWolfSilhouette(ctx, 256, 210, 1.85, ink);
    ctx.fillStyle = ink;
    ctx.font = "italic 900 62px 'Barlow Condensed', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TEAM LOBO", 256, 395);
    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ---------- Cabide Metálico Cromado 3D ---------- */
  function buildHanger3D(widthScale, yTop) {
    var hanger = new THREE.Group();
    var chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe6ebf2,
      metalness: 0.90,
      roughness: 0.18
    });
    var darkChromeMat = new THREE.MeshStandardMaterial({
      color: 0x9aa3b0,
      metalness: 0.85,
      roughness: 0.25
    });

    var w = 0.62 * (widthScale || 1);
    var neckY = yTop;

    // 1. Gancho superior giratório
    var hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY, 0),
      new THREE.Vector3(0, neckY + 0.14, 0),
      new THREE.Vector3(-0.08, neckY + 0.23, 0),
      new THREE.Vector3(-0.06, neckY + 0.35, 0),
      new THREE.Vector3(0.05, neckY + 0.38, 0),
      new THREE.Vector3(0.11, neckY + 0.30, 0),
      new THREE.Vector3(0.07, neckY + 0.23, 0)
    ]);
    hanger.add(new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 36, 0.015, 10, false), chromeMat));

    // Anel/colar na base do gancho
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, 0.055, 16), darkChromeMat);
    collar.position.set(0, neckY, 0);
    hanger.add(collar);

    // 2. Corpo triangular do cabide com cavas para alcinhas
    var bodyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY - 0.02, 0),
      new THREE.Vector3(-w * 0.45, neckY - 0.11, 0),
      new THREE.Vector3(-w * 0.68, neckY - 0.17, 0), // cava esquerda da alça
      new THREE.Vector3(-w * 0.72, neckY - 0.15, 0),
      new THREE.Vector3(-w, neckY - 0.24, 0),
      new THREE.Vector3(-w * 0.96, neckY - 0.33, 0),
      new THREE.Vector3(0, neckY - 0.33, 0),
      new THREE.Vector3(w * 0.96, neckY - 0.33, 0),
      new THREE.Vector3(w, neckY - 0.24, 0),
      new THREE.Vector3(w * 0.72, neckY - 0.15, 0),
      new THREE.Vector3(w * 0.68, neckY - 0.17, 0), // cava direita da alça
      new THREE.Vector3(w * 0.45, neckY - 0.11, 0),
      new THREE.Vector3(0, neckY - 0.02, 0)
    ], true);
    hanger.add(new THREE.Mesh(new THREE.TubeGeometry(bodyCurve, 64, 0.017, 10, true), chromeMat));

    return hanger;
  }

  /* ---------- Construtores 3D das Roupas no Cabide ---------- */
  function buildGarmentOnHanger3D(tipo, hexColor) {
    var rootGroup = new THREE.Group();
    var isLight = claro(hexColor);

    var fabricMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness: 0.60,
      metalness: 0.10,
      bumpMap: getWeaveBump(),
      bumpScale: 0.0035,
      side: THREE.DoubleSide
    });

    var trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor).multiplyScalar(isLight ? 0.92 : 1.18),
      roughness: 0.55,
      metalness: 0.12
    });

    if (tipo === "top-alcinha") {
      /* === TOP CROPPED DE ALCINHA TEAM LOBO (406929.png) NO CABIDE 3D === */
      rootGroup.add(buildHanger3D(1.0, 1.16));

      var topH = 0.70;
      var centerY = 0.28; // topo em y = 0.63, barra em y = -0.07
      var topGeo = new THREE.CylinderGeometry(0.57, 0.50, topH, 72, 28, true);
      var pos = topGeo.attributes.position;

      for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        var ny = y / (topH * 0.5); // -1 (barra) a +1 (decote)

        // Perfil anatômico da blusa pendurada (largura x profundidade)
        z *= 0.52;

        // Volume frontal do busto (z > 0) e costas limpas (z < 0)
        if (z > 0) {
          var bust = Math.exp(-Math.pow((Math.abs(x) - 0.21) / 0.24, 2)) * Math.exp(-Math.pow((ny - 0.05) / 0.55, 2));
          z += bust * 0.095;
        } else {
          z -= 0.015 * Math.exp(-Math.pow(ny / 0.65, 2));
        }

        // Decote frontal suavemente curvado (igual à foto camiseta-lobo.png)
        if (ny > 0.2) {
          var tTop = (ny - 0.2) / 0.8;
          var arch = Math.cos(Math.min(1, Math.abs(x) / 0.56) * Math.PI * 0.5);
          var scoop = (z >= 0 ? 0.048 : 0.028) * arch * tTop;
          y -= scoop;
        }

        pos.setXYZ(i, x, y, z);
      }
      topGeo.computeVertexNormals();
      var bodyMesh = new THREE.Mesh(topGeo, fabricMat);
      bodyMesh.position.y = centerY;
      rootGroup.add(bodyMesh);

      // Viés (acabamento em relevo) contornando todo o decote superior (frente e costas)
      var neckPts = [];
      for (var s = 0; s <= 64; s++) {
        var ang = (s / 64) * Math.PI * 2;
        var nx = Math.sin(ang) * 0.57;
        var nz = Math.cos(ang) * 0.57 * 0.52;
        if (nz > 0) {
          var nb = Math.exp(-Math.pow((Math.abs(nx) - 0.21) / 0.24, 2)) * Math.exp(-Math.pow(0.95 / 0.55, 2));
          nz += nb * 0.095;
        }
        var nArch = Math.cos(Math.min(1, Math.abs(nx) / 0.56) * Math.PI * 0.5);
        var nyTop = centerY + (topH * 0.5) - ((nz >= 0 ? 0.048 : 0.028) * nArch);
        neckPts.push(new THREE.Vector3(nx, nyTop, nz));
      }
      var neckPipe = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts, true), 72, 0.013, 8, true);
      rootGroup.add(new THREE.Mesh(neckPipe, trimMat));

      // Barra dupla inferior (duas costuras paralelas na cintura, igual à foto)
      [-0.068, -0.032].forEach(function (by, idx) {
        var hemGeo = new THREE.TorusGeometry(0.502 + idx * 0.003, idx === 0 ? 0.011 : 0.007, 10, 64);
        hemGeo.rotateX(Math.PI / 2);
        hemGeo.scale(1, 1, 0.52);
        var hem = new THREE.Mesh(hemGeo, trimMat);
        hem.position.y = by;
        rootGroup.add(hem);
      });

      // Duas alças finas apoiadas exatamente nas cavas do cabide 3D (x = ±0.425)
      [-0.425, 0.425].forEach(function (sx) {
        var strapCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 0.60, 0.22),
          new THREE.Vector3(sx, 0.84, 0.13),
          new THREE.Vector3(sx, 0.99, 0.02),
          new THREE.Vector3(sx, 0.99, -0.02),
          new THREE.Vector3(sx, 0.84, -0.13),
          new THREE.Vector3(sx, 0.61, -0.22)
        ]);
        var strapGeo = new THREE.TubeGeometry(strapCurve, 32, 0.014, 8, false);
        rootGroup.add(new THREE.Mesh(strapGeo, trimMat));
      });

      // Estampa frontal "TEAM [Lobo] LOBO" curvada sobre o busto
      var logoGeo = new THREE.CylinderGeometry(0.575, 0.54, 0.34, 40, 1, true, -0.68, 1.36);
      var lPos = logoGeo.attributes.position;
      for (var j = 0; j < lPos.count; j++) {
        var lx = lPos.getX(j), ly = lPos.getY(j), lz = lPos.getZ(j) * 0.525;
        var lny = ly / (topH * 0.5);
        var lb = Math.exp(-Math.pow((Math.abs(lx) - 0.21) / 0.24, 2)) * Math.exp(-Math.pow((lny - 0.05) / 0.55, 2));
        lPos.setXYZ(j, lx, ly, lz + lb * 0.098 + 0.008);
      }
      logoGeo.computeVertexNormals();
      var logoMat = new THREE.MeshBasicMaterial({
        map: makeTopFrontTexture(isLight),
        transparent: true,
        depthWrite: false
      });
      var logoMesh = new THREE.Mesh(logoGeo, logoMat);
      logoMesh.position.y = centerY - 0.02;
      rootGroup.add(logoMesh);

    } else if (tipo === "camiseta" || tipo === "regata") {
      /* === CAMISETA OU REGATA ESPORTIVA NO CABIDE 3D === */
      rootGroup.add(buildHanger3D(1.08, 1.24));

      var bodyGeo = new THREE.CylinderGeometry(0.62, 0.57, 1.42, 48, 16, true);
      bodyGeo.scale(1, 1, 0.54);
      var bodyMesh = new THREE.Mesh(bodyGeo, fabricMat);
      bodyMesh.position.y = 0.24;
      rootGroup.add(bodyMesh);

      var collarGeo = new THREE.TorusGeometry(0.25, 0.026, 12, 32);
      collarGeo.rotateX(Math.PI / 2.15);
      var collar = new THREE.Mesh(collarGeo, trimMat);
      collar.position.set(0, 0.94, 0.03);
      rootGroup.add(collar);

      if (tipo === "camiseta") {
        [-0.73, 0.73].forEach(function (sx, idx) {
          var slv = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.20, 0.54, 24, 1, true), fabricMat);
          slv.position.set(sx, 0.71, 0);
          slv.rotation.z = idx === 0 ? 0.52 : -0.52;
          rootGroup.add(slv);
        });
      }

      var cGeo = new THREE.CylinderGeometry(0.632, 0.618, 0.46, 32, 1, true, -0.46, 0.92);
      cGeo.scale(1, 1, 0.55);
      var cMat = new THREE.MeshBasicMaterial({ map: makeChestCrestTexture(isLight), transparent: true, depthWrite: false });
      var cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.y = 0.52;
      rootGroup.add(cMesh);

    } else {
      /* === SHORTS DE TREINO NO CABIDE 3D === */
      rootGroup.add(buildHanger3D(0.95, 1.04));

      // Presilhas do cabide segurando o cós
      [-0.44, 0.44].forEach(function (cx) {
        var clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.06), trimMat);
        clip.position.set(cx, 0.67, 0);
        rootGroup.add(clip);
      });

      var sWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.40, 44, 1, true), fabricMat);
      sWaist.scale.set(1, 1, 0.56);
      sWaist.position.y = 0.44;
      rootGroup.add(sWaist);

      [-0.28, 0.28].forEach(function (lx, idx) {
        var sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.28, 0.64, 32, 1, true), fabricMat);
        sLeg.scale.set(1, 1, 0.78);
        sLeg.position.set(lx, -0.05, 0);
        sLeg.rotation.z = idx === 0 ? -0.05 : 0.05;
        rootGroup.add(sLeg);
      });

      var scGeo = new THREE.CylinderGeometry(0.305, 0.29, 0.32, 24, 1, true, -0.42, 0.84);
      scGeo.scale(1, 1, 0.80);
      var scMat = new THREE.MeshBasicMaterial({ map: makeChestCrestTexture(isLight), transparent: true, depthWrite: false });
      var scMesh = new THREE.Mesh(scGeo, scMat);
      scMesh.position.set(0.28, -0.14, 0.01);
      scMesh.rotation.y = 0.20;
      rootGroup.add(scMesh);
    }

    return rootGroup;
  }

  /* ---------- Renderizadores WebGL ---------- */
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
    var w = 340, h = 480;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
    camera.position.set(0, 0.56, 4.35);

    // Iluminação de estúdio para destacar o brilho do cabide cromado e a textura da blusa
    scene.add(new THREE.AmbientLight(0xffffff, 0.90));
    var key = new THREE.DirectionalLight(0xffffff, 1.45);
    key.position.set(2.2, 3.5, 3.6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xe2e8f0, 0.95);
    rim.position.set(-2.6, 2.2, -3.2);
    scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffffff, 0.50);
    fill.position.set(0, -2.2, 2.4);
    scene.add(fill);

    var st = getSel(p);
    var corInicial = (p.cores && p.cores[st.corIdx]) || "Preta";
    var tipo = tipoDe(p);
    var pivot = new THREE.Group();
    pivot.add(buildGarmentOnHanger3D(tipo, hexDe(corInicial)));
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
        pivot.add(buildGarmentOnHanger3D(tipo, hex));
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
      // Balanço leve natural no cabide
      sc.pivot.rotation.z = isCenter && !reduce ? Math.sin(sec * 1.8) * 0.018 : 0;
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

  /* ---------- Montagem da Vitrine ---------- */
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
          '<div class="look-track" id="lookTrack" role="region" aria-label="Arara 3D interativa"></div>' +
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
