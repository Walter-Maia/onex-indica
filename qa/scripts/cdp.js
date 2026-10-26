// Harness de QA: Edge headless controlado pelo DevTools Protocol via --remote-debugging-pipe (fd 3 = comandos,
// fd 4 = respostas). Roda no Node 14 (não precisa de WebSocket) e em tempo real (as animações CSS andam de verdade,
// ao contrário de --screenshot com --virtual-time-budget).
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function abre() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-qa-'));
  // QA_GPU=1 usa a GPU de verdade (para medir o custo do WebGL); sem ela, a SwiftShader (CPU) e números pessimistas
  const args = ['--headless=new', ...(process.env.QA_GPU ? [] : ['--disable-gpu']), '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', '--remote-debugging-pipe', '--user-data-dir=' + perfil, 'about:blank'];
  const p = spawn(EDGE, args, { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  const escrita = p.stdio[3], leitura = p.stdio[4];
  let id = 0; const pend = new Map(); const ouvintes = []; let buf = '';
  leitura.on('data', (d) => {
    buf += d.toString('utf8');
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      if (msg.id && pend.has(msg.id)) { const { ok, falha } = pend.get(msg.id); pend.delete(msg.id); msg.error ? falha(new Error(JSON.stringify(msg.error))) : ok(msg.result); }
      else ouvintes.forEach((f) => f(msg));
    }
  });
  const envia = (method, params = {}, sessionId) => new Promise((ok, falha) => {
    const m = { id: ++id, method, params }; if (sessionId) m.sessionId = sessionId;
    pend.set(m.id, { ok, falha }); escrita.write(JSON.stringify(m) + '\0');
  });
  // fecha o Edge e apaga o perfil temporário (cada perfil tem dezenas de MB; sem isso, a pasta temporária enche o disco)
  const apagaPerfil = () => { try { fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* o Edge ainda segura algum arquivo */ } };
  const fecha = async () => {
    try { await envia('Browser.close'); } catch (e) { /* já fechado */ }
    await new Promise((ok) => { const fim = setTimeout(ok, 3000); p.once('exit', () => { clearTimeout(fim); ok(); }); });
    try { p.kill(); } catch (e) { /* ok */ }
    apagaPerfil();
  };
  return { envia, ouvintes, fecha };
}

async function pagina(b, { largura = 1440, altura = 900, mobile = false, reduzido = false } = {}) {
  const { targetId } = await b.envia('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await b.envia('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => b.envia(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable'); await s('Network.enable');
  const erros = [];
  b.ouvintes.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; erros.push('exceção: ' + (d.exception ? d.exception.description : d.text)); }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) erros.push('console: ' + m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') erros.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Network.loadingFailed' && !m.params.canceled) erros.push('rede: ' + m.params.errorText + ' ' + (m.params.type || ''));
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) erros.push('http ' + m.params.response.status + ' ' + m.params.response.url);
  });
  const api = {
    s, erros,
    async tela(w, h, mob = false) {
      await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob });
      await s('Emulation.setTouchEmulationEnabled', mob ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    },
    async reduzido(sim) { await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: sim ? 'reduce' : 'no-preference' }] }); },
    async avalia(expr) {
      const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    },
    async vai(url) {
      const carregou = new Promise((ok) => { const f = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') ok(); }; b.ouvintes.push(f); });
      await s('Page.navigate', { url }); await carregou;
    },
    async foto(arq, { inteira = false, escala = 1 } = {}) {
      const jpg = /\.jpe?g$/.test(arq);
      const opts = { format: jpg ? 'jpeg' : 'png' };
      if (jpg) opts.quality = 78;
      if (inteira || escala !== 1) {
        const m = await s('Page.getLayoutMetrics');
        const w = m.cssContentSize ? m.cssContentSize.width : m.contentSize.width;
        const h = inteira ? (m.cssContentSize ? m.cssContentSize.height : m.contentSize.height) : m.cssLayoutViewport.clientHeight;
        const y = inteira ? 0 : m.cssLayoutViewport.pageY;
        opts.clip = { x: 0, y, width: w, height: h, scale: escala };
        opts.captureBeyondViewport = inteira;
      }
      const r = await s('Page.captureScreenshot', opts);
      fs.mkdirSync(path.dirname(arq), { recursive: true });
      fs.writeFileSync(arq, Buffer.from(r.data, 'base64'));
    },
    async rola(y) { await api.avalia('window.scrollTo(0,' + y + ')'); },
    async mouse(x, y) { await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); },
    async tecla(key) { await s('Input.dispatchKeyEvent', { type: 'keyDown', key }); await s('Input.dispatchKeyEvent', { type: 'keyUp', key }); }
  };
  await api.tela(largura, altura, mobile);
  if (reduzido) await api.reduzido(true);
  return api;
}

const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const urlDe = (arquivo, q = '') => 'file:///' + path.resolve(arquivo).replace(/\\/g, '/').replace(/ /g, '%20') + q;
module.exports = { abre, pagina, espera, urlDe };
