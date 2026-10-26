// Primeira olhada: hero depois da cena e página inteira (rolada até o fim para disparar as entradas), em larguras dadas.
// Uso: node olhar.js [pasta-de-saida] [larguras separadas por vírgula]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'olhar');
const LARGURAS = (process.argv[3] || '1440,390').split(',').map(Number);
const ALTURA = { 320: 640, 360: 740, 390: 844, 768: 1024, 820: 1180, 1024: 768, 1280: 800, 1366: 768, 1440: 900, 1920: 1080 };

(async () => {
  const b = abre();
  try {
    for (const w of LARGURAS) {
      const h = ALTURA[w] || 900;
      const mob = w < 768;
      const p = await pagina(b, { largura: w, altura: h, mobile: mob });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(5600);
      await p.foto(path.join(SAIDA, w + '-hero.png'));
      const alt = await p.avalia('document.documentElement.scrollHeight');
      for (let y = 0; y < alt; y += Math.round(h * 0.55)) { await p.rola(y); await espera(320); }
      await p.rola(alt); await espera(2600);
      const info = await p.avalia('JSON.stringify({sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight, largos: [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== "fixed" && !e.closest(".caixa, .secao--aberta, .visita__arte, svg"); }).slice(0, 8).map(e => e.tagName + "." + e.className)})');
      console.log(w + 'x' + h, info);
      // composição estática (?fx=0): a página inteira sem estados armados de entrada
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?fx=0'));
      await espera(1200);
      await p.foto(path.join(SAIDA, w + '-pagina-fx0.jpg'), { inteira: true, escala: w > 900 ? 0.5 : 0.75 });
      if (p.erros.length) console.log('  erros:', p.erros);
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
