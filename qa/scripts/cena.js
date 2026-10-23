// Cena do hero em quadros (tempo real, ?intro=0), recortados só na arte. Depois: rola para longe e volta (deve tocar
// de novo), aba oculta (deve congelar), movimento reduzido e ?fx=0 (quadro final parado).
// Uso: node cena.js [pasta] [largura]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'cena');
const W = Number(process.argv[3] || 1440);
const H = W < 768 ? 844 : 900;
const ALVOS = [100, 450, 900, 1300, 1700, 2100, 2500, 2800, 3150, 3500, 3800, 4150, 4500, 5200];
const MARCA = 'new MutationObserver(function(){var c=document.querySelector("[data-cena]");if(c&&c.classList.contains("em-cena")&&!c.classList.contains("pausada")&&!window.__t0)window.__t0=performance.now();}).observe(document,{subtree:true,attributes:true,attributeFilter:["class"]});';

(async () => {
  const b = abre();
  try {
    const p = await pagina(b, { largura: W, altura: H, mobile: W < 768 });
    await p.s('Page.addScriptToEvaluateOnNewDocument', { source: MARCA });
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    if (W < 768) { await p.rola(560); }
    for (let i = 0; i < 150 && !(await p.avalia('!!window.__t0')); i++) await espera(20);
    const caixa = await p.avalia('(() => { const r = document.querySelector("[data-cena]").getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; })()');
    for (const alvo of ALVOS) {
      const agora = await p.avalia('performance.now() - window.__t0');
      if (alvo > agora) await espera(alvo - agora);
      const real = Math.round(await p.avalia('performance.now() - window.__t0'));
      const r = await p.s('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: caixa.x - 10, y: caixa.y + (await p.avalia('scrollY')) - 10, width: caixa.w + 20, height: caixa.h + 20, scale: 1 } });
      require('fs').mkdirSync(SAIDA, { recursive: true });
      require('fs').writeFileSync(path.join(SAIDA, W + '-' + String(real).padStart(4, '0') + '.jpg'), Buffer.from(r.data, 'base64'));
    }
    // sai da tela e volta: deve rearmar e tocar de novo
    await p.rola(3000); await espera(600);
    const armada = await p.avalia('document.querySelector("[data-cena]").className');
    await p.rola(W < 768 ? 560 : 0); await espera(1200);
    const volta = await p.avalia('JSON.stringify({classe: document.querySelector("[data-cena]").className, linha1: getComputedStyle(document.querySelector(".cn-linha--1")).strokeDashoffset})');
    console.log('fora da tela:', armada, '| de volta 1,2 s depois:', volta);
    // aba oculta: congela
    await p.s('Emulation.setFocusEmulationEnabled', { enabled: false });
    await p.avalia('Object.defineProperty(document, "hidden", {configurable: true, get: () => true}); document.dispatchEvent(new Event("visibilitychange"))');
    const pausada = await p.avalia('document.querySelector("[data-cena]").classList.contains("pausada")');
    const t1 = await p.avalia('document.querySelector(".cn-linha--2").getAnimations()[0] && Math.round(document.querySelector(".cn-linha--2").getAnimations()[0].currentTime)');
    await espera(800);
    const t2 = await p.avalia('document.querySelector(".cn-linha--2").getAnimations()[0] && Math.round(document.querySelector(".cn-linha--2").getAnimations()[0].currentTime)');
    console.log('aba oculta: pausada =', pausada, '| relógio da cena', t1, '→', t2, '(800 ms depois)');
    await p.avalia('Object.defineProperty(document, "hidden", {configurable: true, get: () => false}); document.dispatchEvent(new Event("visibilitychange"))');
    await espera(300);
    console.log('aba visível de novo: pausada =', await p.avalia('document.querySelector("[data-cena]").classList.contains("pausada")'));

    // movimento reduzido e ?fx=0: quadro final parado, sem vídeo
    await p.reduzido(true);
    await p.vai(urlDe(path.join(RAIZ, 'index.html')));
    await espera(900);
    await p.foto(path.join(SAIDA, W + '-reduzido.png'));
    console.log('reduzido:', await p.avalia('JSON.stringify({intro: !!document.querySelector(".ix"), cena: document.querySelector("[data-cena]").className, video: document.querySelector("[data-video]").currentSrc || "(sem fonte)"})'));
    await p.reduzido(false);
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?fx=0'));
    await espera(900);
    await p.foto(path.join(SAIDA, W + '-fx0.png'));
    console.log('fx=0:', await p.avalia('JSON.stringify({intro: !!document.querySelector(".ix"), html: document.documentElement.className, cena: document.querySelector("[data-cena]").className, video: document.querySelector("[data-video]").currentSrc || "(sem fonte)", animacoes: document.getAnimations().length})'));
    if (p.erros.length) console.log('erros:', p.erros);
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
