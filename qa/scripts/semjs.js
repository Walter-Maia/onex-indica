// Sem JavaScript: nada pode ficar coberto ou escondido. Captura a página inteira e confere o estado.
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'semjs');

(async () => {
  const b = abre();
  try {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      const p = await pagina(b, { largura: w, altura: h, mobile: mob });
      await p.s('Emulation.setScriptExecutionDisabled', { value: true });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=1'));
      await espera(1500);
      await p.foto(path.join(SAIDA, w + '-semjs.jpg'), { inteira: true, escala: w > 900 ? 0.5 : 0.75 });
      await p.s('Emulation.setScriptExecutionDisabled', { value: false });
      // lê o DOM (o JS da página continua sem ter rodado nesta carga)
      console.log(w, await p.avalia('JSON.stringify({classes: document.documentElement.className || "(nenhuma)", overlay: !!document.querySelector(".ix"), sw: document.documentElement.scrollWidth, iw: innerWidth, h1: getComputedStyle(document.querySelector("h1 .h1__b")).opacity, cena: getComputedStyle(document.querySelector(".cn-x-oficial")).opacity, noscript: document.querySelectorAll("noscript").length})'));
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
