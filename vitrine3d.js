/* VITRINE 3D WEBGL (THREE.JS) — Team Lobo Store
   - Converte automaticamente as imagens de assets/produtos/ (Frente + Costas) em modelos 3D pendurados no cabide cromado 3D.
   - Arrastar para os lados (← →): gira a peça de lado em 3D e troca o produto no carrossel.
   - Arrastar para cima/baixo (↑ ↓) ou tocar na peça: gira 180° mostrando Frente e Costas.
   - Controles extras: Zoom 3D (inspecionar tecido) e Giro 360° automático. */

function recortaCanvas(cv) {
  var w = cv.width, h = cv.height, ctx = cv.getContext("2d"), im = ctx.getImageData(0, 0, w, h), d = im.data, i, x, y, p;
  var n = 0, r = 0, g = 0, b = 0, borda = [];
  for (x = 0; x < w; x += 3) { borda.push(x, (h - 1) * w + x); }
  for (y = 0; y < h; y += 3) { borda.push(y * w, y * w + w - 1); }
  for (i = 0; i < borda.length; i++) { p = borda[i] * 4; if (d[p + 3] < 250) return null; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
  r /= n; g /= n; b /= n;
  var dist = function (q) { var dr = d[q] - r, dg = d[q + 1] - g, db = d[q + 2] - b; return Math.sqrt(dr * dr + dg * dg + db * db); };
  var ruim = 0; for (i = 0; i < borda.length; i++) if (dist(borda[i] * 4) > 40) ruim++;
  if (ruim / n > 0.2) return null;
  var TOL = 34, bg = new Uint8Array(w * h), fila = new Int32Array(w * h), ini = 0, fim = 0;
  var tenta = function (q) { if (!bg[q] && dist(q * 4) < TOL) { bg[q] = 1; fila[fim++] = q; } };
  for (x = 0; x < w; x++) { tenta(x); tenta((h - 1) * w + x); } for (y = 0; y < h; y++) { tenta(y * w); tenta(y * w + w - 1); }
  while (ini < fim) { p = fila[ini++]; x = p % w; y = (p / w) | 0; if (x > 0) tenta(p - 1); if (x < w - 1) tenta(p + 1); if (y > 0) tenta(p - w); if (y < h - 1) tenta(p + w); }
  var cx0 = Math.floor(w * 0.3), cx1 = Math.floor(w * 0.7), cy0 = Math.floor(h * 0.3), cy1 = Math.floor(h * 0.7), dentro = 0, tot = 0;
  for (y = cy0; y < cy1; y += 2) for (x = cx0; x < cx1; x += 2) { tot++; if (bg[y * w + x]) dentro++; }
  if (dentro / tot > 0.2) return null;
  var x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (p = 0; p < w * h; p++) {
    i = p * 4; x = p % w; y = (p / w) | 0;
    if (bg[p]) { d[i + 3] = 0; continue; }
    if ((x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w])) {
      d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (dist(i) - TOL * 0.6) / (TOL * 1.2))));
    }
    if (d[i + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0 || (x1 - x0) * (y1 - y0) < w * h * 0.05) return null;
  ctx.putImageData(im, 0, 0);
  var m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02), out = document.createElement("canvas");
  out.width = x1 - x0 + 1 + 2 * m; out.height = y1 - y0 + 1 + 2 * m;
  out.getContext("2d").drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, m, m, x1 - x0 + 1, y1 - y0 + 1);
  return out;
}

(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var C = function () { return window.LojaCore; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var host = $("#vitrine");
  var lista = [], centerIdx = 0, isBack = false, autoSpin = false, zoom3D = false;
  var dragRotOffset = 0, dragShift = 0, spinAngle = 0;
  var selecao = {};
  var scenes = [], rafId = 0, pendingList = null;

  function ensureThree(cb) {
    if (window.THREE) return cb();
    var existing = document.querySelector("script[data-three-loader]");
    if (existing) { existing.addEventListener("load", cb, { once: true }); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    s.setAttribute("data-three-loader", "1");
    s.onload = cb;
    document.head.appendChild(s);
  }

  /* ---------- Cores ---------- */
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

  /* ---------- Imagens Frente e Costas em assets/produtos/ ---------- */
  function resolveFotoUrl(raw) {
    if (!raw) return "";
    raw = String(raw).trim();
    if (/^(https?:|data:|blob:|\.\/|\/|assets\/)/i.test(raw)) return raw;
    return "assets/produtos/" + raw;
  }

  function getImagePair(p, corIdx) {
    var fotos = (p.fotos || []).map(resolveFotoUrl).filter(Boolean);
    var frontUrl = "", backUrl = "";

    if (p.fotoFrente || p.fotoCostas) {
      frontUrl = resolveFotoUrl(p.fotoFrente);
      backUrl = resolveFotoUrl(p.fotoCostas);
    } else if (fotos.length >= 2) {
      var coresLen = (p.cores || []).length;
      if (coresLen > 1 && fotos.length >= coresLen * 2) {
        frontUrl = fotos[corIdx * 2];
        backUrl = fotos[corIdx * 2 + 1];
      } else {
        frontUrl = fotos[0];
        backUrl = fotos[1];
      }
    } else if (fotos.length === 1) {
      frontUrl = fotos[0];
    } else {
      frontUrl = "assets/produtos/" + p.id + ".png";
    }

    if (!backUrl && frontUrl && /\.(png|webp|jpe?g)(\?.*)?$/i.test(frontUrl)) {
      backUrl = frontUrl.replace(/\.(png|webp|jpe?g)(\?.*)?$/i, "-costas.$1$2");
    }
    return { front: frontUrl, back: backUrl };
  }

  function loadCleanImage(url) {
    return new Promise(function (resolve, reject) {
      if (!url) return reject(new Error("empty"));
      var img = new Image();
      if (/^https?:/i.test(url) && url.indexOf(location.origin) !== 0) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = function () {
        try {
          var s = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
          var cv = document.createElement("canvas");
          cv.width = Math.round(img.naturalWidth * s);
          cv.height = Math.round(img.naturalHeight * s);
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          var cut = recortaCanvas(cv);
          if (cut) {
            var cleanImg = new Image();
            cleanImg.onload = function () { resolve(cleanImg); };
            cleanImg.onerror = function () { resolve(img); };
            cleanImg.src = cut.toDataURL("image/png");
            return;
          }
        } catch (e) {}
        resolve(img);
      };
      img.onerror = function () { reject(new Error("fail")); };
      img.src = url;
    });
  }

  /* ---------- Cabide Metálico Cromado 3D (30% Prata Metalizada) ---------- */
  function buildHanger3D(halfSpan, yNeck, isBottomClip) {
    var hanger = new THREE.Group();
    var chromeMat = new THREE.MeshStandardMaterial({
      color: 0xeef3fa,
      metalness: 0.92,
      roughness: 0.16
    });
    var darkChromeMat = new THREE.MeshStandardMaterial({
      color: 0x8f99a8,
      metalness: 0.88,
      roughness: 0.24
    });

    var w = Math.max(0.46, Math.min(0.76, halfSpan || 0.60));
    var neckY = yNeck;

    var hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY, 0),
      new THREE.Vector3(0, neckY + 0.13, 0),
      new THREE.Vector3(-0.075, neckY + 0.22, 0),
      new THREE.Vector3(-0.055, neckY + 0.34, 0),
      new THREE.Vector3(0.05, neckY + 0.37, 0),
      new THREE.Vector3(0.105, neckY + 0.29, 0),
      new THREE.Vector3(0.065, neckY + 0.22, 0)
    ]);
    hanger.add(new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 36, 0.015, 10, false), chromeMat));

    var collar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.029, 0.05, 16), darkChromeMat);
    collar.position.set(0, neckY, 0);
    hanger.add(collar);

    var bodyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, neckY - 0.02, 0),
      new THREE.Vector3(-w * 0.48, neckY - 0.11, 0),
      new THREE.Vector3(-w * 0.72, neckY - 0.17, 0),
      new THREE.Vector3(-w, neckY - 0.24, 0),
      new THREE.Vector3(-w * 0.96, neckY - 0.32, 0),
      new THREE.Vector3(0, neckY - 0.32, 0),
      new THREE.Vector3(w * 0.96, neckY - 0.32, 0),
      new THREE.Vector3(w, neckY - 0.24, 0),
      new THREE.Vector3(w * 0.72, neckY - 0.17, 0),
      new THREE.Vector3(w * 0.48, neckY - 0.11, 0),
      new THREE.Vector3(0, neckY - 0.02, 0)
    ], true);
    hanger.add(new THREE.Mesh(new THREE.TubeGeometry(bodyCurve, 64, 0.016, 10, true), chromeMat));

    if (isBottomClip) {
      [-w * 0.75, w * 0.75].forEach(function (cx) {
        var clip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.11, 0.055), darkChromeMat);
        clip.position.set(cx, neckY - 0.35, 0);
        hanger.add(clip);
      });
    }

    return hanger;
  }

  /* ---------- Conversor Imagem (Frente + Costas) -> Modelo 3D Volumétrico ---------- */
  function createAutoBackTexture(rgb, alphaCanvas) {
    var w = alphaCanvas.width, h = alphaCanvas.height;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var ctx = cv.getContext("2d");

    ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    ctx.fillRect(0, 0, w, h);

    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(0,0,0,0.24)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.05)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.10)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0.24)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "destination-in";
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(alphaCanvas, 0, 0);

    var tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function build3DFromImages(frontImg, backImg, tintHex, isOriginalColor) {
    var rootGroup = new THREE.Group();

    var S = 160;
    var aCv = document.createElement("canvas");
    aCv.width = S; aCv.height = S;
    var aCtx = aCv.getContext("2d");
    aCtx.clearRect(0, 0, S, S);
    aCtx.drawImage(frontImg, 0, 0, S, S);

    var mask = new Uint8Array(S * S);
    var minX = S, maxX = 0, minY = S, maxY = 0;
    var rSum = 0, gSum = 0, bSum = 0, count = 0;
    var canRead = true;

    try {
      var imgData = aCtx.getImageData(0, 0, S, S).data;
      for (var y = 0; y < S; y++) {
        for (var x = 0; x < S; x++) {
          var idx = (y * S + x) * 4;
          if (imgData[idx + 3] > 28) {
            mask[y * S + x] = 1;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            var r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];
            if (r + g + b < 580) { rSum += r; gSum += g; bSum += b; count++; }
          }
        }
      }
    } catch (e) {
      canRead = false;
    }

    var fabricRgb = count > 20
      ? [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)]
      : [20, 22, 27];

    if (!canRead || maxX <= minX || maxY <= minY) {
      minX = 12; maxX = S - 12; minY = 12; maxY = S - 12;
      for (var fy = minY; fy <= maxY; fy++) {
        for (var fx = minX; fx <= maxX; fx++) mask[fy * S + fx] = 1;
      }
    }

    var dist = new Float32Array(S * S);
    var INF = 999;
    for (var i = 0; i < S * S; i++) dist[i] = mask[i] ? INF : 0;

    for (var y1 = 1; y1 < S - 1; y1++) {
      for (var x1 = 1; x1 < S - 1; x1++) {
        var p1 = y1 * S + x1;
        if (!dist[p1]) continue;
        dist[p1] = Math.min(dist[p1], dist[p1 - 1] + 1, dist[p1 - S] + 1, dist[p1 - S - 1] + 1.414, dist[p1 - S + 1] + 1.414);
      }
    }
    for (var y2 = S - 2; y2 >= 1; y2--) {
      for (var x2 = S - 2; x2 >= 1; x2--) {
        var p2 = y2 * S + x2;
        if (!dist[p2]) continue;
        dist[p2] = Math.min(dist[p2], dist[p2 + 1] + 1, dist[p2 + S] + 1, dist[p2 + S - 1] + 1.414, dist[p2 + S + 1] + 1.414);
      }
    }

    var smoothDist = new Float32Array(S * S);
    var maxD = 1;
    for (var sy = 1; sy < S - 1; sy++) {
      for (var sx = 1; sx < S - 1; sx++) {
        var sp = sy * S + sx;
        if (!mask[sp]) continue;
        var acc = 0;
        for (var ky = -1; ky <= 1; ky++) {
          for (var kx = -1; kx <= 1; kx++) acc += dist[(sy + ky) * S + (sx + kx)];
        }
        var v = acc / 9;
        smoothDist[sp] = v;
        if (v > maxD) maxD = v;
      }
    }

    var boxW = (maxX - minX + 1) / S;
    var boxH = (maxY - minY + 1) / S;
    var aspect = (boxW * (frontImg.naturalWidth || 1)) / (boxH * (frontImg.naturalHeight || 1));
    var meshW = aspect >= 1 ? 1.38 : Math.max(0.95, 1.32 * aspect);
    var meshH = meshW / aspect;
    if (meshH > 1.52) { meshH = 1.52; meshW = meshH * aspect; }

    var scanLimitY = Math.min(maxY, minY + Math.round((maxY - minY) * 0.16));
    var leftSumX = 0, leftCnt = 0, rightSumX = 0, rightCnt = 0;
    var midX = (minX + maxX) * 0.5;
    for (var ty = minY; ty <= scanLimitY; ty++) {
      for (var tx = minX; tx <= maxX; tx++) {
        if (mask[ty * S + tx]) {
          if (tx < midX) { leftSumX += tx; leftCnt++; }
          else { rightSumX += tx; rightCnt++; }
        }
      }
    }
    var strapSpanPx = (leftCnt && rightCnt) ? ((rightSumX / rightCnt) - (leftSumX / leftCnt)) : (maxX - minX) * 0.72;
    var hangerHalfSpan = ((strapSpanPx / (maxX - minX)) * meshW) * 0.68;
    var topEdgeY = 0.25 + meshH * 0.5;
    rootGroup.add(buildHanger3D(hangerHalfSpan, topEdgeY + 0.14, false));

    var frontTex = new THREE.Texture(frontImg);
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.anisotropy = 4;
    frontTex.needsUpdate = true;

    var backTex;
    if (backImg) {
      backTex = new THREE.Texture(backImg);
      backTex.colorSpace = THREE.SRGBColorSpace;
      backTex.anisotropy = 4;
      backTex.needsUpdate = true;
    } else {
      backTex = createAutoBackTexture(fabricRgb, aCv);
    }

    var materialColor = isOriginalColor ? new THREE.Color(0xffffff) : new THREE.Color(tintHex);

    var segX = 68, segY = 76;
    var frontGeo = new THREE.PlaneGeometry(meshW, meshH, segX, segY);
    var backGeo = new THREE.PlaneGeometry(meshW, meshH, segX, segY);
    backGeo.rotateY(Math.PI);

    var uMin = minX / S, uMax = (maxX + 1) / S;
    var vTop = 1 - (minY / S), vBot = 1 - ((maxY + 1) / S);

    var fPos = frontGeo.attributes.position, fUv = frontGeo.attributes.uv;
    var bPos = backGeo.attributes.position, bUv = backGeo.attributes.uv;

    for (var vi = 0; vi < fPos.count; vi++) {
      var gx = vi % (segX + 1);
      var gy = Math.floor(vi / (segX + 1));
      var nx = gx / segX;
      var ny = gy / segY;

      var u = uMin + nx * (uMax - uMin);
      var v = vTop + ny * (vBot - vTop);

      var px = Math.min(S - 1, Math.max(0, Math.floor(u * S)));
      var py = Math.min(S - 1, Math.max(0, Math.floor((1 - v) * S)));
      var dNorm = smoothDist[py * S + px] / maxD;

      var inflate = Math.pow(Math.min(1, dNorm * 1.45), 0.55);
      var torsoArch = Math.sin(nx * Math.PI) * 0.055 * inflate;
      var zFront = inflate * 0.135 + torsoArch;
      var zBack = -(inflate * 0.105 + torsoArch * 0.75);

      fPos.setZ(vi, zFront);
      fUv.setXY(vi, u, v);

      bPos.setZ(vi, zBack);
      bUv.setXY(vi, backImg ? nx : u, backImg ? (1 - ny) : v);
    }

    frontGeo.computeVertexNormals();
    backGeo.computeVertexNormals();

    var frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      color: materialColor,
      transparent: true,
      alphaTest: 0.16,
      roughness: 0.56,
      metalness: 0.08
    });

    var backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      color: materialColor,
      transparent: true,
      alphaTest: 0.16,
      roughness: 0.64,
      metalness: 0.06
    });

    var frontMesh = new THREE.Mesh(frontGeo, frontMat);
    var backMesh = new THREE.Mesh(backGeo, backMat);
    frontMesh.position.y = 0.25;
    backMesh.position.y = 0.25;

    rootGroup.add(frontMesh);
    rootGroup.add(backMesh);

    // Borda lateral 3D unindo frente e costas
    var rimMat = new THREE.MeshStandardMaterial({
      color: isOriginalColor
        ? new THREE.Color("rgb(" + fabricRgb[0] + "," + fabricRgb[1] + "," + fabricRgb[2] + ")")
        : new THREE.Color(tintHex),
      roughness: 0.7,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    var rimPositions = [];
    for (var ry = minY; ry <= maxY; ry += 2) {
      var leftEdge = -1, rightEdge = -1;
      for (var rx = minX; rx <= maxX; rx++) {
        if (mask[ry * S + rx]) {
          if (leftEdge < 0) leftEdge = rx;
          rightEdge = rx;
        }
      }
      if (leftEdge >= 0 && rightEdge > leftEdge) {
        var wy = 0.25 + (0.5 - (ry - minY) / Math.max(1, maxY - minY)) * meshH;
        var wxL = ((leftEdge - minX) / Math.max(1, maxX - minX) - 0.5) * meshW;
        var wxR = ((rightEdge - minX) / Math.max(1, maxX - minX) - 0.5) * meshW;
        rimPositions.push({ y: wy, xL: wxL, xR: wxR });
      }
    }
    if (rimPositions.length > 2) {
      var sideVerts = [];
      for (var ri = 0; ri < rimPositions.length - 1; ri++) {
        var aR = rimPositions[ri], bR = rimPositions[ri + 1];
        sideVerts.push(aR.xL, aR.y, 0.032, aR.xL, aR.y, -0.032, bR.xL, bR.y, 0.032);
        sideVerts.push(bR.xL, bR.y, 0.032, aR.xL, aR.y, -0.032, bR.xL, bR.y, -0.032);
        sideVerts.push(aR.xR, aR.y, 0.032, bR.xR, bR.y, 0.032, aR.xR, aR.y, -0.032);
        sideVerts.push(bR.xR, bR.y, 0.032, bR.xR, bR.y, -0.032, aR.xR, aR.y, -0.032);
      }
      var sideGeo = new THREE.BufferGeometry();
      sideGeo.setAttribute("position", new THREE.Float32BufferAttribute(sideVerts, 3));
      sideGeo.computeVertexNormals();
      rootGroup.add(new THREE.Mesh(sideGeo, rimMat));
    }

    return rootGroup;
  }

  /* ---------- Fallback 3D no cabide (enquanto o PNG da peça não foi enviado para assets/produtos/) ---------- */
  function buildFallbackGarment3D(tipo, hexColor) {
    var rootGroup = new THREE.Group();
    var isLight = claro(hexColor);
    var fabricMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness: 0.62,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
    var trimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor).multiplyScalar(isLight ? 0.90 : 1.22),
      roughness: 0.55
    });

    if (tipo === "shorts") {
      rootGroup.add(buildHanger3D(0.56, 1.02, true));
      var sWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.38, 40, 1, true), fabricMat);
      sWaist.scale.set(1, 1, 0.54);
      sWaist.position.y = 0.44;
      rootGroup.add(sWaist);
      [-0.27, 0.27].forEach(function (lx, idx) {
        var sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.27, 0.62, 28, 1, true), fabricMat);
        sLeg.scale.set(1, 1, 0.76);
        sLeg.position.set(lx, -0.04, 0);
        sLeg.rotation.z = idx === 0 ? -0.05 : 0.05;
        rootGroup.add(sLeg);
      });
    } else {
      rootGroup.add(buildHanger3D(0.64, 1.22, false));
      var bodyGeo = new THREE.CylinderGeometry(0.60, 0.55, 1.38, 44, 14, true);
      bodyGeo.scale(1, 1, 0.52);
      var bodyMesh = new THREE.Mesh(bodyGeo, fabricMat);
      bodyMesh.position.y = 0.24;
      rootGroup.add(bodyMesh);

      var collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 10, 32), trimMat);
      collar.rotation.x = Math.PI / 2.15;
      collar.position.set(0, 0.92, 0.03);
      rootGroup.add(collar);

      if (tipo === "camiseta") {
        [-0.71, 0.71].forEach(function (sx, idx) {
          var slv = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.52, 24, 1, true), fabricMat);
          slv.position.set(sx, 0.70, 0);
          slv.rotation.z = idx === 0 ? 0.52 : -0.52;
          rootGroup.add(slv);
        });
      }
    }
    return rootGroup;
  }

  /* ---------- Renderizadores WebGL (Iluminação Prata + Azul Glacial 10%) ---------- */
  function disposeScenes() {
    cancelAnimationFrame(rafId);
    scenes.forEach(function (s) { if (s.renderer) s.renderer.dispose(); });
    scenes = [];
  }

  function createCardViewer(container, p, idx) {
    var w = 340, h = 480;
    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
    camera.position.set(0, 0.48, 4.35);

    // Luz ambiente + luz principal prata + luz de recorte Azul Glacial (10% destaque)
    scene.add(new THREE.AmbientLight(0xffffff, 1.02));
    var key = new THREE.DirectionalLight(0xf8fafc, 1.4);
    key.position.set(2.2, 3.4, 3.6);
    scene.add(key);

    var accentRim = new THREE.DirectionalLight(0x38bdf8, 1.15);
    accentRim.position.set(-2.6, 2.2, -3.0);
    scene.add(accentRim);

    var fill = new THREE.DirectionalLight(0xffffff, 0.52);
    fill.position.set(0, -2.0, 2.4);
    scene.add(fill);

    var pivot = new THREE.Group();
    scene.add(pivot);

    var viewer = {
      idx: idx,
      produto: p,
      renderer: renderer,
      scene: scene,
      camera: camera,
      pivot: pivot,
      currentRotY: 0,
      currentCamZ: 4.35,
      loadVariant: function (corIdx) {
        var corNome = (p.cores && p.cores[corIdx]) || "Preta";
        var hex = hexDe(corNome);
        var pair = getImagePair(p, corIdx);
        var isOrig = corIdx === 0;

        loadCleanImage(pair.front).then(function (fImg) {
          loadCleanImage(pair.back).then(function (bImg) {
            while (pivot.children.length) pivot.remove(pivot.children[0]);
            pivot.add(build3DFromImages(fImg, bImg, hex, isOrig));
          }).catch(function () {
            while (pivot.children.length) pivot.remove(pivot.children[0]);
            pivot.add(build3DFromImages(fImg, null, hex, isOrig));
          });
        }).catch(function () {
          while (pivot.children.length) pivot.remove(pivot.children[0]);
          pivot.add(buildFallbackGarment3D(tipoDe(p), hex));
        });
      }
    };

    var st = getSel(p);
    viewer.loadVariant(st.corIdx);
    return viewer;
  }

  function animateLoop(t) {
    rafId = requestAnimationFrame(animateLoop);
    var sec = (t || 0) * 0.001;
    if (autoSpin && !reduce) spinAngle += 0.016;

    scenes.forEach(function (sc) {
      var isCenter = sc.idx === centerIdx;
      var sideTurn = isCenter ? (-dragShift * 0.65) : 0;
      var targetY = isCenter
        ? ((autoSpin ? spinAngle : (isBack ? Math.PI : 0)) + dragRotOffset + sideTurn)
        : 0;
      sc.currentRotY += (targetY - sc.currentRotY) * 0.16;
      sc.pivot.rotation.y = sc.currentRotY;
      sc.pivot.rotation.z = isCenter && !reduce ? Math.sin(sec * 1.8) * 0.016 : 0;

      // Zoom 3D suave para inspecionar detalhes da roupa
      var targetZ = (isCenter && zoom3D) ? 3.25 : 4.35;
      sc.currentCamZ += (targetZ - sc.currentCamZ) * 0.14;
      sc.camera.position.z = sc.currentCamZ;

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

  /* ---------- Renderização da Vitrine ---------- */
  function render(produtos) {
    pendingList = produtos;
    ensureThree(function () {
      if (pendingList !== produtos) return;
      mountVitrine(produtos);
    });
  }

  function mountVitrine(produtos) {
    disposeScenes();
    lista = produtos;
    centerIdx = Math.min(centerIdx, Math.max(0, lista.length - 1));
    isBack = false;
    autoSpin = false;
    zoom3D = false;
    dragRotOffset = 0;
    dragShift = 0;
    spinAngle = 0;

    if (!lista.length) {
      host.innerHTML = '<p class="vazio">Nenhuma peça encontrada.</p>';
      return;
    }

    host.innerHTML =
      '<div class="look-studio">' +
        '<div class="look-stage" id="lookStage">' +
          '<div class="stage-pedestal" aria-hidden="true"></div>' +
          '<div class="stage-top">' +
            '<div class="stage-controls">' +
              '<button type="button" class="side-pill" id="btnFlipSide" aria-label="Virar peça frente e costas"><span class="side-dot"></span><span id="sideLabel">Vista: Frente ↻</span></button>' +
              '<button type="button" class="side-pill" id="btnAutoSpin" aria-pressed="false">360° Auto</button>' +
              '<button type="button" class="side-pill" id="btnZoom3D" aria-pressed="false">Zoom 3D</button>' +
            '</div>' +
            '<span class="stage-hint">← → Troca · ↑ ↓ Costas</span>' +
          '</div>' +
          '<div class="look-track" id="lookTrack" role="region" aria-label="Arara 3D interativa"></div>' +
          '<div class="stage-foot">' +
            '<button type="button" class="nav-arrow" id="prevLook" aria-label="Peça anterior">‹</button>' +
            '<div class="dots" id="lookDots"></div>' +
            '<button type="button" class="nav-arrow" id="nextLook" aria-label="Próxima peça">›</button>' +
          '</div>' +
        '</div>' +
        '<aside class="look-panel" id="lookPanel" data-tilt data-tilt-max="4" aria-label="Detalhes da peça selecionada"></aside>' +
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
    atualizarPosicoes3D(false);
    atualizarPainel();
    animateLoop(0);
  }

  function atualizarPosicoes3D(isDragging) {
    var pill = $("#btnFlipSide", host);
    var lbl = $("#sideLabel", host);
    if (pill && lbl) {
      pill.classList.toggle("is-back", isBack);
      lbl.textContent = isBack ? "Vista: Costas ↻" : "Vista: Frente ↻";
    }
    var spinBtn = $("#btnAutoSpin", host);
    if (spinBtn) {
      spinBtn.classList.toggle("active", autoSpin);
      spinBtn.setAttribute("aria-pressed", String(autoSpin));
    }
    var zoomBtn = $("#btnZoom3D", host);
    if (zoomBtn) {
      zoomBtn.classList.toggle("active", zoom3D);
      zoomBtn.setAttribute("aria-pressed", String(zoom3D));
    }

    var mobile = window.innerWidth <= 860;
    var stepX = mobile ? 150 : 210;

    $$(".look-card", host).forEach(function (card, i) {
      card.classList.toggle("dragging", !!isDragging);
      var off = (i - centerIdx) + dragShift;
      var abs = Math.abs(off);
      card.style.zIndex = String(20 - Math.round(abs));

      var tx = off * stepX;
      var tz = -abs * 145;
      var ry = reduce ? 0 : Math.max(-42, Math.min(42, -off * 22));
      var sc = Math.max(0.66, 1 - abs * 0.16);
      var op = abs > 2.3 ? 0 : Math.max(0.42, 1 - abs * 0.25);
      var bl = reduce ? 0 : Math.min(7, abs * 3.2);

      card.style.setProperty("--tx", tx.toFixed(1) + "px");
      card.style.setProperty("--tz", tz.toFixed(1) + "px");
      card.style.setProperty("--ry", ry.toFixed(1) + "deg");
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
          '<button type="button" class="btn btn-accent" id="addLookBtn">Adicionar à sacola</button>' +
          '<button type="button" class="btn ghost" id="buyLookBtn">Comprar agora</button>' +
        '</div>' +
      '</div>';
  }

  function irPara(idx) {
    if (!lista.length) return;
    centerIdx = (idx + lista.length) % lista.length;
    isBack = false;
    autoSpin = false;
    dragRotOffset = 0;
    dragShift = 0;
    spinAngle = 0;
    atualizarPosicoes3D(false);
    atualizarPainel();
  }

  function bindEvents() {
    var track = $("#lookTrack", host);
    var startX = null, startY = null, axis = null, moved = false, lastDx = 0, lastDy = 0;

    track.addEventListener("pointerdown", function (e) {
      startX = e.clientX;
      startY = e.clientY;
      axis = null;
      moved = false;
      lastDx = 0;
      lastDy = 0;
      if (track.setPointerCapture) {
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    track.addEventListener("pointermove", function (e) {
      if (startX == null || startY == null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      lastDx = dx;
      lastDy = dy;

      if (!axis && Math.hypot(dx, dy) > 10) {
        axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        moved = true;
      }

      if (axis === "x") {
        var step = window.innerWidth <= 860 ? 150 : 210;
        dragShift = Math.max(-1.15, Math.min(1.15, dx / step));
        atualizarPosicoes3D(true);
      } else if (axis === "y") {
        autoSpin = false;
        dragRotOffset = Math.max(-Math.PI, Math.min(Math.PI, (-dy / 155) * Math.PI));
      }
    });

    var finishGesture = function (e) {
      if (axis === "x") {
        dragShift = 0;
        if (Math.abs(lastDx) > 36) irPara(centerIdx + (lastDx < 0 ? 1 : -1));
        else atualizarPosicoes3D(false);
      } else if (axis === "y") {
        if (Math.abs(lastDy) > 28) isBack = !isBack;
        dragRotOffset = 0;
        atualizarPosicoes3D(false);
      } else if (!moved && e && e.target) {
        var card = e.target.closest(".look-card");
        if (card) {
          var idx = +card.dataset.look;
          if (idx !== centerIdx) irPara(idx);
          else { autoSpin = false; isBack = !isBack; atualizarPosicoes3D(false); }
        }
      }
      startX = null; startY = null; axis = null; dragRotOffset = 0; dragShift = 0;
    };

    track.addEventListener("pointerup", finishGesture);
    track.addEventListener("pointercancel", function () {
      startX = null; startY = null; axis = null; dragRotOffset = 0; dragShift = 0;
      atualizarPosicoes3D(false);
    });

    host.addEventListener("click", function (e) {
      if (e.target.closest("#btnFlipSide")) { autoSpin = false; isBack = !isBack; atualizarPosicoes3D(false); return; }
      if (e.target.closest("#btnAutoSpin")) {
        autoSpin = !autoSpin;
        if (autoSpin) spinAngle = isBack ? Math.PI : 0;
        atualizarPosicoes3D(false);
        return;
      }
      if (e.target.closest("#btnZoom3D")) { zoom3D = !zoom3D; atualizarPosicoes3D(false); return; }
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
        if (sc) sc.loadVariant(st.corIdx);
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

    window.addEventListener("resize", function () { atualizarPosicoes3D(false); });
  }

  document.addEventListener("keydown", function (e) {
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft") irPara(centerIdx - 1);
    else if (e.key === "ArrowRight") irPara(centerIdx + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); autoSpin = false; isBack = !isBack; atualizarPosicoes3D(false); }
  });

  window.Vitrine = { render: render, abrir: function (i) { irPara(i); }, fechar: function () {} };
})();
