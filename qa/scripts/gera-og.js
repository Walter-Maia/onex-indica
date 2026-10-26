// Gera assets/img/og-indique.jpg (1200 × 630): o X da OneX em pontos, desenhado pelo próprio renderizador do hero
// (assets/js/visita.js, pelo gancho de QA no Edge headless), o logo oficial branco (com o X laranja) e o texto em Montserrat 800/600
// (TTF baixado do Google Fonts para uma pasta temporária, fora do projeto), compostos com ffmpeg. Uso: node gera-og.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const IMG = path.join(RAIZ, 'assets', 'img');
const FONTES = path.join(os.tmpdir(), 'onex-og-fontes');
const TTF = {
  'montserrat-800.ttf': 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr73w5aX8.ttf',
  'montserrat-600.ttf': 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu173w5aX8.ttf'
};
const baixa = (url, destino) => new Promise((ok, falha) => {
  https.get(url, (r) => {
    if (r.statusCode !== 200) { falha(new Error(url + ' → ' + r.statusCode)); return; }
    const f = fs.createWriteStream(destino); r.pipe(f); f.on('finish', () => f.close(ok));
  }).on('error', falha);
});

(async () => {
  fs.mkdirSync(FONTES, { recursive: true });
  for (const [nome, url] of Object.entries(TTF)) if (!fs.existsSync(path.join(FONTES, nome))) await baixa(url, path.join(FONTES, nome));
  // o X em pontos, à direita (o mesmo desenho da última parada da visita, sem a máscara do texto)
  const pontos = path.join(FONTES, 'og-pontos.png');
  const b = abre();
  try {
    const p = await pagina(b, { largura: 1200, altura: 630 });
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(1500);
    const q = 'document.querySelector("[data-visita]").visitaQA';
    let prontas = false;
    for (let i = 0; i < 40 && !prontas; i++) {
      prontas = await p.avalia(q + '.quadro(6, 0, 0, [0.76, 0.5], true)');
      if (!prontas) await espera(250);
    }
    const url = await p.avalia(q + '.imagem()');
    fs.writeFileSync(pontos, Buffer.from(url.split(',')[1], 'base64'));
  } finally { await b.fecha(); }
  // textos em arquivo (sem expansão de %)
  const textos = { l1: 'Indique a OneX', l2: 'e receba', l3: '100% da primeira', l4: 'parcela', l5: 'Programa de indicação OneX Data Centers' };
  for (const [k, v] of Object.entries(textos)) fs.writeFileSync(path.join(FONTES, k + '.txt'), v, 'utf8');
  const txt = (arq, fonte, tam, cor, x, y) => `drawtext=fontfile=${fonte}:textfile=${arq}.txt:expansion=none:fontsize=${tam}:fontcolor=${cor}:x=${x}:y=${y}`;
  const filtro = [
    // fundo: o X em pontos sobre o preto; logo oficial branco com o X laranja do logo oficial (como no cabeçalho:
    // X em x 639–865, y 0–198 do logo de 866 × 250)
    '[0:v]format=rgba[f1]',
    "[1:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gte(X,639)*lt(Y,198),0,alpha(X,Y))'[nome]",
    '[2:v]format=rgba,crop=227:198:639:0[x]',
    '[nome][x]overlay=x=639:y=0,scale=230:-1[logo]', '[f1][logo]overlay=x=72:y=58[f2]',
    '[f2]' + [
      txt('l1', 'montserrat-800.ttf', 62, 'white', 72, 196),
      txt('l2', 'montserrat-800.ttf', 62, 'white', 72, 266),
      txt('l3', 'montserrat-800.ttf', 62, '0xF9681C', 72, 352),
      txt('l4', 'montserrat-800.ttf', 62, '0xF9681C', 72, 422),
      txt('l5', 'montserrat-600.ttf', 24, 'white@0.82', 74, 528)
    ].join(',') + '[saida]'
  ].join(';');
  const saida = path.join(IMG, 'og-indique.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-y',
    '-i', pontos,
    '-i', path.join(IMG, 'logo-onex-branco.webp'),
    '-i', path.join(IMG, 'logo-onex-cinza.webp'),
    '-filter_complex', filtro, '-map', '[saida]', '-frames:v', '1', '-q:v', '3', saida], { cwd: FONTES, stdio: 'inherit' });
  console.log(saida, fs.statSync(saida).size + ' bytes');
})().catch((e) => { console.error(e); process.exit(1); });
