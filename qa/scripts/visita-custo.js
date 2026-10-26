// Custo de um quadro da visita (amostragem + pontos + bloom), medido dentro da página pelo gancho de QA.
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
(async () => {
  const b = abre();
  try {
    for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]]) {
      const p = await pagina(b, { largura: w, altura: h, mobile: w < 768 });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(2500);
      const r = await p.avalia(`(function(){var q=document.querySelector('[data-visita]').visitaQA;var ts=[];
        for (var i=0;i<90;i++){var a=performance.now();q.quadro(i/90*6,i/30,1);ts.push(performance.now()-a);}
        ts.sort(function(a,b){return a-b});return {mediana:+ts[45].toFixed(1),p90:+ts[81].toFixed(1),pior:+ts[89].toFixed(1)}})()`);
      console.log(w + 'x' + h, JSON.stringify(r));
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error(e); process.exit(1); });
