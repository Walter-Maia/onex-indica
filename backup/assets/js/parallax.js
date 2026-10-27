/* Parallax do hero (index-parallax.html e index-parallax-visita.html): a mesma ideia do "Parallax" do Osmo
   (osmo.supply), sem GSAP nem Lenis. São quatro camadas presas no hero que descem em velocidades diferentes enquanto a
   página sobe: as serras de Minas ao fundo (70% da própria altura), a OneX no morro (55%), o texto (40%) e as pedras
   da frente (10%). Com isso o texto afunda atrás das pedras ao rolar.
   As camadas (fotos geradas no Higgsfield, em tons de cinza, com fundo transparente) são desenhadas em pontos com a
   mesma receita da visita (assets/js/visita.js): uma amostra por célula, reforço de contraste local, contraste 115%,
   raio que cresce com a luz, a rampa preto → laranja #F9681C → branco e o brilho (bloom 45%). Aqui cada camada vira
   um canvas 2D desenhado uma vez por tamanho de tela, e a rolagem só move os canvas (transform, na GPU).
   Só roda com html.parallax-on (decidido no <head>: JS e sem ?fx=0). Com movimento reduzido, os pontos aparecem mas
   nada se mexe. Sem JS, ?fx=0 ou se algo falhar: o pôster em pontos (imagem) fica atrás do texto. */
(function () {
  'use strict';

  var doc = document;
  var raiz = doc.documentElement;
  var secao = doc.querySelector('[data-parallax]');
  if (!secao || !raiz.classList.contains('parallax-on')) return;

  var texto = secao.querySelector('[data-camada="texto"]');
  var tela = secao.classList.contains('parallax--tela');
  var desliga = function () { raiz.classList.remove('parallax-on'); };
  var parado = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- efeito: os parâmetros do "Sunset" da visita ---------- */
  var EFEITO = {
    celula: 5,        // px CSS (4 no celular)
    celulaEstreita: 4,
    contraste: 1.15,
    nitidez: 0.6,     // a célula contra a média da vizinhança (~6 células)
    gama: 0.8,        // raio = luz^gama
    ponto: 0.96,      // diâmetro máximo, em células
    minimo: 0.05,     // abaixo disso, sem ponto
    halo: 0.45        // bloom
  };
  var RAMPA = [[0, 0x2a1206], [0.22, 0x5a2508], [0.45, 0xb5460c], [0.64, 0xf9681c], [0.82, 0xff9a63], [0.94, 0xffdcc6], [1, 0xfff7f2]];
  var BASE = '#0A0909';
  var SOBRA = 0.175;  // as camadas passam 17,5% acima do hero (como no Osmo): ao descer, o topo delas não aparece

  /* ---------- camadas ----------
     desce: quanto a camada desce (em frações da própria altura) enquanto o hero sai da tela; luz: exposição (as fotos são escuras: a noite);
     opaca: cobre a tela inteira (a de trás); a: ponto da foto (frações) que fica no ponto e da tela (frações do hero);
     k: largura mínima da foto, em larguras de tela. A foto cresce o que for preciso para cobrir as laterais (e, na
     opaca, também o alto e a base); nas recortadas, abaixo da foto continua o chão escuro. [paisagem, retrato] */
  var CAMADAS = [
    { nome: 'serra', src: 'assets/img/parallax/1-serra.webp', desce: 0.7, luz: 2.4, opaca: true,
      a: [[0.5, 0.49], [0.5, 0.49]], e: [[0.66, 0.5], [0.5, 0.24]], k: [1, 1] },
    // a OneX (o centro do prédio, em 0,5 × 0,43 da foto) fica à direita do texto na paisagem e no vão entre o cabeçalho
    // e o texto no retrato (os pontos e da serra e da OneX saem da medida do texto, em medeTexto)
    { nome: 'onex', src: 'assets/img/parallax/2-onex.webp', desce: 0.55, luz: 2.1,
      a: [[0.5, 0.43], [0.5, 0.43]], e: [[0.7, 0.5], [0.5, 0.22]], k: [1.4, 2.3] },
    { nome: 'frente', src: 'assets/img/parallax/4-frente.webp', desce: 0.1, luz: 1.5,
      a: [[0.5, 1], [0.62, 1]], e: [[0.5, 1], [0.5, 1]], k: [1, 1.5] }
  ];
  var TEXTO = 0.4;
  CAMADAS.forEach(function (c) { c.tela = secao.querySelector('[data-camada="' + c.nome + '"]'); });
  if (!texto || CAMADAS.some(function (c) { return !c.tela || !c.tela.getContext; })) { desliga(); return; }

  var cores = [];  // 64 tons da rampa
  for (var i = 0; i < 64; i++) {
    var L = i / 63, j = 1;
    while (j < RAMPA.length - 1 && L > RAMPA[j][0]) j++;
    var a0 = RAMPA[j - 1], b0 = RAMPA[j], u = Math.max(0, Math.min(1, (L - a0[0]) / (b0[0] - a0[0])));
    var rgb = [16, 8, 0].map(function (sh) { var x = (a0[1] >> sh) & 255; return Math.round(x + (((b0[1] >> sh) & 255) - x) * u); });
    cores.push('rgb(' + rgb.join(',') + ')');
  }

  /* ---------- medidas ---------- */
  var W = 0, H = 0, retrato = false, px = 1, cd = 5;
  var amostra = doc.createElement('canvas'), borrada = doc.createElement('canvas'), miuda = doc.createElement('canvas'), pontos = doc.createElement('canvas');
  var ctx = function (c) { return c.getContext('2d', { willReadFrequently: true }); };

  // onde a foto fica dentro do canvas da camada (px CSS; o canvas começa SOBRA × H acima do hero)
  var lugar = function (c) {
    var o = retrato ? 1 : 0, a = c.a[o], e = c.e[o], razao = c.img.naturalHeight / c.img.naturalWidth;
    var iw = c.k[o] * W;
    if (a[0] > 0) iw = Math.max(iw, e[0] * W / a[0]);
    if (a[0] < 1) iw = Math.max(iw, (1 - e[0]) * W / (1 - a[0]));
    if (c.opaca) {
      if (a[1] > 0) iw = Math.max(iw, (e[1] + SOBRA) * H / a[1] / razao);
      if (a[1] < 1) iw = Math.max(iw, (1 - e[1]) * H / (1 - a[1]) / razao);
    }
    var ih = iw * razao;
    return { x: e[0] * W - a[0] * iw, y: e[1] * H - a[1] * ih + SOBRA * H, w: iw, h: ih };
  };

  // a camada em pontos: uma amostra por célula (a média sai da redução da foto), o reforço de contraste local contra a
  // média de ~6 células, e um ponto por célula com raio pela luz. Embaixo, a silhueta da foto em preto (tampa as
  // camadas de trás); por cima, o brilho (os pontos borrados, somados)
  var desenha = function (c) {
    var tela = c.tela, cw = Math.round(W * px), ch = Math.round(H * (1 + SOBRA) * px);
    tela.width = cw; tela.height = ch;
    var g = tela.getContext('2d');
    var r = lugar(c), k = px / cd;
    var cols = Math.ceil(cw / cd), rows = Math.ceil(ch / cd);
    var chao = r.y + r.h;  // base da foto (px CSS no canvas): abaixo dela, chão escuro

    amostra.width = cols; amostra.height = rows;
    var s = ctx(amostra);
    s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high';
    s.drawImage(c.img, r.x * k, r.y * k, r.w * k, r.h * k);
    var d = s.getImageData(0, 0, cols, rows).data;
    miuda.width = Math.max(1, Math.round(cols / 6)); miuda.height = Math.max(1, Math.round(rows / 6));
    var m = ctx(miuda);
    m.imageSmoothingEnabled = true; m.imageSmoothingQuality = 'high';
    m.drawImage(amostra, 0, 0, miuda.width, miuda.height);
    borrada.width = cols; borrada.height = rows;
    var b = ctx(borrada);
    b.imageSmoothingEnabled = true;
    b.drawImage(miuda, 0, 0, cols, rows);
    var v = b.getImageData(0, 0, cols, rows).data;

    // um caminho por tom e por faixa de opacidade (a borda recortada da foto)
    var caminhos = {};
    for (var y = 0, i = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++, i += 4) {
        var A = d[i + 3] / 255;
        if (A < 0.04) continue;
        var base = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        var viz = v[i + 3] ? (0.2126 * v[i] + 0.7152 * v[i + 1] + 0.0722 * v[i + 2]) / 255 : base;
        var L = ((base + (base - viz) * EFEITO.nitidez) * c.luz - 0.5) * EFEITO.contraste + 0.5;
        if (L < EFEITO.minimo) continue;
        if (L > 1) L = 1;
        var raio = Math.min(Math.pow(L, EFEITO.gama), 1) * EFEITO.ponto * 0.5 * cd;
        var chave = Math.round(L * 63) * 4 + (A > 0.9 ? 3 : A > 0.6 ? 2 : A > 0.3 ? 1 : 0);
        var p = caminhos[chave] || (caminhos[chave] = new Path2D());
        var cx = (x + 0.5) * cd, cy = (y + 0.5) * cd;
        p.moveTo(cx + raio, cy);
        p.arc(cx, cy, raio, 0, 6.2832);
      }
    }
    pontos.width = cw; pontos.height = ch;
    var q = pontos.getContext('2d');
    Object.keys(caminhos).forEach(function (chave) {
      q.globalAlpha = [0.25, 0.5, 0.75, 1][chave % 4];
      q.fillStyle = cores[chave >> 2];
      q.fill(caminhos[chave]);
    });

    // silhueta (a foto inteira na opaca; o recorte da foto e o chão abaixo dela nas outras)
    g.fillStyle = BASE;
    if (c.opaca) g.fillRect(0, 0, cw, ch);
    else {
      g.drawImage(c.img, r.x * px, r.y * px, r.w * px, r.h * px);
      g.globalCompositeOperation = 'source-in';
      g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over';
      if (chao * px < ch) g.fillRect(0, Math.floor(chao * px) - 1, cw, ch);
    }
    // brilho: só onde o navegador sabe borrar no canvas (sem isso, os pontos ficam sem halo)
    if (typeof g.filter === 'string') {
      g.save();
      g.filter = 'blur(' + (cd * 1.6).toFixed(1) + 'px)';
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = EFEITO.halo;
      g.drawImage(pontos, 0, 0);
      g.restore();
    }
    g.drawImage(pontos, 0, 0);
  };

  var prontas = 0, medida = '';
  var desenhaTudo = function () {
    CAMADAS.forEach(function (c) { if (c.img) desenha(c); });
  };
  // a OneX não fica atrás do texto: na paisagem, no meio da sobra à direita da coluna de texto (notebooks baixos e
  // celular deitado têm o texto mais largo); no retrato, no meio do vão entre o cabeçalho e o topo do texto.
  // Devolve a medida, para só redesenhar quando ela muda (as fontes chegam depois)
  var medeTexto = function () {
    var filhos = [].filter.call(texto.children, function (el) { return el.offsetHeight > 0; });
    if (!filhos.length) return medida;
    var topo = Math.min.apply(null, filhos.map(function (el) { return el.offsetTop; }));
    var borda = Math.max.apply(null, filhos.map(function (el) { return el.offsetLeft + el.offsetWidth; })) / W;
    var barra = doc.querySelector('.topo__barra');
    var cab = barra ? barra.offsetTop + barra.offsetHeight : 80;  // o cabeçalho é fixo no topo
    var serra = CAMADAS[0], onex = CAMADAS[1];
    if (retrato) {
      onex.e[1][1] = Math.max(0.12, (cab + topo) / 2 / H);
      serra.e[1][1] = onex.e[1][1] + 0.02;
    } else {
      onex.e[0][0] = Math.min(0.8, Math.max(0.66, borda + (1 - borda) * 0.5));
      serra.e[0][0] = onex.e[0][0] - 0.04;
    }
    return [W, H, onex.e[0][0], onex.e[1][1]].map(function (n) { return n.toFixed(3); }).join();
  };
  var ajusta = function (forca) {
    var w = secao.clientWidth, h = secao.clientHeight;
    if (!forca && w === W && h === H) return;
    W = w; H = h;
    retrato = W / H < 0.9;
    px = Math.min(2, window.devicePixelRatio || 1);
    // a célula tem um número inteiro de pixels do canvas (pontos iguais também com a escala de 125% ou 150% do Windows)
    cd = Math.max(3, Math.round((W < 600 ? EFEITO.celulaEstreita : EFEITO.celula) * px));
    medida = medeTexto();
    desenhaTudo();
    move();
  };

  /* ---------- rolagem: cada camada desce a fração dela enquanto o hero sai pela parte de cima da tela ---------- */
  var raf = 0, naTela = true;
  var move = function () {
    raf = 0;
    var p = 0;
    if (!parado.matches) {
      var rt = secao.getBoundingClientRect();
      p = Math.max(0, Math.min(1, -rt.top / rt.height));
    }
    CAMADAS.forEach(function (c) { c.tela.style.transform = 'translate3d(0,' + (p * c.desce * H * (1 + SOBRA)).toFixed(1) + 'px,0)'; });
    texto.style.transform = p ? 'translate3d(0,' + (p * TEXTO * H).toFixed(1) + 'px,0)' : '';
    // em tela cheia (sem a barra do cabeçalho), o texto apaga enquanto sai, em vez de passar por baixo da marca
    if (tela) { var f = Math.min(1, Math.max(0, (p - 0.1) / 0.32)); texto.style.opacity = f ? (1 - f * f * (3 - 2 * f)).toFixed(3) : ''; }
  };
  var pede = function () { if (!raf && naTela) raf = requestAnimationFrame(move); };

  /* ---------- fotos (em file://, embutidas em assets/js/parallax-camadas.js: lá o navegador não deixa ler os pixels) ---------- */
  var fontes = function (depois) {
    if (location.protocol !== 'file:' || window.PARALLAX_CAMADAS) { depois(); return; }
    var s = doc.createElement('script');
    s.src = 'assets/js/parallax-camadas.js';
    s.onload = depois;
    s.onerror = desliga;
    doc.head.appendChild(s);
  };
  var carrega = function (c) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      c.img = img;
      try { desenha(c); } catch (erro) { desliga(); return; }  // pixels ilegíveis: fica o pôster
      if (++prontas === CAMADAS.length) secao.classList.add('pronto');
    };
    img.onerror = desliga;
    img.src = (window.PARALLAX_CAMADAS && window.PARALLAX_CAMADAS[c.src]) || c.src;
  };

  try {
    ajusta(true);
    fontes(function () { CAMADAS.forEach(carrega); });
  } catch (erro) {
    desliga();
    return;
  }

  window.addEventListener('scroll', pede, { passive: true });
  var espera = 0;
  var redesenha = function () { clearTimeout(espera); espera = setTimeout(function () { ajusta(false); }, 150); };
  window.addEventListener('resize', redesenha);
  if ('ResizeObserver' in window) new ResizeObserver(redesenha).observe(secao);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { var m = medeTexto(); if (m !== medida) { medida = m; desenhaTudo(); } });
  if (parado.addEventListener) parado.addEventListener('change', pede);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) { naTela = entradas[0].isIntersecting; if (naTela) pede(); }).observe(secao);
  }
})();
