// Folha de contato com o nome de cada quadro. Uso: node folha.js <pasta> <prefixo> <largura-do-quadro> <colunas>
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [pasta, prefixo, larg = '480', cols = '3'] = process.argv.slice(2);
const dir = path.resolve(pasta);
const quadro = new RegExp('^' + prefixo + '-\\d+\\.(jpg|png)$'); // só os quadros numerados (mesmo tamanho)
const arquivos = fs.readdirSync(dir).filter((f) => quadro.test(f)).sort();
fs.copyFileSync('C:/Windows/Fonts/arial.ttf', path.join(dir, '_fonte.ttf'));
const n = arquivos.length, c = Number(cols), linhas = Math.ceil(n / c);
const filtros = arquivos.map((f, i) => `[${i}]scale=${larg}:-1,drawtext=fontfile=_fonte.ttf:text='${f.replace(/\.\w+$/, '')} ms':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65[v${i}]`).join(';');
// posições explícitas (a grade do xstack exige colunas × linhas = quadros)
const pos = (k, eixo) => (k ? Array(k).fill(eixo + '0').join('+') : '0');
const layout = arquivos.map((_, i) => pos(i % c, 'w') + '_' + pos(Math.floor(i / c), 'h')).join('|');
const pilha = arquivos.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=${layout}:fill=black`;
void linhas;
const args = ['-v', 'error', '-y'];
arquivos.forEach((f) => args.push('-i', f));
args.push('-filter_complex', filtros + ';' + pilha, 'folha-' + prefixo + '.jpg');
execFileSync('ffmpeg', args, { cwd: dir, stdio: 'inherit' });
fs.unlinkSync(path.join(dir, '_fonte.ttf'));
console.log(path.join(dir, 'folha-' + prefixo + '.jpg'));
