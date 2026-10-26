// Gera assets/js/visita-cenas.js: as fotos da visita em data URI. Só é carregado quando a página abre em file://, onde
// o navegador trata as fotos como de outra origem e o canvas não pode ler os pixels (getImageData). Num servidor, o
// visita.js usa os .webp normais. Rode de novo depois de trocar qualquer foto em assets/img/visita/ (0-*.webp a 6-*.webp).
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const PASTA = path.join(RAIZ, 'assets', 'img', 'visita');
const fotos = fs.readdirSync(PASTA).filter((f) => /^\d-[a-z]+(-hd)?\.webp$/.test(f)).sort();
const linhas = fotos.map((f) => '  "assets/img/visita/' + f + '": "data:image/webp;base64,' + fs.readFileSync(path.join(PASTA, f)).toString('base64') + '"');
const js = '/* Gerado por qa/scripts/gera-cenas-js.js: fotos da visita em data URI, só para abrir a página em file:// */\n' +
  'window.VISITA_CENAS = {\n' + linhas.join(',\n') + '\n};\n';
fs.writeFileSync(path.join(RAIZ, 'assets', 'js', 'visita-cenas.js'), js);
console.log(fotos.length + ' fotos, ' + Math.round(js.length / 1024) + ' KB');
