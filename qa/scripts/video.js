// Vídeo de fundo do hero: fonte escolhida por largura, tocando só com o hero na tela, pausa fora dela, botão de pausa.
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const estado = 'JSON.stringify({src: (document.querySelector("[data-video]").currentSrc || "").split("/").pop(), pausado: document.querySelector("[data-video]").paused, tocando: document.querySelector("[data-video]").classList.contains("tocando"), tempo: +document.querySelector("[data-video]").currentTime.toFixed(2), botao: !document.querySelector("[data-video-pausa]").hidden, rotulo: document.querySelector("[data-video-pausa]").getAttribute("aria-label")})';

(async () => {
  const b = abre();
  try {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      const p = await pagina(b, { largura: w, altura: h, mobile: mob });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(2500);
      console.log(w, 'carregou:', await p.avalia(estado));
      await p.rola(4000); await espera(600);
      console.log(w, 'hero fora da tela:', await p.avalia(estado));
      await p.rola(0); await espera(900);
      console.log(w, 'de volta:', await p.avalia(estado));
      await p.avalia('document.querySelector("[data-video-pausa]").click()'); await espera(300);
      console.log(w, 'depois do botão:', await p.avalia(estado));
      if (p.erros.length) console.log('  erros:', p.erros);
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
