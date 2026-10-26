// Gera as imagens estáticas da visita a partir do próprio renderizador (assets/js/visita.js), pelo gancho de QA:
//   pontos-0.webp (1600 × 900) e pontos-0-retrato.webp (780 × 1688): o hero parado (pôster atrás do canvas e versão
//   sem JS / movimento reduzido / ?fx=0); pontos-1..5.webp (800 × 450): a cena de cada parada nos cartões da versão
//   estática. Rode de novo depois de mexer nas fotos ou nos parâmetros do efeito.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const PASTA = path.join(RAIZ, 'assets', 'img', 'visita');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pontos-'));

const PECAS = [
  { arq: 'pontos-0.webp', w: 1600, h: 900, dpr: 1, t: 0 },
  { arq: 'pontos-0-retrato.webp', w: 390, h: 844, dpr: 2, t: 0, mobile: true },
  // nos cartões, o objeto inteiro (as fotos quadradas encolhem para caber na altura do cartão 16:9)
  ...[1, 2, 3, 4, 5].map((k) => ({ arq: 'pontos-' + k + '.webp', w: 800, h: 450, dpr: 1, t: k, centro: true, escala: k === 1 ? 1 : 0.85 }))
];

(async () => {
  const b = abre();
  try {
    for (const peca of PECAS) {
      const p = await pagina(b, { largura: peca.w, altura: peca.h, mobile: !!peca.mobile });
      await p.s('Emulation.setDeviceMetricsOverride', { width: peca.w, height: peca.h, deviceScaleFactor: peca.dpr, mobile: !!peca.mobile });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(1500);
      const q = 'document.querySelector("[data-visita]").visitaQA';
      let prontas = false;
      for (let i = 0; i < 40 && !prontas; i++) {
        prontas = await p.avalia(q + '.quadro(' + peca.t + ', 0, 0' + (peca.centro ? ', [0.5, 0.5], true, ' + peca.escala : '') + ')');
        if (!prontas) await espera(250);
      }
      const url = await p.avalia(q + '.imagem()');
      const png = path.join(TMP, peca.arq.replace('.webp', '.png'));
      fs.writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '78', '-compression_level', '6', path.join(PASTA, peca.arq)]);
      console.log(peca.arq, Math.round(fs.statSync(path.join(PASTA, peca.arq)).size / 1024) + ' KB', p.erros.filter((e) => !/pontos-/.test(e)).join(' | '));
      await p.s('Page.close').catch(() => {});
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error(e); process.exit(1); });
