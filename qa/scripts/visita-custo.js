// Custo de um quadro da visita (grade + bloom, pontos), medido dentro da página pelo gancho de QA; partes() espera a
// GPU terminar (readPixels) antes de medir. Com --disable-gpu (o padrão do cdp.js) a GPU é a SwiftShader, na CPU: os
// números saem pessimistas; numa GPU de verdade o quadro inteiro custa uma fração de milissegundo a poucos ms.
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
        q.quadro(0,0,1);for (var i=0;i<90;i++){var d=q.partes(i/90*6);ts.push(d[0]+d[1]);}
        ts.sort(function(a,b){return a-b});return {mediana:+ts[45].toFixed(1),p90:+ts[81].toFixed(1),pior:+ts[89].toFixed(1)}})()`);
      console.log(w + 'x' + h, JSON.stringify(r));
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error(e); process.exit(1); });
