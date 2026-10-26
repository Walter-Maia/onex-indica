/* Visita à OneX: o hero da landing de indicação. A rolagem leva a pessoa para dentro da OneX (fachada → corredor →
   rack → rede → storage → telefonia → o X) e cada parada mostra produtos que dá para indicar.
   As cenas (fotos ilustrativas geradas no Higgsfield) são desenhadas em pontos: o efeito "Sunset" do editor ASCII do
   21st.dev (renderMode "dots"), refeito em Canvas2D com a paleta da OneX:
     1. a cena da vez (e, na troca, a próxima, que nasce pequena no ponto para onde a câmera entra) é desenhada numa
        tela pequena de amostragem, 2 × 2 pixels por célula de 10 px (8 px no celular);
     2. cada célula vira um ponto: luminância média com contraste 115%; o raio cresce com a luz (sem ponto no preto) e a
        cor sai de uma rampa preto → laranja #F9681C → branco (o "tint" #ff3b1f em overlay do original, trocado pelo
        laranja da OneX). Os pontos vêm prontos de um atlas (cor × raio), um drawImage por célula;
     3. fundo sólido com 10% da foto borrada por trás (bgOpacity 90); bloom 45% (cópia a 1/8, borrada, em "screen")
        e vinheta 55% (gradiente no CSS);
     4. animação "pulse" (intensidade 60%): o raio dos pontos respira, com uma onda leve que sai do centro. Ela fica
        acesa enquanto a pessoa rola ou move o ponteiro e assenta 5 s depois (nada se mexe sozinho por mais tempo).
   Só roda com html.visita-on (decidido no <head>: JS, canvas, sem movimento reduzido e sem ?fx=0). Pausa fora da tela
   e com a aba oculta. Se algo falhar, tira .visita-on e a página volta para a versão estática (cartões). */
(function () {
  'use strict';

  var doc = document;
  var raiz = doc.documentElement;
  var secao = doc.querySelector('[data-visita]');
  if (!secao || !raiz.classList.contains('visita-on')) return;

  var palco = secao.querySelector('[data-visita-palco]');
  var arte = secao.querySelector('[data-visita-arte]');
  var tela = secao.querySelector('[data-visita-tela]');
  var brilho = secao.querySelector('[data-visita-brilho]');
  var barra = secao.querySelector('[data-visita-progresso]');
  var legendas = [].slice.call(secao.querySelectorAll('[data-parada]'));
  var ctx = tela && tela.getContext ? tela.getContext('2d') : null;
  var bctx = brilho && brilho.getContext ? brilho.getContext('2d') : null;

  var raf = 0;
  var desliga = function () {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    raiz.classList.remove('visita-on');
    legendas.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; el.classList.remove('ativa'); });
    if (palco) palco.style.removeProperty('--visita-m');
  };
  if (!palco || !arte || !ctx || !bctx) { desliga(); return; }

  /* ---------- parâmetros do "Sunset" (21st.dev/community/ascii), adaptados à OneX ---------- */
  var EFEITO = {
    celula: 10,       // cellSize
    celulaEstreita: 8,
    contraste: 1.15,  // contrast 115
    brilho: 0,        // brightness 0
    detalhe: 0.45,    // edgeEmphasis: mistura a média da célula com o pixel mais claro (os LEDs pequenos não somem)
    gama: 0.8,        // raio = luz^gama (área do ponto acompanha a luz; o preto fica vazio)
    fundo: 0.1,       // bgMode "solid" com bgOpacity 90: 10% da foto borrada atrás dos pontos
    pulso: 0.6,       // animIntensity 60
    periodo: 2.4,     // animSpeed 100: um ciclo a cada 2,4 s
    aceso: 5000       // o pulso assenta 5 s depois do último gesto
  };
  var RAMPA = [[0, 0x2a1206], [0.22, 0x5a2508], [0.45, 0xb5460c], [0.64, 0xf9681c], [0.82, 0xff9a63], [0.94, 0xffdcc6], [1, 0xfff7f2]];

  /* ---------- cenas ----------
     f: ponto da foto por onde a câmera entra (fica na âncora da composição); k: largura da foto em larguras de tela
     [paisagem, retrato]; r: largura da próxima cena dentro desta, no ponto de entrada (a próxima fica aninhada ali,
     do tamanho da porta, do fim do corredor, de um servidor, e a câmera atravessa até ela); luz: exposição da
     foto antes do contraste (as fotos escuras precisam de mais luz para virar pontos); a: âncora própria [paisagem,
     retrato], quando a da cena não é a padrão (a fachada fica mais alta no retrato: o texto do hero é maior; null usa a
     padrão) */
  var CENAS = [
    { src: 'assets/img/visita/0-fachada.webp', f: [0.5, 0.56], k: [1.02, 1.05], r: 0.1, luz: 1.15, a: [null, [0.5, 0.2]] },
    { src: 'assets/img/visita/1-corredor.webp', f: [0.5, 0.5], k: [1.12, 2.3], r: 0.12, luz: 1.55 },
    { src: 'assets/img/visita/2-rack.webp', f: [0.5, 0.5], k: [1.1, 2.5], r: 0.14, luz: 2.8 },
    { src: 'assets/img/visita/3-rede.webp', f: [0.5, 0.4], k: [0.95, 1.8], r: 0.2, luz: 1.05 },
    { src: 'assets/img/visita/4-storage.webp', f: [0.5, 0.5], k: [1.05, 1.5], r: 0.2, luz: 2.4 },
    { src: 'assets/img/visita/5-voip.webp', f: [0.55, 0.52], k: [1.1, 1.7], r: 0.22, luz: 1.4 },
    { src: 'assets/img/visita/6-x.webp', f: [0.5, 0.49], k: [0.92, 1.9], luz: 1.15 }
  ];
  var N = CENAS.length;
  var CAUDA = 0.5;                       // rolagem parada no fim (o palco volta ao formato de caixa)
  // onde fica o assunto: à direita do texto (paisagem; o x sai da largura real da coluna de texto, em medeLegendas)
  // ou acima dele (retrato)
  var ANCORA = [[0.68, 0.5], [0.5, 0.3]];
  var escalaPaisagem = 1;  // telas paisagem estreitas (tablet deitado): as fotos encolhem para caber à direita do texto

  var suave = function (a, b, x) { var u = (x - a) / (b - a); u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); };
  var vaiVem = function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(2 - 2 * u, 3) / 2; };

  /* ---------- estado ---------- */
  var amostra = doc.createElement('canvas');
  var actx = amostra.getContext('2d', { willReadFrequently: true });
  var atlas = doc.createElement('canvas');
  var W = 0, H = 0, dpr = 1, celula = 10, cd = 10, cols = 0, rows = 0, ox = 0, oy = 0, sw = 0, sh = 0, S = 0;
  var retrato = false;
  var lumes = new Float32Array(0), fase = new Float32Array(0), mascara = new Float32Array(0), mascaraLinha = new Float32Array(0);
  var caixas = [];  // topo e borda direita de cada legenda no palco (px), para a máscara acompanhar o texto da vez
  var NC = 24, NR = 28, RMAX = 1.2;
  var tCam = 0, tPintado = -1, energia = 1, energiaPintada = -1, ultimoGesto = performance.now(), antes = 0;
  var topoSecao = 0, curso = 1;
  var naTela = true, pronta = false, ancoraQA = null, semMascaraQA = false;

  /* ---------- fotos: níveis 1280/640/320/160 com bordas esfumadas (a próxima cena nasce sem quina) ---------- */
  var niveis = function (img) {
    var lista = [];
    var w = img.naturalWidth, h = img.naturalHeight;
    for (var larg = w; larg >= 120; larg = Math.round(larg / 2)) {
      var c = doc.createElement('canvas');
      c.width = larg; c.height = Math.round(larg * h / w);
      var g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'destination-in';
      var gx = g.createLinearGradient(0, 0, c.width, 0);
      gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.07, '#000'); gx.addColorStop(0.93, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gx; g.fillRect(0, 0, c.width, c.height);
      var gy = g.createLinearGradient(0, 0, 0, c.height);
      gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.09, '#000'); gy.addColorStop(0.91, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gy; g.fillRect(0, 0, c.width, c.height);
      lista.push(c);
    }
    return lista;
  };
  var carregaCena = function (cena, depois) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () { cena.niveis = niveis(img); cena.razao = img.naturalHeight / img.naturalWidth; depois(); };
    img.onerror = function () { cena.falhou = true; depois(); };
    img.src = (window.VISITA_CENAS && window.VISITA_CENAS[cena.src]) || cena.src;
  };
  // em file:// o navegador trata as fotos como de outra origem e o canvas não pode ler os pixels: lá as cenas vêm
  // embutidas em assets/js/visita-cenas.js (gerado por qa/scripts/gera-cenas-js.js). Num servidor, os .webp normais.
  var fontes = function (prontas) {
    if (location.protocol !== 'file:' || window.VISITA_CENAS) { prontas(); return; }
    var s = doc.createElement('script');
    s.src = 'assets/js/visita-cenas.js';
    s.onload = prontas;
    s.onerror = desliga;
    doc.head.appendChild(s);
  };

  /* ---------- atlas de pontos: NC cores (rampa) × NR raios ---------- */
  var corDaRampa = function (L) {
    var i = 1;
    while (i < RAMPA.length - 1 && L > RAMPA[i][0]) i++;
    var a = RAMPA[i - 1], b = RAMPA[i];
    var u = Math.max(0, Math.min(1, (L - a[0]) / (b[0] - a[0])));
    var canal = function (sh) { return Math.round(((a[1] >> sh) & 255) + (((b[1] >> sh) & 255) - ((a[1] >> sh) & 255)) * u); };
    return 'rgb(' + canal(16) + ',' + canal(8) + ',' + canal(0) + ')';
  };
  var montaAtlas = function () {
    S = Math.ceil(cd * RMAX) + 2;
    atlas.width = NC * S; atlas.height = NR * S;
    var g = atlas.getContext('2d');
    g.clearRect(0, 0, atlas.width, atlas.height);
    for (var c = 0; c < NC; c++) {
      g.fillStyle = corDaRampa(c / (NC - 1));
      for (var r = 1; r < NR; r++) {
        g.beginPath();
        g.arc(c * S + S / 2, r * S + S / 2, (r / (NR - 1)) * RMAX * cd / 2, 0, Math.PI * 2);
        g.fill();
      }
    }
  };

  /* ---------- medidas ---------- */
  var mede = function () {
    var r = secao.getBoundingClientRect();
    topoSecao = r.top + window.pageYOffset;
    curso = Math.max(1, secao.offsetHeight - palco.offsetHeight);
  };
  var ajusta = function (forca) {
    var w = palco.clientWidth, h = palco.clientHeight;
    var d = Math.min(2, window.devicePixelRatio || 1);
    if (!forca && w === W && h === H && d === dpr) { mede(); return; }
    W = w; H = h; dpr = d;
    retrato = W / H < 0.9;
    // ~150 colunas no máximo: em telas grandes a célula cresce e o desenho fica igual (e o custo, estável)
    celula = W < 600 ? EFEITO.celulaEstreita : Math.max(EFEITO.celula, Math.round(W / 150));
    cd = celula * dpr;
    tela.width = Math.round(W * dpr); tela.height = Math.round(H * dpr);
    cols = Math.ceil(W / celula); rows = Math.ceil(H / celula);
    ox = (W - cols * celula) / 2; oy = (H - rows * celula) / 2;   // a grade fica centrada (sobra igual dos dois lados)
    sw = cols * 2; sh = rows * 2;
    amostra.width = sw; amostra.height = sh;
    lumes = new Float32Array(cols * rows);
    fase = new Float32Array(cols * rows);
    mascara = new Float32Array(cols);
    mascaraLinha = new Float32Array(rows);
    var m = Math.max(cols, rows);
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      fase[y * cols + x] = Math.sqrt(Math.pow((x - cols / 2) / m, 2) + Math.pow((y - rows / 2) / m, 2)) * 2.4;
    }
    medeLegendas();
    brilho.width = Math.ceil(W / 8); brilho.height = Math.ceil(H / 8);
    bctx.filter = 'blur(1.5px)';
    montaAtlas();
    mede();
    tPintado = -1;
  };

  // os pontos somem onde fica o texto e a legenda fica sobre preto limpo: na paisagem, à esquerda da borda direita
  // da coluna de texto (colunas fixas); no retrato, abaixo do topo da legenda da vez (linhas recalculadas em amostraEm)
  var medeLegendas = function () {
    caixas = legendas.map(function (el) { return { topo: el.offsetTop, direita: el.offsetLeft + el.offsetWidth }; });
    if (!W || retrato) { for (var x = 0; x < cols; x++) mascara[x] = 1; return; }
    var borda = Math.max.apply(null, caixas.map(function (c) { return c.direita; })) / W;
    ANCORA[0][0] = Math.min(0.74, Math.max(0.64, borda + (1 - borda) * 0.45));
    escalaPaisagem = Math.min(1, (1 - borda) / 0.54);
    for (var xx = 0; xx < cols; xx++) mascara[xx] = suave(borda - 0.05, borda + 0.07, (ox + (xx + 0.5) * celula) / W);
  };

  /* ---------- câmera: quais cenas aparecem em t, em que escala, onde e com que opacidade ---------- */
  var ancoraDe = function (c) { var o = retrato ? 1 : 0; return ancoraQA || (c.a && c.a[o]) || ANCORA[o]; };
  var camadas = function (t) {
    var i = Math.min(Math.floor(t), N - 1);
    var f = t - i;
    if (i === N - 1) return [{ c: CENAS[i], s: 1 + 0.05 * suave(0, CAUDA, f), a: 1, A: ancoraDe(CENAS[i]) }];
    var c = CENAS[i], p = CENAS[i + 1], o = retrato ? 1 : 0;
    // e: quanto da travessia já foi feito. Na primeira metade, uma deriva lenta (a parada); na segunda, a câmera
    // mergulha no ponto de entrada até a próxima cena, aninhada ali, ocupar a tela no tamanho dela
    var e = f < 0.5 ? 0.03 * f / 0.5 : 0.03 + 0.97 * vaiVem((f - 0.5) / 0.5);
    var R = c.r * c.k[o] / p.k[o];            // largura da próxima em relação à atual, na tela
    var s = Math.pow(1 / R, e), sp = s * R;   // zoom exponencial: velocidade constante para o olho
    var A0 = ancoraDe(c), A1 = ancoraDe(p);
    var A = [A0[0] + (A1[0] - A0[0]) * e, A0[1] + (A1[1] - A0[1]) * e];
    return [
      { c: c, s: s, a: 1 - suave(0.72, 0.97, sp), A: A },
      { c: p, s: sp, a: suave(0.14, 0.4, sp), A: A }
    ];
  };
  var amostraEm = function (t) {
    var o = retrato ? 1 : 0;
    if (retrato) {
      // topo do texto da vez (média das legendas pela visibilidade de cada uma)
      var soma = 0, peso = 0;
      for (var k = 0; k < legendas.length; k++) {
        var idx = +legendas[k].getAttribute('data-parada');
        var v = visibilidade(idx, t - idx);
        if (v > 0 && caixas[k]) { soma += v * caixas[k].topo; peso += v; }
      }
      var yb = peso ? soma / peso : H * 0.6;
      for (var y = 0; y < rows; y++) mascaraLinha[y] = 1 - suave(yb - H * 0.05, yb + H * 0.03, oy + (y + 0.5) * celula);
    }
    actx.globalAlpha = 1;
    actx.fillStyle = '#000';
    actx.fillRect(0, 0, sw, sh);
    actx.imageSmoothingEnabled = true;
    actx.imageSmoothingQuality = 'high';
    var ganho = 0, peso = 0;
    camadas(t).forEach(function (l) {
      if (!l.c.niveis || l.a <= 0.002) return;
      ganho += l.a * l.c.luz; peso += l.a;
      var dw = W * l.c.k[o] * (o || ancoraQA ? 1 : escalaPaisagem) * l.s / celula * 2;
      var dh = dw * l.c.razao;
      var nv = l.c.niveis, img = nv[0];
      for (var n = nv.length - 1; n >= 0; n--) { if (nv[n].width >= dw * 0.9) { img = nv[n]; break; } }
      actx.globalAlpha = l.a;
      actx.drawImage(img, (l.A[0] * W - ox) / celula * 2 - l.c.f[0] * dw, (l.A[1] * H - oy) / celula * 2 - l.c.f[1] * dh, dw, dh);
    });
    actx.globalAlpha = 1;
    var px = actx.getImageData(0, 0, sw, sh).data;
    var linha = sw * 4;
    var g = (peso ? ganho / peso : 1) / 255, det = EFEITO.detalhe, media = (1 - det) / 4;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var p = (y * 2 * sw + x * 2) * 4, q = p + linha;
        var a = 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2];
        var b = 0.2126 * px[p + 4] + 0.7152 * px[p + 5] + 0.0722 * px[p + 6];
        var c = 0.2126 * px[q] + 0.7152 * px[q + 1] + 0.0722 * px[q + 2];
        var d = 0.2126 * px[q + 4] + 0.7152 * px[q + 5] + 0.0722 * px[q + 6];
        var mx = a > b ? a : b; if (c > mx) mx = c; if (d > mx) mx = d;
        var lum = ((a + b + c + d) * media + mx * det) * g;
        var n = y * cols + x;
        var L = (lum - 0.5) * EFEITO.contraste + 0.5 + EFEITO.brilho;
        if (!semMascaraQA) L *= mascara[x] * (retrato ? mascaraLinha[y] : 1);
        lumes[n] = L < 0 ? 0 : L > 1 ? 1 : L;
      }
    }
  };

  /* ---------- pontos ---------- */
  var pinta = function (segundos) {
    ctx.clearRect(0, 0, tela.width, tela.height);
    if (EFEITO.fundo > 0) {
      ctx.globalAlpha = EFEITO.fundo;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(amostra, ox * dpr, oy * dpr, cols * cd, rows * cd);
      ctx.globalAlpha = 1;
    }
    var amp = EFEITO.pulso * 0.18 * energia;
    var ang = Math.PI * 2 * segundos / EFEITO.periodo;
    var escR = (NR - 1) / RMAX, escC = NC - 1, meio = S / 2;
    var x0 = ox * dpr + cd / 2 - meio, y0 = oy * dpr + cd / 2 - meio;
    for (var y = 0; y < rows; y++) {
      var py = Math.round(y0 + y * cd);
      for (var x = 0; x < cols; x++) {
        var n = y * cols + x;
        var L = lumes[n];
        if (L < 0.03) continue;
        var r = Math.pow(L, EFEITO.gama);
        if (amp) r *= 1 + amp * Math.sin(ang - fase[n]);
        var ri = (r * escR + 0.5) | 0;
        if (ri < 1) continue;
        if (ri > NR - 1) ri = NR - 1;
        ctx.drawImage(atlas, ((L * escC + 0.5) | 0) * S, ri * S, S, S, (x0 + x * cd + 0.5) | 0, py, S, S);
      }
    }
    bctx.clearRect(0, 0, brilho.width, brilho.height);
    bctx.drawImage(tela, 0, 0, brilho.width, brilho.height);
  };

  /* ---------- legendas, progresso e o formato do palco ---------- */
  var visibilidade = function (k, d) {
    var entra = k === 0 ? 1 : suave(-0.22, -0.02, d);
    var sai = k === N - 1 ? 0 : suave(0.38, 0.54, d);
    return Math.max(0, Math.min(entra, 1 - sai));
  };
  var legendasEm = function (t) {
    for (var i = 0; i < legendas.length; i++) {
      var el = legendas[i];
      var k = +el.getAttribute('data-parada');
      var d = t - k;
      var v = visibilidade(k, d);
      if (el._v !== undefined && Math.abs(v - el._v) < 0.002) continue;
      el._v = v;
      el.style.opacity = v.toFixed(3);
      el.style.transform = v > 0.999 ? '' : 'translate3d(0,' + ((1 - v) * (d < 0 ? 26 : -26)).toFixed(1) + 'px,0)';
      el.classList.toggle('ativa', v > 0.5);
    }
    if (barra) barra.style.setProperty('--p', Math.min(1, t / (N - 1)).toFixed(4));
    palco.classList.toggle('no-fim', t > N - 1.4); // no X final, 'Pular a visita' sai de cena
    // o palco começa como caixa (o papel em volta), abre para a tela inteira ao entrar e volta a ser caixa no fim
    var m = Math.max(1 - suave(0, 0.32, t), suave(N - 1 + 0.08, N - 1 + CAUDA, t));
    palco.style.setProperty('--visita-m', m.toFixed(3));
  };

  /* ---------- laço ---------- */
  var alvo = function () {
    var p = (window.pageYOffset - topoSecao) / curso;
    return (p < 0 ? 0 : p > 1 ? 1 : p) * (N - 1 + CAUDA);
  };
  var quadro = function (agora) {
    raf = 0;
    var dt = Math.min(0.1, Math.max(0.001, (agora - antes) / 1000));
    antes = agora;
    var t = alvo();
    var dif = t - tCam;
    tCam = Math.abs(dif) < 0.0004 ? t : tCam + dif * (1 - Math.exp(-dt * 7));
    var quer = agora - ultimoGesto < EFEITO.aceso ? 1 : 0;
    energia += (quer - energia) * (1 - Math.exp(-dt * (quer ? 5 : 1.4)));
    if (!quer && energia < 0.004) energia = 0;
    var mudou = tCam !== tPintado;
    if (mudou) {
      try { amostraEm(tCam); } catch (erro) { desliga(); return; } // pixels ilegíveis: fica a versão estática
      legendasEm(tCam);
      tPintado = tCam;
    }
    if (mudou || energia > 0 || energiaPintada !== 0) { pinta(agora / 1000); energiaPintada = energia; }
    if (!pronta) { pronta = true; arte.classList.add('pronta'); }
    if (naTela && !doc.hidden && (tCam !== t || energia > 0)) raf = requestAnimationFrame(quadro);
  };
  var acorda = function () {
    if (raf || !naTela || doc.hidden || !CENAS[0].niveis) return;
    antes = performance.now();
    raf = requestAnimationFrame(quadro);
  };
  var gesto = function () { ultimoGesto = performance.now(); acorda(); };

  try {
    ajusta(true);
    // a fachada primeiro (é o hero); as outras logo depois, em ordem
    fontes(function () {
      carregaCena(CENAS[0], function () {
        if (CENAS[0].falhou) { desliga(); return; }
        tCam = alvo();
        gesto();
        var proxima = 1;
        var segue = function () {
          if (proxima >= N) return;
          carregaCena(CENAS[proxima++], function () { tPintado = -1; acorda(); segue(); });
        };
        segue();
      });
    });
  } catch (erro) {
    desliga();
    return;
  }

  window.addEventListener('scroll', gesto, { passive: true });
  palco.addEventListener('pointermove', gesto, { passive: true });
  var espera = 0;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(function () { ajusta(false); tPintado = -1; gesto(); }, 120);
  });
  if ('ResizeObserver' in window) new ResizeObserver(function () { mede(); medeLegendas(); tPintado = -1; acorda(); }).observe(secao);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { medeLegendas(); tPintado = -1; acorda(); });
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) gesto(); });
  new IntersectionObserver(function (entradas) {
    var antesNaTela = naTela;
    naTela = entradas[0].isIntersecting;
    if (naTela && !antesNaTela) { mede(); tCam = alvo(); tPintado = -1; gesto(); }
  }).observe(secao);
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduzido.addEventListener) reduzido.addEventListener('change', function () { if (reduzido.matches) desliga(); });

  // foco de teclado numa legenda que não está na tela: rola até a parada dela (o texto nunca fica invisível com foco)
  legendas.forEach(function (el) {
    el.addEventListener('focusin', function () {
      if ((el._v || 0) > 0.5) return;
      var k = +el.getAttribute('data-parada');
      window.scrollTo({ top: topoSecao + (k / (N - 1 + CAUDA)) * curso, behavior: 'instant' });
      tCam = k;
      tPintado = -1;
      gesto();
    });
  });

  // gancho de QA (qa/scripts): pinta um quadro exato e devolve a imagem composta (pontos + bloom sobre o preto)
  secao.visitaQA = {
    quadro: function (t, segundos, nivelDeEnergia, ancora, semMascara) {
      ancoraQA = ancora || null;
      semMascaraQA = !!semMascara;
      ultimoGesto = -1e9;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      naTela = false;
      energia = nivelDeEnergia || 0;
      tCam = t;
      amostraEm(t); legendasEm(t); pinta(segundos || 0);
      tPintado = t;
      return CENAS.every(function (c) { return !!c.niveis; });
    },
    partes: function (t) { var a = performance.now(); amostraEm(t); var b = performance.now(); pinta(1); return [b - a, performance.now() - b]; },
    imagem: function () {
      var c = doc.createElement('canvas');
      c.width = tela.width; c.height = tela.height;
      var g = c.getContext('2d');
      g.fillStyle = '#0A0909'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(tela, 0, 0);
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = 0.45;
      g.imageSmoothingQuality = 'high';
      g.drawImage(brilho, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    }
  };
})();
