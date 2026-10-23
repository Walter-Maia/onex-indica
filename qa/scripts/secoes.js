// Seção por seção, com as animações de entrada rodando de verdade: rola até cada seção, espera a entrada terminar e
// captura a tela. Uso: node secoes.js [pasta] [largura]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'secoes');
const W = Number(process.argv[3] || 1440);
const H = { 320: 640, 390: 844, 768: 1024, 1440: 900 }[W] || 900;
const SECOES = ['como-funciona', 'produtos', 'simulador', 'por-que', 'indicar', 'perguntas', 'fechamento'];

(async () => {
  const b = abre();
  try {
    const p = await pagina(b, { largura: W, altura: H, mobile: W < 768 });
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(1500);
    for (const id of SECOES) {
      const y = await p.avalia('Math.round(document.getElementById("' + id + '").getBoundingClientRect().top + scrollY - 70)');
      // chega rolando aos poucos, como uma pessoa, para os observadores verem a entrada
      const atual = await p.avalia('scrollY');
      for (let k = 1; k <= 4; k++) { await p.rola(Math.round(atual + (y - atual) * k / 4)); await espera(90); }
      await espera(2900);
      await p.foto(path.join(SAIDA, W + '-' + id + '.png'));
    }
    if (p.erros.length) console.log('erros:', p.erros);
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
