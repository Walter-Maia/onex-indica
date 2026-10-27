/* Parallax nas seções (index-parallax-visita.html): cada elemento com data-paralaxe="v" se desloca v × (a distância
   do centro dele ao centro da tela); com v > 0 ele fica para trás da rolagem, com v < 0 ele corre na frente. Num grupo
   com data-paralaxe-colunas="v1,v2,v3", cada filho pega a velocidade da sua coluna (medida a cada tamanho de tela), e
   as colunas se afastam e se aproximam enquanto passam. Só em telas a partir de 700 px (no celular, uma coluna só) e
   sem movimento reduzido nem ?fx=0. */
(function () {
  'use strict';

  var doc = document;
  if (doc.documentElement.classList.contains('fx-0') || !('IntersectionObserver' in window)) return;
  var parado = window.matchMedia('(prefers-reduced-motion: reduce)');
  var largo = window.matchMedia('(min-width: 700px)');
  var soltos = [].slice.call(doc.querySelectorAll('[data-paralaxe]'));
  var grupos = [].slice.call(doc.querySelectorAll('[data-paralaxe-colunas]'));
  if (!soltos.length && !grupos.length) return;

  var itens = [];
  // a coluna de cada filho sai do offsetLeft (que ignora o transform): as posições distintas, em ordem, são as colunas
  var monta = function () {
    itens = soltos.map(function (el) { return { el: el, vel: +el.getAttribute('data-paralaxe') || 0 }; });
    grupos.forEach(function (g) {
      var vels = g.getAttribute('data-paralaxe-colunas').split(',').map(Number);
      var filhos = [].slice.call(g.children);
      var colunas = [];
      filhos.forEach(function (f) { if (colunas.indexOf(f.offsetLeft) < 0) colunas.push(f.offsetLeft); });
      colunas.sort(function (a, b) { return a - b; });
      filhos.forEach(function (f) {
        itens.push({ el: f, vel: colunas.length > 1 ? vels[colunas.indexOf(f.offsetLeft) % vels.length] : 0 });
      });
    });
    itens.forEach(function (i) { i.el._na = i.el._na !== false; vigia.observe(i.el); });
  };

  var raf = 0;
  var move = function () {
    raf = 0;
    var ativo = largo.matches && !parado.matches, meio = window.innerHeight / 2;
    for (var k = 0; k < itens.length; k++) {
      var el = itens[k].el;
      if (!el._na) continue;
      var y = 0;
      if (ativo && itens[k].vel) {
        var r = el.getBoundingClientRect();
        var c = r.top - (el._y || 0) + r.height / 2 - meio;  // centro sem o deslocamento atual
        // longe da tela, o deslocamento para no de uma tela de distância (sem isso, o que está lá embaixo na carga
        // ganharia um deslocamento enorme e sairia do alcance do vigia)
        y = Math.max(-2 * meio, Math.min(2 * meio, c)) * itens[k].vel;
      }
      if (Math.abs(y - (el._y || 0)) < 0.1) continue;
      el._y = y;
      el.style.transform = y ? 'translate3d(0,' + y.toFixed(1) + 'px,0)' : '';
    }
  };
  var pede = function () { if (!raf) raf = requestAnimationFrame(move); };

  // só mexe no que está perto da tela
  var vigia = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { e.target._na = e.isIntersecting; });
    pede();
  }, { rootMargin: '25% 0px' });

  monta();
  move();
  window.addEventListener('scroll', pede, { passive: true });
  var espera = 0;
  window.addEventListener('resize', function () { clearTimeout(espera); espera = setTimeout(function () { monta(); pede(); }, 150); });
  if (parado.addEventListener) { parado.addEventListener('change', pede); largo.addEventListener('change', pede); }
})();
