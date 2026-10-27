/* Indique a OneX: intro "conexão" (uma vez por sessão). Roteiro de tempos no bloco "INTRO" de assets/css/indique.css.
   Infraestrutura da skill efeito-de-intro: decisão no <head> (classe intro-ativa), cobertura CSS com failsafe de 4,6 s,
   dois requestAnimationFrame antes de tocar, fim natural (finish(true)) + travas (sem quadro em 1,5 s; duração + 2 s),
   pular por Esc, Tab, Enter, teclas de rolagem, roda, toque, clique, rolagem ou aba oculta (finish(false)), sessão
   gravada logo no começo. As peças do X são os polígonos medidos no PNG oficial; a arte oficial entra por cima. */
(function () {
  'use strict';
  var raiz = document.documentElement;
  if (!raiz.classList.contains('intro-ativa')) return;

  var DURACAO = 3000;   // fim da coreografia (ms): a saída começa aqui; igual ao --rise-start do CSS
  var SAIDA = 600;      // recolhe para a caixa do hero (0,35 s) e as metades se abrem (0,15–0,60 s)
  var CHAVE = 'onex-indique-intro';
  var X_OFICIAL = 'assets/img/onex-x.webp';
  var PECAS = {
    a: 'M1.5 69 L134.5 69 L284.5 243 L151.5 243 Z',
    b: 'M414 0 L542 0 L331 244 L265 168 Z',
    c: 'M156.6 273 L309.5 273 L465 458 L335 458 L233 339 L132 458 L0 458 Z'
  };
  // cruzamento dos eixos do X (unidades do PNG 541 × 458) e as direções dos dois eixos
  var CRUZ = [237.39, 267.47];
  var EIXO_1 = [0.6492, 0.7606];   // "\" : do canto superior esquerdo para o inferior direito (você → indicado)
  var EIXO_2 = [-0.6688, 0.7435];  // "/" : do canto superior direito para o inferior esquerdo (o retorno)

  var overlay = null, feito = false, timers = [];

  function libera() {
    raiz.classList.remove('intro-ativa', 'intro-saindo');
    raiz.style.removeProperty('--rise-start');
  }
  function limpa() {
    timers.forEach(clearTimeout);
    document.removeEventListener('keydown', aoTeclar, true);
    document.removeEventListener('visibilitychange', aoOcultar);
    document.removeEventListener('wheel', aoGesto, true);
    document.removeEventListener('touchstart', aoGesto, true);
    document.removeEventListener('pointerdown', aoGesto, true);
    window.removeEventListener('scroll', aoGesto);
  }
  function finish(natural) {
    if (feito) return;
    feito = true;
    limpa();
    try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { /* storage bloqueado */ }
    if (natural) { raiz.classList.add('intro-saindo'); raiz.classList.remove('intro-ativa'); } else libera();
    if (document.activeElement && overlay && overlay.contains(document.activeElement)) document.activeElement.blur();
    if (!overlay) return;
    if (natural) {
      // a tela se recolhe para o formato da caixa do hero (o papel em volta aparece) e então se abre pela "/" do X
      var hero = document.querySelector('[data-hero]');
      if (hero) {
        var r = hero.getBoundingClientRect();
        var px = function (n) { return Math.max(0, Math.round(n)) + 'px'; };
        overlay.style.setProperty('--ix-t', px(r.top));
        overlay.style.setProperty('--ix-r', px(window.innerWidth - r.right));
        overlay.style.setProperty('--ix-b', px(window.innerHeight - r.bottom));
        overlay.style.setProperty('--ix-l', px(r.left));
        overlay.style.setProperty('--ix-raio', getComputedStyle(hero).borderTopLeftRadius || '0px');
      }
    }
    overlay.classList.add(natural ? 'ix-saindo' : 'ix-pulando'); // continua capturando cliques até sair do DOM
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, natural ? SAIDA + 40 : 280);
    if (natural) setTimeout(libera, SAIDA + 1000);
  }
  var ROLAGEM = { ' ': 1, PageDown: 1, PageUp: 1, ArrowDown: 1, ArrowUp: 1, End: 1, Home: 1 };
  function aoTeclar(e) {
    if (ROLAGEM[e.key]) { e.preventDefault(); finish(false); }
    else if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') finish(false);
  }
  function aoOcultar() { if (document.hidden) finish(false); }
  function aoGesto(e) {
    if (e.type === 'pointerdown' && e.pointerType === 'touch') return; // o toque já foi tratado no touchstart
    if (e.cancelable && (e.type === 'wheel' || e.type === 'touchstart')) e.preventDefault();
    if (e.type === 'pointerdown') { e.preventDefault(); e.stopPropagation(); } // o clique que pula não atravessa
    finish(false);
  }

  function palco() {
    var digitos = ['1', '0', '0', '%'].map(function (d, i) {
      return '<span class="ix__m"><span style="--i:' + i + '"' + (d === '%' ? ' class="ix__pct"' : '') + '>' + d + '</span></span>';
    }).join('');
    return '<div class="ix__metade ix__metade--a"></div><div class="ix__metade ix__metade--b"></div>' +
      '<div class="ix__palco">' +
        '<svg class="ix__x" viewBox="0 0 541 458" focusable="false">' +
          '<g class="ix__trilhas"></g>' +
          '<circle class="ix__pulso" cx="' + CRUZ[0] + '" cy="' + CRUZ[1] + '" r="40"/>' +
          '<path class="ix__peca ix__peca--a" d="' + PECAS.a + '"/>' +
          '<path class="ix__peca ix__peca--b" d="' + PECAS.b + '"/>' +
          '<path class="ix__peca ix__peca--c" d="' + PECAS.c + '"/>' +
          '<image class="ix__oficial" href="' + X_OFICIAL + '" x="0" y="0" width="541" height="458"/>' +
        '</svg>' +
        '<p class="ix__cem"><span class="ix__digitos">' + digitos + '</span><span class="ix__legenda">da 1ª parcela para quem indica a OneX</span></p>' +
      '</div>';
  }

  // cada trilha tem dois trechos: a entrada (da borda da tela até o cruzamento do X) e a saída (do cruzamento até a
  // borda oposta). Os comprimentos saem da distância real até as bordas, então a luz nasce logo fora da tela e as duas
  // pontas chegam juntas ao cruzamento (0,60 s) em qualquer proporção de tela
  function trilhas() {
    var svg = overlay.querySelector('.ix__x');
    var r = svg.getBoundingClientRect();
    var escala = r.width / 541 || 0.4;              // px por unidade
    var cx = r.left + CRUZ[0] * escala, cy = r.top + CRUZ[1] * escala;
    var W = window.innerWidth, H = window.innerHeight;
    var ate = function (d) {                        // unidades do cruzamento até sair da tela no sentido d (+ folga)
      var tx = d[0] > 0 ? (W - cx) / d[0] : d[0] < 0 ? -cx / d[0] : Infinity;
      var ty = d[1] > 0 ? (H - cy) / d[1] : d[1] < 0 ? -cy / d[1] : Infinity;
      return (Math.max(0, Math.min(tx, ty)) + 40) / escala;
    };
    var f = function (n) { return n.toFixed(1); };
    var linha = function (a, b) { return 'M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]); };
    var html = '';
    [EIXO_1, EIXO_2].forEach(function (d, i) {
      var li = ate([-d[0], -d[1]]), lf = ate(d);
      var p0 = [CRUZ[0] - d[0] * li, CRUZ[1] - d[1] * li], p1 = [CRUZ[0] + d[0] * lf, CRUZ[1] + d[1] * lf];
      var entra = linha(p0, CRUZ), sai = linha(CRUZ, p1);
      html += '<path class="ix__trilha ix__trilha--luz ix__trilha--entra" pathLength="1" d="' + entra + '"/>' +
        '<path class="ix__trilha ix__trilha--luz ix__trilha--sai" pathLength="1" d="' + sai + '"/>' +
        '<path class="ix__trilha ix__trilha--fio ix__trilha--entra" pathLength="1" d="' + entra + '"/>' +
        '<path class="ix__trilha ix__trilha--fio ix__trilha--sai" pathLength="1" d="' + sai + '"/>' +
        '<g class="ix__cometa" style="--x0:' + f(p0[0]) + 'px;--y0:' + f(p0[1]) + 'px;--xc:' + CRUZ[0] + 'px;--yc:' + CRUZ[1] + 'px;--x1:' + f(p1[0]) + 'px;--y1:' + f(p1[1]) + 'px">' +
          '<g class="ix__cometa-luz"><circle class="ix__cometa-halo" r="32"/><circle r="10"/></g></g>';
    });
    overlay.querySelector('.ix__trilhas').innerHTML = html;
  }

  try {
    if (performance.now() > 3000 || window.pageYOffset > 4) throw new Error('chegou tarde');
    try { sessionStorage.setItem(CHAVE, '1'); } catch (e) { /* storage bloqueado: a intro roda, mas não lembra */ }
    overlay = document.createElement('div');
    overlay.className = 'ix';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = palco();
    document.body.appendChild(overlay);
    trilhas();

    document.addEventListener('keydown', aoTeclar, true);
    document.addEventListener('visibilitychange', aoOcultar);
    document.addEventListener('wheel', aoGesto, { capture: true, passive: false });
    document.addEventListener('touchstart', aoGesto, { capture: true, passive: false });
    document.addEventListener('pointerdown', aoGesto, true);
    window.addEventListener('scroll', aoGesto, { passive: true });

    var toca = function () {
      if (feito || overlay.classList.contains('ix-tocando')) return;
      overlay.classList.add('ix-tocando');
      // cabeçalho e hero entram quando a saída começa. Os atrasos delas contam a partir do instante em que as animações
      // de entrada nasceram (a primeira pintura, que pode demorar), então o valor é "agora − esse instante + DURACAO".
      var ref = document.querySelector('.h1__a');
      var anims = ref && ref.getAnimations ? ref.getAnimations() : [];
      var nasceu = anims.length && anims[0].startTime != null ? anims[0].startTime : performance.now();
      raiz.style.setProperty('--rise-start', ((performance.now() - nasceu + DURACAO) / 1000).toFixed(2) + 's');
      timers.push(setTimeout(function () { finish(true); }, DURACAO));
    };
    requestAnimationFrame(function () { requestAnimationFrame(toca); });
    timers.push(setTimeout(toca, 250));                                                          // aba sem rAF
    timers.push(setTimeout(function () { if (!overlay.classList.contains('ix-tocando')) finish(false); }, 1500));
    timers.push(setTimeout(function () { finish(false); }, DURACAO + 2000));
  } catch (erro) {
    finish(false);
  }
})();
