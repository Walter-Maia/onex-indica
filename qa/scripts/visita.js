// Hero "visita à OneX": quadros ao longo da rolagem (paradas e trocas), fluidez enquanto rola e erros do console.
// Uso: node visita.js [pasta-de-saida] [larguras separadas por vírgula] [tempos da câmera separados por vírgula]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'final/visita');
const LARGURAS = (process.argv[3] || '1440,390').split(',').map(Number);
const ALTURA = { 320: 640, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
const PONTOS = (process.argv[4] || '0,0.5,0.75,0.85,1,1.75,1.85,2,2.75,3,3.8,4,4.8,5,5.8,6,6.5').split(',').map(Number);

// posição de rolagem para um tempo t da câmera (mesma conta de assets/js/visita.js)
const rolaPara = (t) => `(function(){var s=document.querySelector('[data-visita]');var p=s.querySelector('[data-visita-palco]');
  var topo=s.getBoundingClientRect().top+pageYOffset;var curso=s.offsetHeight-p.offsetHeight;
  window.scrollTo({top:Math.round(topo+(${t}/6.5)*curso),behavior:'instant'});return Math.round(topo+(${t}/6.5)*curso)})()`;

(async () => {
  const b = abre();
  try {
    for (const w of LARGURAS) {
      const h = ALTURA[w] || 900;
      const mob = w < 768;
      const p = await pagina(b, { largura: w, altura: h, mobile: mob });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(2600);
      console.log(w, 'classe:', await p.avalia('document.documentElement.className'), '| pronta:', await p.avalia('!!document.querySelector(".visita__arte.pronta")'));
      for (const t of PONTOS) {
        await p.avalia(rolaPara(t));
        await espera(t === 0 ? 400 : 1100);
        await p.foto(path.join(SAIDA, w + '-t' + String(t.toFixed(2)).replace('.', '_') + '.jpg'));
      }
      // fluidez: rola a visita inteira em 6 s e mede o intervalo entre quadros
      await p.avalia(rolaPara(0)); await espera(600);
      const fps = await p.avalia(`new Promise(function (ok) {
        var s=document.querySelector('[data-visita]'), pl=s.querySelector('[data-visita-palco]');
        var topo=s.getBoundingClientRect().top+pageYOffset, curso=s.offsetHeight-pl.offsetHeight;
        var t0=performance.now(), ant=t0, dts=[];
        (function passo(agora){ var u=(agora-t0)/6000; window.scrollTo(0, topo+Math.min(1,u)*curso);
          dts.push(agora-ant); ant=agora;
          if (u<1) requestAnimationFrame(passo); else { dts.shift(); dts.sort(function(a,b){return a-b});
            var media=dts.reduce(function(a,b){return a+b},0)/dts.length;
            ok({quadros:dts.length, fps:Math.round(1000/media), p95:Math.round(dts[Math.floor(dts.length*.95)]), pior:Math.round(dts[dts.length-1])}); } })(t0);
      })`);
      console.log(w, 'fluidez:', JSON.stringify(fps));
      console.log(w, 'estouro:', await p.avalia('document.documentElement.scrollWidth + "/" + innerWidth'));
      if (p.erros.length) console.log('  erros:', p.erros.slice(0, 12));
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error(e); process.exit(1); });
