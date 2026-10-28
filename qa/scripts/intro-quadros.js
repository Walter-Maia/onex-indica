// Quadros exatos da intro: ?intro=1&ixqa=1 deixa a intro parada e window.__ix.quadro(ms) desenha aquele instante (o
// canvas e o X oficial; o texto do hero e o cabeçalho por baixo seguem o relógio real). Bom para conferir o roteiro em
// várias telas sem depender da velocidade da máquina.
// Uso: node intro-quadros.js [pasta] [telas] [instantes]
//      node intro-quadros.js tmp/intro-q 1440x900,390x844 300,700,1100,1500,1850,2150,2400,2700
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'tmp/intro-quadros');
const TELAS = (process.argv[3] || '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
const TS = (process.argv[4] || '300,700,1100,1500,1850,2150,2400,2700').split(',').map(Number);

(async () => {
  const b = abre();
  try {
    for (const [w, h] of TELAS) {
      const p = await pagina(b, { largura: w, altura: h, mobile: w < 768 });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=1&ixqa=1'));
      // espera o hero ficar pronto (a paisagem em caracteres é lida dos canvas dele) e o texto dele assentar por baixo
      for (let i = 0; i < 80 && !(await p.avalia('!!(window.__ix && document.querySelector("[data-parallax]").classList.contains("pronto"))')); i++) await espera(50);
      await espera(3200);
      for (const t of TS) {
        await p.avalia('window.__ix.quadro(' + t + ')');
        await espera(60);
        await p.foto(path.join(SAIDA, w + '-' + String(t).padStart(4, '0') + '.jpg'));
      }
      if (p.erros.length) console.log(w, 'erros:', p.erros);
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
