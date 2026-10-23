// Gera assets/img/og-indique.jpg (1200 × 630) com ffmpeg a partir dos assets da página: o pôster das fitas de luz,
// o logo oficial branco e o X oficial. Texto em Montserrat 800/600 (TTF baixado do Google Fonts para uma pasta
// temporária, fora do projeto). Uso: node gera-og.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
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
  // textos em arquivo (sem expansão de %)
  const textos = { l1: 'Indique a OneX', l2: 'e receba', l3: '100% da primeira', l4: 'parcela', l5: 'Programa de indicação OneX Data Centers' };
  for (const [k, v] of Object.entries(textos)) fs.writeFileSync(path.join(FONTES, k + '.txt'), v, 'utf8');
  const txt = (arq, fonte, tam, cor, x, y) => `drawtext=fontfile=${fonte}:textfile=${arq}.txt:expansion=none:fontsize=${tam}:fontcolor=${cor}:x=${x}:y=${y}`;
  const filtro = [
    // fundo: navy + pôster das fitas de luz deslocado para a direita (o cruzamento fica atrás do X)
    '[1:v]scale=-2:630,format=rgba,colorchannelmixer=aa=0.85[luz]',
    '[0:v][luz]overlay=x=330:y=0[f1]',
    // véu navy da esquerda para a direita: o texto fica sobre fundo calmo
    "color=c=0x000B41:s=1200x630,format=rgba,geq=r='0':g='11':b='65':a='255*clip(1.75-1.9*X/W\\,0.1\\,1)'[veu]",
    '[f1][veu]overlay=0:0[f2]',
    // X oficial sobre o cruzamento da luz e logo oficial branco
    '[2:v]scale=290:-1[x]', '[f2][x]overlay=x=752:y=185[f3]',
    '[3:v]scale=230:-1[logo]', '[f3][logo]overlay=x=72:y=58[f4]',
    '[f4]' + [
      txt('l1', 'montserrat-800.ttf', 62, 'white', 72, 196),
      txt('l2', 'montserrat-800.ttf', 62, 'white', 72, 266),
      txt('l3', 'montserrat-800.ttf', 62, '0xF9681C', 72, 352),
      txt('l4', 'montserrat-800.ttf', 62, '0xF9681C', 72, 422),
      txt('l5', 'montserrat-600.ttf', 24, 'white@0.82', 74, 528)
    ].join(',') + '[saida]'
  ].join(';');
  const saida = path.join(IMG, 'og-indique.jpg');
  execFileSync('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=0x000B41:s=1200x630',
    '-i', path.join(IMG, 'conexao-x-poster.webp'),
    '-i', path.join(IMG, 'onex-x.webp'),
    '-i', path.join(IMG, 'logo-onex-branco.webp'),
    '-filter_complex', filtro, '-map', '[saida]', '-frames:v', '1', '-q:v', '3', saida], { cwd: FONTES, stdio: 'inherit' });
  console.log(saida, fs.statSync(saida).size + ' bytes');
})().catch((e) => { console.error(e); process.exit(1); });
