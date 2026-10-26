// Hero "visita" em muitas telas: notebooks com a escala do Windows (a área útil do navegador, já sem barras), monitores
// grandes, tablets e celulares em pé e deitados. Para cada tela, pinta as paradas (t = 0..6), mede se o texto da vez
// encosta no cabeçalho, passa da borda de baixo (ou do fio de progresso) ou do lado direito, e monta uma folha de quadros.
// Uso: node visita-telas.js [pasta] [telas "LxA" ou "LxAm" (m = celular, dpr 2) separadas por vírgula]
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'final/visita-telas');
const PADRAO = [
  // notebooks e monitores (área útil do navegador): 1366×768, 1920×1080 a 150% e a 125%, 1280×800, 1440×900, 1600×900,
  // 1920×1080, 2560×1440
  '1280x600', '1366x657', '1280x720', '1536x730', '1280x689', '1440x789', '1600x789', '1920x950', '2560x1271', '1024x640',
  // tablets
  '768x1024m', '820x1180m', '1024x768m', '1180x820m',
  // celulares em pé e deitados
  '320x568m', '360x640m', '375x667m', '390x844m', '412x915m', '430x932m', '667x375m', '844x390m', '915x412m'
];
const TELAS = (process.argv[3] ? process.argv[3].split(',') : PADRAO).map((s) => {
  const m = /^(\d+)x(\d+)(m?)$/.exec(s);
  return { w: +m[1], h: +m[2], mob: !!m[3], nome: s };
});
const TS = [0, 1, 2, 3, 4, 5, 6];
const rolaPara = (t) => `(function(){var s=document.querySelector('[data-visita]');var p=s.querySelector('[data-visita-palco]');
  var topo=s.getBoundingClientRect().top+pageYOffset;var curso=s.offsetHeight-p.offsetHeight;
  window.scrollTo({top:Math.round(topo+(${t}/6.5)*curso),behavior:'instant'});})()`;
// a legenda da vez e os limites livres do palco
const mede = (t) => `(function(){
  var el=document.querySelector('[data-parada="${t}"]');var r=el.getBoundingClientRect();
  var barra=document.querySelector('.topo__barra').getBoundingClientRect();
  var prog=document.querySelector('.visita__progresso').getBoundingClientRect();
  var pular=document.querySelector('.visita__pular').getBoundingClientRect();
  var horiz=prog.width>prog.height;
  var baixo=horiz?prog.top:innerHeight;
  var cls=document.documentElement.className;
  return {t:${t},topo:Math.round(r.top),base:Math.round(r.bottom),dir:Math.round(r.right),cab:Math.round(barra.bottom),limite:Math.round(baixo),
    larg:innerWidth,alt:innerHeight,sw:document.documentElement.scrollWidth,on:/visita-on/.test(cls),
    pular:Math.round(pular.top)+'-'+Math.round(pular.bottom)}})()`;

(async () => {
  fs.mkdirSync(SAIDA, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'telas-'));
  const b = abre();
  const problemas = [];
  try {
    for (const tela of TELAS) {
      const p = await pagina(b, { largura: tela.w, altura: tela.h, mobile: tela.mob });
      await p.s('Emulation.setDeviceMetricsOverride', { width: tela.w, height: tela.h, deviceScaleFactor: tela.mob ? 2 : 1, mobile: tela.mob });
      if (tela.mob) await p.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
      await espera(1800);
      const q = 'document.querySelector("[data-visita]").visitaQA';
      for (let i = 0; i < 40; i++) { if (await p.avalia(q + ' && ' + q + '.quadro(0,0,0)')) break; await espera(250); }
      const quadros = [];
      for (const t of TS) {
        await p.avalia(rolaPara(t));
        await espera(350);
        await p.avalia(q + '.quadro(' + t + ',0,0)');
        await espera(120);
        const m = await p.avalia(mede(t));
        const f = [];
        if (m.topo < m.cab + 6) f.push('encosta no cabeçalho (' + m.topo + ' < ' + m.cab + ')');
        if (m.base > m.limite - 6) f.push('passa da base (' + m.base + ' > ' + m.limite + ')');
        if (m.dir > m.larg) f.push('passa da direita');
        if (m.sw > m.larg) f.push('estouro lateral ' + m.sw);
        if (!m.on) f.push('sem visita-on');
        if (f.length) problemas.push(tela.nome + ' t' + t + ': ' + f.join('; '));
        const arq = path.join(tmp, tela.nome + '-' + t + '.png');
        await p.foto(arq);
        quadros.push(arq);
      }
      // folha: os 7 quadros lado a lado, cada um com 300 px de altura
      const ent = [].concat(...quadros.map((q) => ['-i', q]));
      const esc = quadros.map((_, i) => '[' + i + ']scale=-2:300[q' + i + ']').join(';');
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...ent, '-filter_complex', esc + ';' + quadros.map((_, i) => '[q' + i + ']').join('') + 'hstack=' + quadros.length, '-q:v', '4', path.join(SAIDA, tela.nome + '.jpg')]);
      console.log(tela.nome, p.erros.length ? 'ERROS: ' + p.erros.join(' | ') : 'ok');
      await p.s('Page.close').catch(() => {});
    }
  } finally { await b.fecha(); fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log(problemas.length ? 'PROBLEMAS:\n  ' + problemas.join('\n  ') : 'sem problemas de encaixe');
})().catch((e) => { console.error(e); process.exit(1); });
