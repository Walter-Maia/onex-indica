// Quadros da intro em tempo real (?intro=1). Cada arquivo leva o instante real em ms desde que .ix-tocando entrou.
// Também confere: a sessão é gravada, a intro some do DOM, o cabeçalho entra, e Escape pula na hora.
// Uso: node intro.js [pasta] [larguras]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'intro');
const LARGURAS = (process.argv[3] || '1440,390').split(',').map(Number);
const ALVOS = [150, 300, 450, 600, 750, 950, 1250, 1550, 1900, 2350, 2900, 3100, 3300, 3550, 3800];
const MARCA = 'new MutationObserver(function(){var o=document.querySelector(".ix");if(o&&o.classList.contains("ix-tocando")&&!window.__t0)window.__t0=performance.now();}).observe(document,{subtree:true,attributes:true,attributeFilter:["class"],childList:true});';

(async () => {
  const b = abre();
  try {
    for (const w of LARGURAS) {
      const h = w < 768 ? 844 : 900;
      const p = await pagina(b, { largura: w, altura: h, mobile: w < 768 });
      await p.s('Page.addScriptToEvaluateOnNewDocument', { source: MARCA });
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=1'));
      for (let i = 0; i < 100 && !(await p.avalia('!!window.__t0')); i++) await espera(20);
      for (const alvo of ALVOS) {
        const agora = await p.avalia('performance.now() - window.__t0');
        if (alvo > agora) await espera(alvo - agora);
        const real = Math.round(await p.avalia('performance.now() - window.__t0'));
        await p.foto(path.join(SAIDA, w + '-' + String(real).padStart(4, '0') + '.jpg'));
      }
      await espera(800);
      console.log(w, await p.avalia('JSON.stringify({sessao: sessionStorage.getItem("onex-indique-intro"), overlay: !!document.querySelector(".ix"), classes: document.documentElement.className})'));
      if (p.erros.length) console.log('  erros:', p.erros);

      // pular com Escape no meio
      await p.avalia('sessionStorage.clear()');
      await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=1'));
      await espera(700);
      await p.tecla('Escape');
      await espera(400);
      console.log(w, 'depois do Escape:', await p.avalia('JSON.stringify({overlay: !!document.querySelector(".ix"), classes: document.documentElement.className})'));
      // recarregar na mesma sessão: não repete
      await p.vai(urlDe(path.join(RAIZ, 'index.html')));
      await espera(300);
      console.log(w, 'recarga na sessão:', await p.avalia('JSON.stringify({ativa: document.documentElement.classList.contains("intro-ativa"), overlay: !!document.querySelector(".ix")})'));
      // com #âncora: não roda
      await p.avalia('sessionStorage.clear()');
      await p.vai('about:blank'); await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?ancora=1#produtos'));
      await espera(300);
      console.log(w, 'com #âncora:', await p.avalia('JSON.stringify({ativa: document.documentElement.classList.contains("intro-ativa"), overlay: !!document.querySelector(".ix")})'));
    }
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
