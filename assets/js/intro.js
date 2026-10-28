/* Indique a OneX: intro "indique \ receba /" (uma vez por sessão). Roteiro de tempos no bloco "INTRO" de
   assets/css/indique.css.
   O X da OneX são dois eixos, "\" e "/", e o programa são dois verbos, indique e receba: a intro escreve o X numa grade
   de caracteres com esses dois glifos, cruza os dois em cada célula (o X feito de x), deixa uma onda sair do cruzamento
   escrevendo a paisagem do hero em caracteres e, enquanto o X oficial voa para o cabeçalho, uma varredura "/" derrete
   os caracteres nos pontos do hero. A abertura não cobre e revela: ela vira o hero.
   Os glifos são vetoriais (desenhados aqui, não vêm de fonte) e escolhidos pela forma, não só pela luz: bordas fortes
   da paisagem ganham - | / \ na direção do contorno, as áreas claras + x X, as fracas · •, as estrelas *. A célula tem
   a proporção dos eixos do X (altura = 1,16 × largura), então "\" e "/" correm paralelos às peças.
   A paisagem é lida dos próprios canvas do hero (assets/js/parallax.js; com eles ainda carregando, do pôster): o que os
   caracteres mostram é o que os pontos mostram por baixo.
   Infraestrutura da skill efeito-de-intro: decisão no <head> (classe intro-ativa), cobertura CSS com failsafe, dois
   requestAnimationFrame antes de tocar, fim natural + travas (sem quadro em 1,5 s; duração + 2 s; failsafe CSS no
   próprio overlay), pular por Esc, Tab, Enter, teclas de rolagem, roda, toque, clique, rolagem, aba oculta ou mudança
   de tamanho, sessão gravada logo no começo. Aqui a coreografia corre num relógio só (requestAnimationFrame), porque o
   desenho é de canvas: cada quadro é uma função pura do tempo (QA: ?intro=1&ixqa=1 expõe window.__ix.quadro(ms)). */
(function () {
  'use strict';
  var raiz = document.documentElement;
  if (!raiz.classList.contains('intro-ativa')) return;

  var QA = /[?&]ixqa=1\b/.test(location.search);
  var CHAVE = 'onex-indique-intro';
  var X_OFICIAL = 'assets/img/onex-x.webp';
  var X_W = 541, X_H = 458;                 // o X oficial (assets/img/onex-x.webp)
  var LOGO_X = [637, 0, 866, 194, 866, 250]; // o X dentro do logo do cabeçalho (medido no alfa): x0, y0, x1, y1, largura, altura
  var PECAS = {
    a: 'M1.5 69 L134.5 69 L284.5 243 L151.5 243 Z',
    b: 'M414 0 L542 0 L331 244 L265 168 Z',
    c: 'M156.6 273 L309.5 273 L465 458 L335 458 L233 339 L132 458 L0 458 Z'
  };
  var CORTE_C = 233;                         // vértice interno da peça C: à esquerda a perna "/", à direita a "\"
  var CRUZ = [237.39, 267.47];               // cruzamento dos eixos (unidades do X)
  var EIXO_1 = [0.6492, 0.7606];             // "\" : indique (peça A e a perna direita da C)
  var EIXO_2 = [-0.6688, 0.7435];            // "/" : receba (peça B e a perna esquerda da C), de cima para baixo
  var VARRE = [0.6688, -0.7435];             // a varredura que revela o hero: "/" de baixo à esquerda para cima

  /* ---------- roteiro (ms desde que a intro começa a tocar; a tabela comentada está no CSS) ---------- */
  var R = {
    barra: [150, 700],     // "\" se escreve
    contra: [520, 700],    // "/" se escreve
    onda: [1200, 750],     // do cruzamento para fora: "\" e "/" viram X em cada célula; a paisagem aparece
    assenta: [1600, 280],  // o X oficial entra por cima
    saiRotulo: 1950,       // os rótulos se desfazem em caracteres
    voo: [1980, 600],      // o X oficial vai para o cabeçalho
    revela: [1980, 640],   // a frente da varredura (junto com o voo); cada célula leva VIDA ms para virar ponto e abrir
    sobe: 2330,            // --rise-start: o texto do hero começa a subir
    fim: 3000
  };
  var VIDA = 340;
  var FANTASMA = 0.55;     // exposição da paisagem em caracteres antes da varredura
  var ROTULOS = [
    { txt: '\\ INDIQUE', ini: 280, passo: 28 },
    { txt: 'RECEBA /', ini: 640, passo: 28 },
    { txt: '100% DA 1ª PARCELA', ini: 980, passo: 22, laranja: 4 }
  ];

  /* ---------- curvas: tabela da cúbica e a inversa (quando a frente chega a uma célula) ---------- */
  function curva(x1, y1, x2, y2) {
    var N = 512, xs = new Float32Array(N + 1), ys = new Float32Array(N + 1);
    for (var i = 0; i <= N; i++) {
      var t = i / N, u = 1 - t;
      xs[i] = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
      ys[i] = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    }
    var busca = function (a, b, v) {
      if (v <= 0) return 0;
      if (v >= 1) return 1;
      var lo = 0, hi = N;
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (a[m] < v) lo = m; else hi = m; }
      return b[lo] + (b[hi] - b[lo]) * ((v - a[lo]) / ((a[hi] - a[lo]) || 1));
    };
    return { y: function (x) { return busca(xs, ys, x); }, x: function (y) { return busca(ys, xs, y); } };
  }
  var TRACO = curva(0.45, 0, 0.2, 1), ONDA = curva(0.16, 1, 0.3, 1), VARRER = curva(0.5, 0, 0.3, 1);
  var VOO = curva(0.76, 0, 0.24, 1), SAI = curva(0.16, 1, 0.3, 1);
  var limita = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var suave = function (v) { v = limita(v); return v * v * (3 - 2 * v); };

  /* ---------- cor: a rampa dos pontos do hero (preto → laranja #F9681C → branco), em 64 tons ---------- */
  var RAMPA = [[0, 0x2a1206], [0.22, 0x5a2508], [0.45, 0xb5460c], [0.64, 0xf9681c], [0.82, 0xff9a63], [0.94, 0xffdcc6], [1, 0xfff7f2]];
  var FUNDO = '#0A0909';
  var TONS = 64, LARANJA = 0.64;
  var rgb = function (L) {
    var j = 1;
    while (j < RAMPA.length - 1 && L > RAMPA[j][0]) j++;
    var a = RAMPA[j - 1], b = RAMPA[j], u = limita((L - a[0]) / (b[0] - a[0]));
    return [16, 8, 0].map(function (s) { var x = (a[1] >> s) & 255; return Math.round(x + (((b[1] >> s) & 255) - x) * u); });
  };
  // para ler a luz dos pontos do hero de volta: a média dos canais de cada tom da rampa, crescente
  var MEDIA = [];
  for (var q = 0; q <= 100; q++) { var c0 = rgb(q / 100); MEDIA.push((c0[0] + c0[1] + c0[2]) / 765); }
  var luz = function (m) {
    if (m <= MEDIA[0]) return Math.max(0, (m - 0.04) / (MEDIA[0] - 0.04)) * 0.01;
    for (var k = 1; k <= 100; k++) if (m <= MEDIA[k]) return (k - 1 + (m - MEDIA[k - 1]) / (MEDIA[k] - MEDIA[k - 1])) / 100;
    return 1;
  };

  /* ---------- glifos vetoriais ---------- */
  var G = { pt: 0, bola: 1, traco: 2, barra: 3, sobe: 4, desce: 5, mais: 6, xis: 7, xisG: 8, estrela: 9 };
  var RUIDO = [G.pt, G.traco, G.barra, G.sobe, G.desce, G.mais, G.xis];
  var NG = 10;
  // um glifo centrado em (cx, cy) numa célula w × h; as medidas são frações da célula
  function glifo(g, cx, cy, w, h, lw) {
    var ctx2 = atlasCtx;
    var linha = function (ax, ay, bx, by) { ctx2.moveTo(cx + ax * w, cy + ay * h); ctx2.lineTo(cx + bx * w, cy + by * h); };
    ctx2.lineWidth = lw;
    ctx2.beginPath();
    if (g === G.pt || g === G.bola) {
      ctx2.arc(cx, cy, Math.max(lw * 0.55, w * (g === G.pt ? 0.075 : 0.14)), 0, 6.2832);
      ctx2.fill();
      return;
    }
    if (g === G.traco) linha(-0.3, 0, 0.3, 0);
    else if (g === G.barra) linha(0, -0.3, 0, 0.3);
    else if (g === G.sobe) linha(-0.32, 0.32, 0.32, -0.32);
    else if (g === G.desce) linha(-0.32, -0.32, 0.32, 0.32);
    else if (g === G.mais) { linha(-0.22, 0, 0.22, 0); linha(0, -0.22, 0, 0.22); }
    else if (g === G.xis) { linha(-0.22, -0.22, 0.22, 0.22); linha(-0.22, 0.22, 0.22, -0.22); }
    else if (g === G.xisG) { ctx2.lineWidth = lw * 1.3; linha(-0.34, -0.34, 0.34, 0.34); linha(-0.34, 0.34, 0.34, -0.34); }
    else if (g === G.estrela) { linha(-0.2, 0, 0.2, 0); linha(0, -0.2, 0, 0.2); linha(-0.13, -0.13, 0.13, 0.13); linha(-0.13, 0.13, 0.13, -0.13); }
    ctx2.stroke();
  }

  /* ---------- estado ---------- */
  var overlay = null, tela = null, ctx = null, oficial = null, atlas = null, atlasCtx = null;
  var feito = false, tocando = false, pousou = false, timers = [], raf = 0, t0 = 0;
  var W, H, dpr, cwd, chd, cols, rows, n, gx0, gy0, X = {}, alvo = null;
  var xEixo, xL, tX, tW, tD, campoG, campoL, ocupa, buraco, veu, rotulos = [], amostrado = false;
  var FONTE_ROTULO = '';

  function libera() {
    raiz.classList.remove('intro-ativa', 'intro-tocando');
    raiz.style.removeProperty('--rise-start');
  }
  function limpa() {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', aoTeclar, true);
    document.removeEventListener('visibilitychange', aoOcultar);
    document.removeEventListener('wheel', aoGesto, true);
    document.removeEventListener('touchstart', aoGesto, true);
    document.removeEventListener('pointerdown', aoGesto, true);
    window.removeEventListener('scroll', aoGesto);
    window.removeEventListener('resize', aoMudar);
  }
  // natural: o último quadro já é o hero (o overlay está todo aberto), então só sai do DOM.
  // pulando: o overlay apaga em 0,24 s e o cabeçalho e o hero entram na hora.
  function finish(natural) {
    if (feito) return;
    feito = true;
    limpa();
    try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { /* storage bloqueado */ }
    if (!natural) libera();
    if (document.activeElement && overlay && overlay.contains(document.activeElement)) document.activeElement.blur();
    if (!overlay) return;
    if (natural) {
      overlay.parentNode.removeChild(overlay);
      setTimeout(libera, 1600); // depois de o texto do hero assentar (o --rise-start sai sem mexer em nada)
      return;
    }
    overlay.classList.add('ix-pulando'); // continua capturando cliques até sair do DOM
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 280);
  }
  var ROLAGEM = { ' ': 1, PageDown: 1, PageUp: 1, ArrowDown: 1, ArrowUp: 1, End: 1, Home: 1 };
  function aoTeclar(e) {
    if (ROLAGEM[e.key]) { e.preventDefault(); finish(false); }
    else if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') finish(false);
  }
  function aoOcultar() { if (document.hidden) finish(false); }
  function aoMudar() { if (window.innerWidth !== W || window.innerHeight !== H) finish(false); }
  function aoGesto(e) {
    if (e.type === 'pointerdown' && e.pointerType === 'touch') return; // o toque já foi tratado no touchstart
    if (e.cancelable && (e.type === 'wheel' || e.type === 'touchstart')) e.preventDefault();
    if (e.type === 'pointerdown') { e.preventDefault(); e.stopPropagation(); } // o clique que pula não atravessa
    finish(false);
  }

  /* ---------- grade, X e rótulos ---------- */
  function monta() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(W < 600 ? 3 : 2, window.devicePixelRatio || 1);
    // a célula: 13 px de altura no celular, ~1/62 da altura da tela no resto (13–18 px); largura = altura / 1,16
    var ch = W < 600 ? 13 : Math.max(13, Math.min(18, Math.round(H / 62)));
    chd = Math.max(6, Math.round(ch * dpr));
    cwd = Math.max(5, Math.round(ch / 1.16 * dpr));
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    cols = Math.ceil(tela.width / cwd) + 1; rows = Math.ceil(tela.height / chd) + 1; n = cols * rows;
    gx0 = Math.floor((tela.width - cols * cwd) / 2); gy0 = Math.floor((tela.height - rows * chd) / 2);
    FONTE_ROTULO = '600 ' + Math.round(chd * 0.8) + 'px ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace';

    // atlas: cada glifo em cada tom, do tamanho exato da célula (um drawImage 1:1 por célula)
    atlas = document.createElement('canvas');
    atlas.width = cwd * TONS; atlas.height = chd * NG;
    atlasCtx = atlas.getContext('2d');
    atlasCtx.lineCap = 'round';
    var lw = Math.max(1.1 * dpr, cwd * 0.12);
    for (var tom = 0; tom < TONS; tom++) {
      var cor = 'rgb(' + rgb(tom / (TONS - 1)).join(',') + ')';
      atlasCtx.strokeStyle = atlasCtx.fillStyle = cor;
      for (var g = 0; g < NG; g++) glifo(g, tom * cwd + cwd / 2, g * chd + chd / 2, cwd, chd, lw);
    }

    // o X: largo, no meio da tela, com espaço para os rótulos em cima e a legenda embaixo
    X.w = Math.min(W * (W < 600 ? 0.84 : 0.5), H * 0.6 * X_W / X_H, 620);
    X.h = X.w * X_H / X_W;
    X.l = (W - X.w) / 2; X.t = (H - X.h) / 2;
    var s = X.w * dpr / X_W;                       // px do canvas por unidade do X
    var ox = X.l * dpr - gx0, oy = X.t * dpr - gy0;

    // cobertura de cada célula pelos dois eixos: "\" no vermelho, "/" no verde, 4 × 4 amostras por célula
    var SS = 4, rc = document.createElement('canvas');
    rc.width = cols * SS; rc.height = rows * SS;
    var r2 = rc.getContext('2d', { willReadFrequently: true });
    r2.fillStyle = '#000'; r2.fillRect(0, 0, rc.width, rc.height);
    r2.globalCompositeOperation = 'lighter';
    r2.setTransform(s * SS / cwd, 0, 0, s * SS / chd, ox * SS / cwd, oy * SS / chd);
    var pa = new Path2D(PECAS.a), pb = new Path2D(PECAS.b), pc = new Path2D(PECAS.c);
    r2.fillStyle = '#f00'; r2.fill(pa);
    r2.save(); r2.beginPath(); r2.rect(CORTE_C, 200, 400, 300); r2.clip(); r2.fill(pc); r2.restore();
    r2.fillStyle = '#0f0'; r2.fill(pb);
    r2.save(); r2.beginPath(); r2.rect(-100, 200, CORTE_C + 100, 300); r2.clip(); r2.fill(pc); r2.restore();
    var px = r2.getImageData(0, 0, rc.width, rc.height).data;

    xEixo = new Uint8Array(n); xL = new Float32Array(n); tX = new Float32Array(n);
    tW = new Float32Array(n); tD = new Float32Array(n);
    campoG = new Int8Array(n).fill(-1); campoL = new Float32Array(n);
    ocupa = new Uint8Array(n); buraco = new Uint8Array(n); veu = new Float32Array(n);
    var proj = new Float32Array(n), faixa = [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]];
    var cx = X.l * dpr + CRUZ[0] * s, cy = X.t * dpr + CRUZ[1] * s;   // cruzamento, em px do canvas
    var dMax = 0;
    [[0, 0], [tela.width, 0], [0, tela.height], [tela.width, tela.height]].forEach(function (p) { dMax = Math.max(dMax, Math.hypot(p[0] - cx, p[1] - cy)); });
    var vTot = VARRE[0] * tela.width - VARRE[1] * tela.height;        // do canto de baixo à esquerda ao de cima à direita

    for (var r = 0, i = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++, i++) {
        var a1 = 0, a2 = 0;
        for (var yy = 0; yy < SS; yy++) for (var xx = 0; xx < SS; xx++) {
          var k = (((r * SS + yy) * rc.width) + c * SS + xx) * 4;
          a1 += px[k]; a2 += px[k + 1];
        }
        a1 /= 255 * SS * SS; a2 /= 255 * SS * SS;
        var mx = gx0 + (c + 0.5) * cwd, my = gy0 + (r + 0.5) * chd;
        if (a1 + a2 >= 0.2) {
          var e = a1 >= a2 ? 1 : 2, eixo = e === 1 ? EIXO_1 : EIXO_2;
          xEixo[i] = e;
          // células da borda, parcialmente cobertas, ficam mais escuras (o contorno não serrilha)
          xL[i] = LARANJA * (0.5 + 0.5 * Math.min(1, (a1 + a2) * 1.25));
          proj[i] = ((mx - X.l * dpr) / s - CRUZ[0]) * eixo[0] + ((my - X.t * dpr) / s - CRUZ[1]) * eixo[1];
          faixa[e][0] = Math.min(faixa[e][0], proj[i]); faixa[e][1] = Math.max(faixa[e][1], proj[i]);
        }
        tW[i] = R.onda[0] + R.onda[1] * ONDA.x(Math.hypot(mx - cx, my - cy) / dMax);
        // véu: enquanto o X está no meio, a paisagem atrás dele e dos rótulos fica a 35% (uma elipse de borda suave)
        veu[i] = 1 - suave((Math.hypot((mx / dpr - X.l - X.w / 2) / (X.w * 0.62), (my / dpr - X.t - X.h / 2) / (X.h * 0.68)) - 0.8) / 0.45);
        var v = mx * VARRE[0] + (my - tela.height) * VARRE[1];          // 0 no canto de baixo à esquerda
        tD[i] = R.revela[0] + R.revela[1] * VARRER.x(v / vTot);
      }
    }
    for (i = 0; i < n; i++) {
      if (!xEixo[i]) continue;
      var f = faixa[xEixo[i]], seg = xEixo[i] === 1 ? R.barra : R.contra;
      tX[i] = seg[0] + seg[1] * TRACO.x((proj[i] - f[0]) / ((f[1] - f[0]) || 1));
    }

    // rótulos na própria grade: "\ INDIQUE" sobre o início do "\", "RECEBA /" sobre o início do "/", a legenda embaixo
    var col = function (x) { return Math.floor((x * dpr - gx0) / cwd); };
    var lin = function (y) { return Math.floor((y * dpr - gy0) / chd); };
    var u = X.w / X_W;
    var lugares = [
      [col(X.l + 1.5 * u), lin(X.t + 69 * u) - 2],
      [col(X.l + 541 * u) - ROTULOS[1].txt.length + 1, lin(X.t) - 2],
      [col(X.l + X.w / 2) - Math.floor(ROTULOS[2].txt.length / 2), lin(X.t + X.h) + 2]
    ];
    rotulos = ROTULOS.map(function (ro, j) {
      var c0 = Math.max(0, Math.min(cols - ro.txt.length, lugares[j][0])), r0 = Math.max(0, Math.min(rows - 1, lugares[j][1]));
      var celulas = [];
      for (var k = 0; k < ro.txt.length; k++) celulas.push(r0 * cols + c0 + k);
      // a linha do rótulo fica limpa, com uma célula de respiro de cada lado
      for (k = Math.max(0, c0 - 1); k <= Math.min(cols - 1, c0 + ro.txt.length); k++) ocupa[r0 * cols + k] = 1;
      return { txt: ro.txt, ini: ro.ini, passo: ro.passo, laranja: ro.laranja || 0, celulas: celulas };
    });

    // onde o X pousa: o X dentro do logo do cabeçalho (medido no logo oficial)
    var logo = document.querySelector('.topo .logo');
    if (logo) {
      var lr = logo.getBoundingClientRect();
      if (lr.width > 0) {
        var kx = lr.width / LOGO_X[4], ky = lr.height / LOGO_X[5];
        alvo = { cx: lr.left + (LOGO_X[0] + LOGO_X[2]) / 2 * kx, cy: lr.top + (LOGO_X[1] + LOGO_X[3]) / 2 * ky, w: (LOGO_X[2] - LOGO_X[0]) * kx };
        // depois do pouso, a grade abre em volta do logo inteiro (o nome entra da esquerda ali)
        var c1 = col(lr.left - 8), c2 = col(lr.right + 8), l1 = lin(lr.top - 8), l2 = lin(lr.bottom + 8);
        for (var rr = Math.max(0, l1); rr <= Math.min(rows - 1, l2); rr++) for (var cc = Math.max(0, c1); cc <= Math.min(cols - 1, c2); cc++) buraco[rr * cols + cc] = 1;
      }
    }

    oficial.style.width = X.w + 'px';
    oficial.style.height = X.h + 'px';
    oficial.style.left = X.l + 'px';
    oficial.style.top = X.t + 'px';
  }

  /* ---------- a paisagem em caracteres, lida do hero ---------- */
  function fonteCena() {
    var secao = document.querySelector('[data-parallax]');
    if (!secao) return null;
    var camadas = secao.querySelectorAll('canvas.parallax__camada');
    if (secao.classList.contains('pronto') && camadas.length) {
      return function (g, mapa) {
        for (var i = 0; i < camadas.length; i++) {
          var r = camadas[i].getBoundingClientRect(), m = mapa(r.left, r.top, r.width, r.height);
          if (camadas[i].width) g.drawImage(camadas[i], m[0], m[1], m[2], m[3]);
        }
      };
    }
    // o pôster só serve num servidor: em file:// o navegador não deixa ler os pixels dele (os canvas do hero, sim:
    // lá as camadas vêm em data URI), então ali a intro espera pelos canvas
    var poster = location.protocol === 'file:' ? null : secao.querySelector('.parallax__poster');
    if (poster && poster.complete && poster.naturalWidth) {
      return function (g, mapa) {
        var r = poster.getBoundingClientRect(), pos = (getComputedStyle(poster).objectPosition || '50% 50%').split(' ');
        var esc = Math.max(r.width / poster.naturalWidth, r.height / poster.naturalHeight);
        var w = poster.naturalWidth * esc, h = poster.naturalHeight * esc;
        var m = mapa(r.left + (r.width - w) * (parseFloat(pos[0]) / 100 || 0.5), r.top + (r.height - h) * (parseFloat(pos[1]) / 100 || 0.5), w, h);
        g.drawImage(poster, m[0], m[1], m[2], m[3]);
      };
    }
    return null;
  }
  function amostra() {
    if (amostrado) return;
    var fonte = fonteCena();
    if (!fonte) return;
    amostrado = true;
    var S = 2, sw = cols * S, sh = rows * S;
    var c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = FUNDO; g.fillRect(0, 0, sw, sh);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    var ex = S * dpr / cwd, ey = S * dpr / chd;
    var d;
    try {
      fonte(g, function (x, y, w, h) { return [(x * dpr - gx0) / dpr * ex, (y * dpr - gy0) / dpr * ey, w * ex, h * ey]; });
      d = g.getImageData(0, 0, sw, sh).data;
    } catch (e) { return; } // imagem de outra origem (file:// com o pôster): fica sem paisagem
    var Lm = new Float32Array(n), Lx = new Float32Array(n);
    for (var r = 0, i = 0; r < rows; r++) {
      for (var cc = 0; cc < cols; cc++, i++) {
        var soma = 0, maior = 0;
        for (var yy = 0; yy < S; yy++) for (var xx = 0; xx < S; xx++) {
          var k = ((r * S + yy) * sw + cc * S + xx) * 4, m = (d[k] + d[k + 1] + d[k + 2]) / 765;
          soma += m; if (m > maior) maior = m;
        }
        // os pontos do hero não enchem a célula (há o preto entre eles): a média é corrigida para a luz do ponto
        Lm[i] = Math.min(1, luz(soma / (S * S)) * 1.3);
        Lx[i] = luz(maior);
      }
    }
    // glifo pela forma: borda forte vira traço na direção do contorno; o resto, pela luz
    for (r = 0, i = 0; r < rows; r++) {
      for (cc = 0; cc < cols; cc++, i++) {
        var L = Lm[i];
        if (r > 0 && r < rows - 1 && cc > 0 && cc < cols - 1) {
          var a = Lm[i - cols - 1], b = Lm[i - cols], c2 = Lm[i - cols + 1], e = Lm[i - 1], f = Lm[i + 1], h = Lm[i + cols - 1], k2 = Lm[i + cols], l = Lm[i + cols + 1];
          var gx = (c2 + 2 * f + l) - (a + 2 * e + h), gy = (h + 2 * k2 + l) - (a + 2 * b + c2);
          var forca = Math.hypot(gx, gy);
          if (forca > 0.9 && L > 0.14) {
            // direção da borda (perpendicular ao gradiente), em graus de 0 a 180, com y para baixo
            var ang = (Math.atan2(gx, -gy) * 180 / Math.PI + 180) % 180;
            campoG[i] = ang < 22.5 || ang >= 157.5 ? G.traco : ang < 67.5 ? G.desce : ang < 112.5 ? G.barra : G.sobe;
            campoL[i] = Math.max(L, 0.3);
            continue;
          }
        }
        if (Lx[i] > 0.26 && L < 0.22) { campoG[i] = G.estrela; campoL[i] = Math.min(1, Lx[i] * 1.6); continue; }
        if (L < 0.07) continue;
        campoG[i] = L < 0.17 ? G.pt : L < 0.3 ? G.bola : L < 0.5 ? G.mais : L < 0.72 ? G.xis : G.xisG;
        campoL[i] = L;
      }
    }
  }

  /* ---------- um quadro: tudo é função de t ---------- */
  var hash = function (i, k) { var h = (i * 374761393 + k * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };
  function poe(g, L, i, esc) {
    var tom = Math.round(limita(L) * (TONS - 1));
    var x = gx0 + (i % cols) * cwd, y = gy0 + ((i / cols) | 0) * chd;
    if (esc === 1) ctx.drawImage(atlas, tom * cwd, g * chd, cwd, chd, x, y, cwd, chd);
    else {
      var w = cwd * esc, h = chd * esc;
      ctx.drawImage(atlas, tom * cwd, g * chd, cwd, chd, x + (cwd - w) / 2, y + (chd - h) / 2, w, h);
    }
  }
  function fundo(i, t) {
    if (pousou && buraco[i]) return 0;
    var dv = (t - tD[i]) / VIDA;
    return dv <= 0.7 ? 1 : dv >= 1 ? 0 : 1 - (dv - 0.7) / 0.3;
  }
  function quadro(t) {
    if (t >= R.onda[0] - 100) amostra();
    pousou = t >= R.voo[0] + R.voo[1];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, tela.width, tela.height);

    // 1. o fundo: inteiro até a varredura; depois, por linha, só onde ela ainda não abriu
    ctx.fillStyle = FUNDO;
    if (t < R.revela[0]) ctx.fillRect(0, 0, tela.width, tela.height);
    else {
      for (var r = 0; r < rows; r++) {
        var ini = -1, y = gy0 + r * chd;
        for (var c = 0; c <= cols; c++) {
          var a = c < cols ? fundo(r * cols + c, t) : -1;
          if (a === 1) { if (ini < 0) ini = c; continue; }
          if (ini >= 0) { ctx.fillRect(gx0 + ini * cwd, y, (c - ini) * cwd, chd); ini = -1; }
          if (a > 0) { ctx.globalAlpha = a; ctx.fillRect(gx0 + c * cwd, y, cwd, chd); ctx.globalAlpha = 1; }
        }
      }
    }

    // 2. os caracteres: o X enquanto ele está na grade; a paisagem depois que a onda passa
    var fimX = R.assenta[0] + R.assenta[1], fimRot = R.saiRotulo + 300;
    var apaga = 1 - suave((t - R.assenta[0]) / R.assenta[1]);              // o X de caracteres esfria sob o oficial
    var solta = 0.65 * (1 - suave((t - R.voo[0]) / 450));                  // o véu em volta do X sai com o voo
    for (var i = 0; i < n; i++) {
      var dv = (t - tD[i]) / VIDA;
      if (dv >= 1 || (pousou && buraco[i])) continue;
      if (xEixo[i] && t < fimX) {
        if (t < tX[i]) continue;
        if (t < tW[i]) poe(xEixo[i] === 1 ? G.desce : G.sobe, xL[i] + (1 - xL[i]) * (1 - suave((t - tX[i]) / 260)), i, 1);
        else poe(G.xisG, (xL[i] + (1 - xL[i]) * (1 - suave((t - tW[i]) / 320))) * apaga, i, 1);
        continue;
      }
      if ((ocupa[i] && t < fimRot) || campoG[i] < 0 || t < tW[i]) continue;
      var k = FANTASMA, onda = t - tW[i], g = campoG[i], esc = 1, branco = 0;
      if (onda < 180) k += (1 - FANTASMA) * 0.55 * (1 - onda / 180);   // a frente da onda acende de leve
      k *= 1 - solta * veu[i];
      if (dv > 0) {
        k = dv < 0.18 ? k + (1 - k) * dv / 0.18 : 1;
        if (dv < 0.1) branco = 1 - dv / 0.1;
        if (dv > 0.3) esc = Math.max(0.3, 1 - (dv - 0.3) / 0.3);         // o caractere encolhe…
        if (dv > 0.5) { g = G.bola; esc = 1; }                            // …e vira ponto
      }
      var L = Math.min(1, campoL[i] * k);
      L += (1 - L) * branco * 0.7;
      var al = dv > 0.7 ? fundo(i, t) : 1;
      if (al < 1) ctx.globalAlpha = al;
      poe(g, L, i, esc);
      if (al < 1) ctx.globalAlpha = 1;
    }

    // 3. os rótulos: cada caractere passa por dois ou três glifos antes de assentar e se desfaz do mesmo jeito
    ctx.font = FONTE_ROTULO;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rotulos.forEach(function (ro) {
      for (var j = 0; j < ro.celulas.length; j++) {
        var ch = ro.txt[j], i2 = ro.celulas[j];
        if (ch === ' ') continue;
        var chega = ro.ini + j * ro.passo, sai = R.saiRotulo + j * 15;
        if (t < chega - 150 || t >= sai + 110) continue;
        var ruido = t < chega || t >= sai;
        if (ruido) { poe(RUIDO[hash(i2, Math.floor(t / 45)) % RUIDO.length], 0.86, i2, 1); continue; }
        if (ch === '\\' || ch === '/') { poe(ch === '/' ? G.sobe : G.desce, LARANJA, i2, 1); continue; }
        ctx.fillStyle = j < ro.laranja ? '#F9681C' : 'rgba(255,255,254,0.9)';
        ctx.fillText(ch, gx0 + ((i2 % cols) + 0.5) * cwd, gy0 + (((i2 / cols) | 0) + 0.56) * chd);
      }
    });

    // 4. o X oficial: entra por cima do X de caracteres e voa até o cabeçalho
    var op = t < R.assenta[0] ? 0 : SAI.y((t - R.assenta[0]) / R.assenta[1]), tr = 'none';
    if (alvo && t >= R.voo[0]) {
      var p = VOO.y((t - R.voo[0]) / R.voo[1]);
      var esc2 = Math.pow(alvo.w / X.w, p);                             // escala exponencial: zoom de velocidade constante
      var cx = X.l + X.w / 2 + (alvo.cx - X.l - X.w / 2) * p, cy = X.t + X.h / 2 + (alvo.cy - X.t - X.h / 2) * p;
      tr = 'translate(' + (cx - esc2 * X.w / 2 - X.l).toFixed(2) + 'px,' + (cy - esc2 * X.h / 2 - X.t).toFixed(2) + 'px) scale(' + esc2.toFixed(4) + ')';
    }
    if (pousou) {
      op = 0;
      if (!raiz.classList.contains('ix-pousou') && !QA) raiz.classList.add('ix-pousou'); // o X do cabeçalho assume
    }
    oficial.style.opacity = op ? op.toFixed(3) : '0';
    oficial.style.transform = tr;
  }

  function anda(agora) {
    if (feito) return;
    var t = agora - t0;
    quadro(t);
    if (t >= R.fim) { finish(true); return; }
    raf = requestAnimationFrame(anda);
  }

  try {
    if (!QA && (performance.now() > 3000 || window.pageYOffset > 4)) throw new Error('chegou tarde');
    if (!QA) try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { /* storage bloqueado: a intro roda, mas não lembra */ }
    overlay = document.createElement('div');
    overlay.className = 'ix';
    overlay.setAttribute('aria-hidden', 'true');
    tela = document.createElement('canvas');
    tela.className = 'ix__tela';
    ctx = tela.getContext('2d');
    if (!ctx || typeof Path2D === 'undefined') throw new Error('sem canvas');
    oficial = document.createElement('img');
    oficial.className = 'ix__x';
    oficial.alt = '';
    oficial.decoding = 'async';
    oficial.src = X_OFICIAL;
    overlay.appendChild(tela);
    overlay.appendChild(oficial);
    document.body.appendChild(overlay);
    monta();
    quadro(0);

    if (QA) {
      // quadros exatos para a verificação: window.__ix.quadro(ms) desenha aquele instante
      window.__ix = { R: R, quadro: function (t) { quadro(t); return true; }, sai: function () { finish(true); } };
      raiz.classList.remove('intro-ativa');
      raiz.classList.add('intro-tocando');
      return;
    }

    document.addEventListener('keydown', aoTeclar, true);
    document.addEventListener('visibilitychange', aoOcultar);
    document.addEventListener('wheel', aoGesto, { capture: true, passive: false });
    document.addEventListener('touchstart', aoGesto, { capture: true, passive: false });
    document.addEventListener('pointerdown', aoGesto, true);
    window.addEventListener('scroll', aoGesto, { passive: true });
    window.addEventListener('resize', aoMudar);

    var toca = function () {
      if (feito || tocando) return;
      tocando = true;
      // o overlay já pinta o próprio fundo: a cobertura do <head> sai e a varredura pode abrir para o hero
      raiz.classList.remove('intro-ativa');
      raiz.classList.add('intro-tocando');
      // cabeçalho e hero entram em R.sobe. Os atrasos deles contam a partir do instante em que as animações de entrada
      // nasceram (a primeira pintura, que pode demorar), então o valor é "agora − esse instante + R.sobe".
      var ref = document.querySelector('.h1__a');
      var anims = ref && ref.getAnimations ? ref.getAnimations() : [];
      var nasceu = anims.length && anims[0].startTime != null ? anims[0].startTime : performance.now();
      raiz.style.setProperty('--rise-start', ((performance.now() - nasceu + R.sobe) / 1000).toFixed(2) + 's');
      t0 = performance.now();
      raf = requestAnimationFrame(anda);
    };
    requestAnimationFrame(function () { requestAnimationFrame(toca); });
    timers.push(setTimeout(toca, 250));                                                     // aba sem rAF
    timers.push(setTimeout(function () { if (!tocando) finish(false); }, 1500));
    timers.push(setTimeout(function () { finish(false); }, R.fim + 2000));
  } catch (erro) {
    finish(false);
  }
})();
