// Quadros exatos de um trecho da visita (pelo gancho de QA, sem depender da rolagem), para conferir as trocas de cena.
// Uso: node visita-quadros.js [pasta] [largura] [t inicial] [t final] [passo]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'tmp/quadros');
const W = Number(process.argv[3] || 1440), H = { 390: 844, 1440: 900, 1024: 768, 768: 1024 }[W] || 900;
const T0 = Number(process.argv[4] || 0.5), T1 = Number(process.argv[5] || 1.05), PASSO = Number(process.argv[6] || 0.05);
(async () => {
  const b = abre();
  try {
    const p = await pagina(b, { largura: W, altura: H, mobile: W < 768 });
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(2500);
    await p.avalia('window.scrollTo({top: document.querySelector("[data-visita]").offsetTop + 40, behavior: "instant"})');
    await espera(500);
    for (let t = T0, i = 0; t <= T1 + 1e-9; t += PASSO, i++) {
      await p.avalia('document.querySelector("[data-visita]").visitaQA.quadro(' + t.toFixed(3) + ', 0, 0)');
      await espera(120);
      await p.foto(path.join(SAIDA, W + '-' + String(i).padStart(2, '0') + '.jpg'));
    }
    if (p.erros.length) console.log(p.erros);
  } finally { await b.fecha(); }
})().catch((e) => { console.error(e); process.exit(1); });
