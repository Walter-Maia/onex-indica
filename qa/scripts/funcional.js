// Testes funcionais: simulador, formulário (validação e URL do WhatsApp), menu do celular, FAQ, foco visível,
// um único H1, imagens com alt/width/height. Uso: node funcional.js [pasta]
'use strict';
const path = require('path');
const { abre, pagina, espera, urlDe } = require('./cdp');
const RAIZ = path.resolve(__dirname, '..', '..');
const SAIDA = path.resolve(RAIZ, 'qa', process.argv[2] || 'funcional');
const ok = (cond, msg) => console.log((cond ? 'OK   ' : 'FALHA') + ' ' + msg);

(async () => {
  const b = abre();
  const abertas = [];
  b.ouvintes.push((m) => { if ((m.method === 'Target.targetCreated' || m.method === 'Target.targetInfoChanged') && m.params.targetInfo.type === 'page') abertas.push(m.params.targetInfo); });
  await b.envia('Target.setDiscoverTargets', { discover: true });
  try {
    const p = await pagina(b, { largura: 1440, altura: 900 });
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(800);

    // estrutura
    const est = JSON.parse(await p.avalia(`JSON.stringify({
      h1: document.querySelectorAll('h1').length,
      titulos: [...document.querySelectorAll('h1,h2,h3')].map(h => +h.tagName[1]),
      imgsSemAtributos: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt') || !i.hasAttribute('width') || !i.hasAttribute('height')).length,
      botoesIconeSemNome: [...document.querySelectorAll('button')].filter(bt => !bt.textContent.trim() && !bt.getAttribute('aria-label')).length,
      inputsSemAutocomplete: [...document.querySelectorAll('[data-formulario] input:not([type=checkbox]), [data-formulario] textarea')].filter(i => !i.hasAttribute('autocomplete')).length,
      inputsSemRotulo: [...document.querySelectorAll('input, select, textarea')].filter(i => i.type !== 'hidden' && !(i.labels && i.labels.length)).length,
      idsRepetidos: (() => { const v = {}; [...document.querySelectorAll('[id]')].forEach(e => v[e.id] = (v[e.id] || 0) + 1); return Object.keys(v).filter(k => v[k] > 1); })()
    })`));
    ok(est.h1 === 1, 'um único H1');
    const saltos = est.titulos.filter((n, i) => i && n - est.titulos[i - 1] > 1);
    ok(saltos.length === 0, 'títulos sem salto de nível (' + est.titulos.join('') + ')');
    ok(est.imgsSemAtributos === 0, 'toda <img> com alt, width e height');
    ok(est.botoesIconeSemNome === 0, 'botões-ícone com nome acessível');
    ok(est.inputsSemAutocomplete === 0, 'campos do formulário com autocomplete');
    ok(est.inputsSemRotulo === 0, 'todo campo com <label>');
    ok(est.idsRepetidos.length === 0, 'ids únicos ' + JSON.stringify(est.idsRepetidos));

    // simulador
    await p.avalia('document.getElementById("simulador").scrollIntoView()');
    await espera(600);
    const clica = async (sel) => { await p.avalia(`document.querySelector('${sel}').click()`); await espera(450); };
    const leitura = () => p.avalia('JSON.stringify({valor: document.querySelector("[data-sim-valor] .sim__num:not(.sai)").textContent, conta: document.querySelector("[data-sim-conta]").textContent, planos: !document.querySelector("[data-sim-planos]").hidden, anuncio: document.querySelector("[data-sim-anuncio]").textContent})');
    let r = JSON.parse(await leitura());
    ok(r.valor.replace(/\s/g, ' ') === 'R$ 199,00', 'simulador abre em VoIP Profissional: ' + r.valor);
    await clica('input[name="sim-plano"][value="0"]');
    r = JSON.parse(await leitura());
    ok(r.valor.replace(/\s/g, ' ') === 'R$ 99,00', 'VoIP Essencial → ' + r.valor + ' | ' + r.conta);
    await clica('input[name="sim-produto"][value="hospedagem"]');
    r = JSON.parse(await leitura());
    ok(r.valor.replace(/\s/g, ' ') === 'R$ 29,90' && !r.planos, 'Hospedagem → ' + r.valor + ' (sem grupo de planos) | ' + r.conta);
    await p.foto(path.join(SAIDA, 'simulador-hospedagem.png'));
    await clica('input[name="sim-produto"][value="colocation"]');
    r = JSON.parse(await leitura());
    ok(r.valor === '100% da 1ª parcela', 'Colocation (sob consulta) → ' + r.valor + ' | ' + r.conta + ' | anúncio: ' + r.anuncio);
    await p.foto(path.join(SAIDA, 'simulador-sob-consulta.png'));
    await clica('input[name="sim-produto"][value="voip"]');
    await clica('input[name="sim-plano"][value="2"]');
    r = JSON.parse(await leitura());
    ok(r.valor === '100% da 1ª parcela', 'VoIP Enterprise → ' + r.valor);
    // troca no meio da troca (cliques rápidos): só um valor fica
    await p.avalia('document.querySelector(\'input[name="sim-plano"][value="0"]\').click(); document.querySelector(\'input[name="sim-plano"][value="1"]\').click();');
    await espera(500);
    ok(await p.avalia('document.querySelectorAll("[data-sim-valor] .sim__num").length') === 1, 'cliques rápidos deixam um só valor na placa');

    // formulário: envio vazio mostra erros e foca o primeiro campo
    await p.avalia('document.getElementById("indicar").scrollIntoView()');
    await espera(500);
    await p.avalia('document.querySelector("[data-enviar]").click()');
    await espera(300);
    r = JSON.parse(await p.avalia('JSON.stringify({erros: [...document.querySelectorAll("[data-erro]")].filter(e => e.textContent).length, foco: document.activeElement.id, status: document.querySelector("[data-status]").textContent})'));
    ok(r.erros === 8 && r.foco === 'f-nome', 'envio vazio: ' + r.erros + ' erros inline, foco em ' + r.foco + ' | ' + r.status);
    await p.foto(path.join(SAIDA, 'form-erros.png'));
    // telefone com máscara e validação
    await p.avalia(`(() => { const f = document.querySelector('[data-formulario]');
      const set = (n, v) => { const c = f.elements[n]; c.value = v; c.dispatchEvent(new Event('input', {bubbles: true})); c.dispatchEvent(new Event('blur')); };
      set('nome', 'Maria Souza'); set('whatsapp', '31987654321'); set('email', 'maria@exemplo.com.br');
      set('empresa', 'Transportes Vale Ltda.'); set('contato', 'João Lima'); set('contato_telefone', '3133334444');
      f.elements.produto.value = 'Colocation'; f.elements.produto.dispatchEvent(new Event('change', {bubbles: true}));
      set('observacao', 'Querem migrar 3 servidores & backup até dezembro.');
      f.elements.lgpd.checked = true; f.elements.lgpd.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    r = JSON.parse(await p.avalia('JSON.stringify({w: document.getElementById("f-whatsapp").value, t: document.getElementById("f-contato-tel").value, erros: [...document.querySelectorAll("[data-erro]")].filter(e => e.textContent).length})'));
    ok(r.w === '(31) 98765-4321' && r.t === '(31) 3333-4444' && r.erros === 0, 'máscaras ' + r.w + ' / ' + r.t + ', erros restantes: ' + r.erros);
    // clique com ativação de usuário (como um clique real): a aba do WhatsApp pode abrir
    await p.s('Runtime.evaluate', { expression: 'document.querySelector("[data-enviar]").click()', userGesture: true });
    await espera(150);
    const rotulo = await p.avalia('document.querySelector("[data-enviar-texto]").textContent');
    ok(rotulo === 'Abrindo WhatsApp…', 'botão muda para "' + rotulo + '"');
    await espera(1200);
    const wa = abertas.find((t) => /wa\.me|whatsapp/.test(t.url));
    ok(!!wa, 'abriu nova aba do WhatsApp');
    if (wa) {
      const u = new URL(wa.url.replace('api.whatsapp.com/send/?phone=553140404888&', 'wa.me/553140404888?'));
      console.log('      URL aberta: ' + wa.url.slice(0, 80) + '…');
      const txt = new URL(wa.url).searchParams.get('text') || '';
      ok(/553140404888/.test(wa.url) && /Transportes Vale Ltda\./.test(txt) && /Quem decide: João Lima, \(31\) 3333-4444/.test(txt) && /& backup/.test(txt), 'mensagem com os dados (texto decodificado ok)');
      console.log(txt.split('\n').map((l) => '        | ' + l).join('\n'));
      void u;
    }
    // o temporizador de 900 ms pode atrasar: a aba original fica em segundo plano quando o WhatsApp abre
    for (let k = 0; k < 40 && await p.avalia('document.querySelector("[data-sucesso]").hidden'); k++) await espera(100);
    r = JSON.parse(await p.avalia('JSON.stringify({sucesso: !document.querySelector("[data-sucesso]").hidden, form: document.querySelector("[data-formulario]").hidden, foco: document.activeElement.hasAttribute("data-sucesso")})'));
    ok(r.sucesso && r.form, 'painel de sucesso visível no lugar do formulário');
    console.log('      foco no painel de sucesso: ' + r.foco + ' (pode falhar no headless se a aba nova tomar o foco da janela)');
    await p.foto(path.join(SAIDA, 'form-sucesso.png'));
    await p.avalia('document.querySelector("[data-nova]").click()');
    await espera(200);
    r = JSON.parse(await p.avalia('JSON.stringify({nome: document.getElementById("f-nome").value, empresa: document.getElementById("f-empresa").value, foco: document.activeElement.id})'));
    ok(r.nome === 'Maria Souza' && r.empresa === '' && r.foco === 'f-empresa', '"Indicar outra empresa" mantém quem indica e limpa a empresa');

    // FAQ: abre e fecha
    await p.avalia('document.getElementById("perguntas").scrollIntoView()');
    await espera(500);
    await p.avalia('document.querySelector(".faq summary").click()');
    await espera(450);
    await p.mouse(900, 520);
    await espera(400);
    await p.foto(path.join(SAIDA, 'faq-aberta-hover.png'));
    ok(await p.avalia('document.querySelector(".faq details").open'), 'FAQ abre no clique');

    // foco visível: Tab a partir do topo
    await p.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(600);
    await p.tecla('Tab');
    await espera(150);
    ok(await p.avalia('document.activeElement.classList.contains("pular")'), 'primeiro Tab cai em "Pular para o conteúdo"');
    await p.foto(path.join(SAIDA, 'foco-pular.png'));
    await p.tecla('Tab'); await p.tecla('Tab');
    await espera(150);
    await p.foto(path.join(SAIDA, 'foco-nav.png'));

    // menu do celular
    const m = await pagina(b, { largura: 390, altura: 844, mobile: true });
    await m.vai(urlDe(path.join(RAIZ, 'index.html'), '?intro=0'));
    await espera(1200);
    await m.avalia('document.querySelector("[data-menu]").click()');
    await espera(400);
    r = JSON.parse(await m.avalia('JSON.stringify({aberto: document.querySelector("[data-topo]").classList.contains("menu-aberto"), exp: document.querySelector("[data-menu]").getAttribute("aria-expanded"), rotulo: document.querySelector("[data-menu]").getAttribute("aria-label")})'));
    ok(r.aberto && r.exp === 'true' && r.rotulo === 'Fechar menu', 'menu abre (aria-expanded=' + r.exp + ', rótulo "' + r.rotulo + '")');
    await m.foto(path.join(SAIDA, 'menu-390.png'));
    await m.tecla('Escape');
    await espera(200);
    r = JSON.parse(await m.avalia('JSON.stringify({aberto: document.querySelector("[data-topo]").classList.contains("menu-aberto"), foco: document.activeElement.hasAttribute("data-menu")})'));
    ok(!r.aberto && r.foco, 'Escape fecha o menu e devolve o foco ao botão');
    const erros = p.erros.concat(m.erros).filter((e) => !/wa\.me|whatsapp/i.test(e));
    ok(erros.length === 0, 'sem erros de console/rede ' + (erros.length ? JSON.stringify(erros) : ''));
  } finally { await b.fecha(); }
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
