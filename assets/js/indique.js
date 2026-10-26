/* Indique a OneX: comportamento da landing. Vanilla, carregado com defer, sem dependências.
   Regras: sem JS todo o conteúdo aparece no estado final; com movimento reduzido ou ?fx=0 nada se mexe; o que está na
   tela no carregamento não é escondido; os efeitos de entrada voltam ao início quando o bloco sai da tela e tocam de
   novo na volta; tudo para com a aba oculta. */
(function () {
  'use strict';

  var doc = document;
  var raiz = doc.documentElement;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var temIO = 'IntersectionObserver' in window;
  var estatico = raiz.classList.contains('fx-0');
  var semMovimento = function () { return estatico || reduzido.matches || !temIO; };
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* 1. Cabeçalho: ganha fundo depois da rolagem (sentinela, sem listener de scroll), troca de tom quando uma caixa
        navy passa pela linha do meio dele e abre o menu no celular */
  (function cabecalho() {
    var topo = $('[data-topo]');
    if (!topo) return;
    if (temIO) {
      var sentinela = doc.createElement('div');
      sentinela.setAttribute('aria-hidden', 'true');
      sentinela.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
      doc.body.insertBefore(sentinela, doc.body.firstChild);
      new IntersectionObserver(function (entradas) {
        topo.classList.toggle('topo--rolado', !entradas[0].isIntersecting);
      }).observe(sentinela);

      var escuras = $$('[data-escuro]');
      var observador = null;
      var monta = function () {
        if (observador) observador.disconnect();
        var meio = Math.round(topo.offsetHeight / 2);
        var abaixo = Math.max(0, window.innerHeight - meio - 1);
        var sob = [];
        observador = new IntersectionObserver(function (entradas) {
          entradas.forEach(function (e) {
            var i = sob.indexOf(e.target);
            if (e.isIntersecting && i < 0) sob.push(e.target);
            if (!e.isIntersecting && i >= 0) sob.splice(i, 1);
          });
          topo.setAttribute('data-tom', sob.length ? 'escuro' : 'claro');
        }, { rootMargin: '-' + meio + 'px 0px -' + abaixo + 'px 0px' });
        escuras.forEach(function (s) { observador.observe(s); });
      };
      monta();
      var altura = window.innerHeight;
      var espera = 0;
      window.addEventListener('resize', function () {
        clearTimeout(espera);
        espera = setTimeout(function () {
          if (window.innerHeight === altura) return;
          altura = window.innerHeight;
          monta();
        }, 150);
      });
    }

    // menu do celular
    var botao = $('[data-menu]');
    var painel = $('[data-menu-painel]');
    if (!botao || !painel) return;
    var fecha = function (devolveFoco) {
      if (!topo.classList.contains('menu-aberto')) return;
      topo.classList.remove('menu-aberto');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
      if (devolveFoco) botao.focus();
    };
    botao.addEventListener('click', function () {
      var abrir = !topo.classList.contains('menu-aberto');
      topo.classList.toggle('menu-aberto', abrir);
      botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    });
    painel.addEventListener('click', function (e) { if (e.target.closest('a')) fecha(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecha(true); });
    doc.addEventListener('click', function (e) { if (!topo.contains(e.target)) fecha(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { fecha(false); });
  })();

  /* 2. CTA fixo no celular: aparece depois do botão do hero e some quando o formulário está na tela */
  (function ctaFixo() {
    var barra = $('[data-cta-fixo]');
    var ctaHero = $('[data-cta-hero]');
    var form = doc.getElementById('indicar');
    if (!barra || !ctaHero || !form || !temIO) return;
    var heroPassou = false;
    var formNaTela = false;
    var atualiza = function () { barra.classList.toggle('visivel', heroPassou && !formNaTela); };
    new IntersectionObserver(function (entradas) {
      var e = entradas[0];
      heroPassou = !e.isIntersecting && e.boundingClientRect.top < 0;
      atualiza();
    }).observe(ctaHero);
    new IntersectionObserver(function (entradas) {
      formNaTela = entradas[0].isIntersecting;
      atualiza();
    }, { rootMargin: '0px 0px -10% 0px' }).observe(form);
  })();

  /* 3. Efeitos que se repetem: cada bloco volta ao estado inicial quando sai inteiro da tela e toca de novo quando
        volta (rolando para baixo ou para cima). O que já está na tela no carregamento fica no estado final. */
  var PASSOS_IO = [];
  for (var p = 0; p <= 20; p++) PASSOS_IO.push(p / 20);
  var repete = function (el, op) {
    if (!el || semMovimento()) return;
    var estado = 'final';
    var timer = 0;
    var arma = function () { clearTimeout(timer); estado = 'armado'; op.arma(el); };
    var solta = function () { clearTimeout(timer); estado = 'final'; op.conclui(el); };
    var toca = function () {
      estado = 'tocando';
      op.toca(el);
      timer = setTimeout(function () { if (estado === 'tocando') solta(); }, op.duracao);
    };
    // blocos mais altos que a tela começam com uma fração menor visível
    var limiar = function () { return Math.max(0.05, Math.min(op.limiar, 0.6 * window.innerHeight / Math.max(1, el.getBoundingClientRect().height))); };
    new IntersectionObserver(function (entradas) {
      var e = entradas[entradas.length - 1];
      if (reduzido.matches) { if (estado !== 'final') solta(); return; }
      if (!e.isIntersecting) { if (estado !== 'armado') arma(); return; }
      if (estado === 'armado' && (e.intersectionRatio >= limiar() || e.intersectionRect.height >= 0.5 * window.innerHeight)) toca();
    }, { threshold: PASSOS_IO }).observe(el);
  };
  var porClasses = function (armada, ativa) {
    return {
      arma: function (el) { el.classList.remove(ativa); el.classList.add(armada); },
      toca: function (el) { el.classList.remove(armada); el.classList.add(ativa); },
      conclui: function (el) { el.classList.remove(armada); el.classList.remove(ativa); }
    };
  };
  var com = function (base, extra) { for (var k in extra) base[k] = extra[k]; return base; };

  /* 3a. Passos (nó → título → linha) e marcas-d'água do X que se desenham */
  repete($('[data-passos]'), com(porClasses('armada', 'desenhando'), { limiar: 0.35, duracao: 2500 }));
  $$('[data-desenha]').forEach(function (el) {
    repete(el, com(porClasses('armada', 'desenhando'), { limiar: 0.2, duracao: 2700 }));
  });

  /* 3b. Ícones dos produtos e dos motivos: cada um com o seu movimento; tocam em sequência ao entrar na tela e de
         novo quando o ponteiro passa pelo item */
  (function icones() {
    if (semMovimento()) return;
    var reinicia = function (ico) {
      ico.classList.remove('toca', 'armado');
      void ico.getBoundingClientRect();
      ico.classList.add('toca');
    };
    $$('[data-produtos], [data-motivos]').forEach(function (grupo) {
      var icos = $$('.ico', grupo);
      var timers = [];
      var limpa = function () { timers.forEach(clearTimeout); timers = []; };
      repete(grupo, {
        limiar: 0.15, duracao: 3200,
        arma: function () { limpa(); icos.forEach(function (i) { i.classList.remove('toca'); i.classList.add('armado'); }); },
        toca: function () { limpa(); icos.forEach(function (i, n) { timers.push(setTimeout(function () { reinicia(i); }, n * 110)); }); },
        conclui: function () { limpa(); icos.forEach(function (i) { i.classList.remove('armado'); }); }
      });
      $$('.produto, .motivo', grupo).forEach(function (item) {
        var ico = $('.ico', item);
        if (!ico) return;
        item.addEventListener('mouseenter', function () {
          if (!ponteiroFino.matches || ico.classList.contains('armado')) return;
          reinicia(ico);
        });
      });
    });
  })();

  /* 3c. Títulos H2 linha a linha: cada linha sobe de dentro da própria máscara, 90 ms entre linhas.
         O texto inteiro fica num trecho só para leitores de tela; as linhas visuais ficam ocultas para eles. */
  (function titulosPorLinha() {
    var titulos = $$('[data-revela]');
    if (!titulos.length || semMovimento()) return;
    var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var itens = titulos.map(function (el) {
      return { el: el, texto: el.textContent.replace(/[ \t\r\n]+/g, ' ').trim(), grupos: [] };
    });
    // três passos para o navegador calcular o layout uma vez só: escreve as palavras, lê as posições, escreve as linhas
    var divide = function () {
      itens.forEach(function (it) {
        it.el.innerHTML = '<span class="so-leitor">' + esc(it.texto) + '</span><span class="titulo-linhas" aria-hidden="true">' +
          it.texto.split(' ').map(function (palavra) { return '<span data-p>' + esc(palavra) + '</span>'; }).join(' ') + '</span>';
      });
      itens.forEach(function (it) {
        var linhas = [];
        var topoAtual = null;
        $$('[data-p]', it.el).forEach(function (s) {
          var t = s.offsetTop;
          if (topoAtual === null || Math.abs(t - topoAtual) > 3) { linhas.push([]); topoAtual = t; }
          linhas[linhas.length - 1].push(s.textContent);
        });
        it.grupos = linhas;
      });
      itens.forEach(function (it) {
        $('.titulo-linhas', it.el).innerHTML = it.grupos.map(function (l, i) {
          return '<span class="linha-mascara"><span class="linha-conteudo" style="--i:' + Math.min(i, 8) + '">' + esc(l.join(' ')) + '</span></span>';
        }).join(' ');
      });
    };
    var comeca = function () {
      requestAnimationFrame(function () {
        divide();
        itens.forEach(function (it) { repete(it.el, com(porClasses('revela-armado', 'revela-ativo'), { limiar: 0.6, duracao: 1700 })); });
      });
    };
    var largura = window.innerWidth;
    var espera = 0;
    window.addEventListener('resize', function () {
      clearTimeout(espera);
      espera = setTimeout(function () {
        if (window.innerWidth === largura) return;
        largura = window.innerWidth;
        requestAnimationFrame(divide);
      }, 200);
    });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(comeca, comeca); else comeca();
    // a Montserrat carrega sem bloquear a página: quando ela chega, as quebras mudam e as linhas são refeitas
    if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', function () { requestAnimationFrame(divide); });
  })();

  /* 4. Simulador: produto → plano → "Sua comissão". Valores de referência publicados em onexdc.com.br; a comissão é
        100% da 1ª parcela do plano efetivamente contratado. O valor troca como uma placa (sem contagem). */
  (function simulador() {
    var form = $('[data-simulador]');
    if (!form) return;
    var PRODUTOS = {
      colocation: { nome: 'Colocation', planos: [{ nome: 'Colocation', valor: null }] },
      dedicados: { nome: 'Servidores dedicados e área dedicada', planos: [{ nome: 'Servidor dedicado ou área dedicada', valor: null }] },
      vps: { nome: 'VPS Linux', planos: [{ nome: 'VPS Linux (4 GB de RAM, 2 vCPU, 120 GB, 12 meses)', valor: null }] },
      hospedagem: { nome: 'Hospedagem de sites', planos: [{ nome: 'Plano Básico', valor: 29.9 }] },
      virtualizacao: { nome: 'Virtualização', planos: [{ nome: 'Virtualização', valor: null }] },
      nuvem: { nome: 'Soluções em nuvem (OnexCloud)', planos: [{ nome: 'OnexCloud (1 TB compartilhado, backup incluso)', valor: null }] },
      email: { nome: 'E-mail profissional', planos: [{ nome: 'E-mail profissional', valor: null }] },
      voip: { nome: 'Telefonia VoIP', planos: [{ nome: 'Essencial', valor: 99 }, { nome: 'Profissional', valor: 199 }, { nome: 'Enterprise', valor: null }] },
      backup: { nome: 'Backup em nuvem', planos: [{ nome: 'Backup em nuvem', valor: null }] }
    };
    var grupoPlanos = $('[data-sim-planos]', form);
    var listaPlanos = $('[data-sim-planos-lista]', form);
    var valorEl = $('[data-sim-valor]', form);
    var contaEl = $('[data-sim-conta]', form);
    var parcelas = $('[data-sim-parcelas]', form);
    var anuncio = $('[data-sim-anuncio]', form);
    var real = function (v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
    var anterior = valorEl.textContent.trim();
    var timerAnuncio = 0;

    var produtoAtual = function () { var r = $('input[name="sim-produto"]:checked', form); return r ? r.value : 'voip'; };
    var planoAtual = function () { var r = $('input[name="sim-plano"]:checked', form); return r ? Number(r.value) : 0; };

    var montaPlanos = function (id, preferido) {
      var prod = PRODUTOS[id];
      grupoPlanos.hidden = prod.planos.length < 2;
      listaPlanos.innerHTML = prod.planos.map(function (pl, i) {
        return '<label class="chip"><input type="radio" name="sim-plano" value="' + i + '"' + (i === preferido ? ' checked' : '') + '><span>' + pl.nome + '</span></label>';
      }).join('');
    };

    var troca = function (texto, ehTexto) {
      if (texto === anterior) return;
      anterior = texto;
      var animar = !semMovimento();
      valorEl.classList.toggle('sim__valor--texto', ehTexto);
      var velho = $('.sim__num:not(.sai)', valorEl);
      var novo = doc.createElement('span');
      novo.className = 'sim__num';
      novo.textContent = texto;
      if (!animar || !velho) {
        valorEl.innerHTML = '';
        valorEl.appendChild(novo);
        return;
      }
      $$('.sim__num.sai', valorEl).forEach(function (n) { n.remove(); });
      velho.classList.remove('entra');
      velho.classList.add('sai');
      novo.classList.add('entra');
      valorEl.appendChild(novo);
      setTimeout(function () { if (velho.parentNode) velho.remove(); }, 240);
      if (parcelas) {
        parcelas.classList.remove('enche');
        void parcelas.offsetWidth;
        parcelas.classList.add('enche');
      }
    };

    var atualiza = function () {
      var id = produtoAtual();
      var prod = PRODUTOS[id];
      var i = Math.min(planoAtual(), prod.planos.length - 1);
      var plano = prod.planos[i];
      var texto, conta, falado;
      if (plano.valor != null) {
        texto = real(plano.valor);
        conta = '1ª parcela do ' + (id === 'voip' ? 'VoIP ' + plano.nome : plano.nome + ' de Hospedagem') + ': ' + real(plano.valor) + ' por mês × 100%';
        falado = 'Sua comissão: ' + real(plano.valor) + '.';
      } else {
        texto = '100% da 1ª parcela';
        conta = 'do plano que a empresa fechar. Preço sob consulta: a OneX monta a proposta para a empresa indicada.';
        falado = 'Sua comissão: 100% da 1ª parcela do plano fechado. Preço sob consulta.';
      }
      troca(texto, plano.valor == null);
      contaEl.textContent = conta;
      clearTimeout(timerAnuncio);
      timerAnuncio = setTimeout(function () { anuncio.textContent = falado; }, 250);
    };

    form.addEventListener('change', function (e) {
      if (e.target.name === 'sim-produto') {
        var prod = PRODUTOS[e.target.value];
        montaPlanos(e.target.value, prod.planos.length > 1 ? 1 : 0);
      }
      atualiza();
    });
    // estado inicial coerente com o HTML (VoIP Profissional), mesmo se o navegador restaurou outra escolha
    var id = produtoAtual();
    if (!$('input[name="sim-plano"]:checked', form) || PRODUTOS[id].planos.length < 2) montaPlanos(id, PRODUTOS[id].planos.length > 1 ? 1 : 0);
    atualiza();
  })();

  /* 5. Formulário "Quero indicar": validação em português, máscara de telefone e envio pelo WhatsApp da OneX
        (sem backend: monta a mensagem e abre https://wa.me/553140404888?text=...) */
  (function formulario() {
    var form = $('[data-formulario]');
    if (!form) return;
    form.noValidate = true;
    var WHATSAPP = '553140404888';
    var botao = $('[data-enviar]', form);
    var rotulo = $('[data-enviar-texto]', form);
    var status = $('[data-status]', form);
    var sucesso = $('[data-sucesso]');
    var linkSucesso = $('[data-sucesso-link]');
    var nova = $('[data-nova]');
    var TEXTO_BOTAO = rotulo.textContent;

    var formataTelefone = function (valor) {
      var d = valor.replace(/\D/g, '');
      if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
      if (d.charAt(0) === '0') d = d.slice(1);
      d = d.slice(0, 11);
      if (d.length > 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      if (d.length > 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      if (d.length > 2) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length) return '(' + d;
      return '';
    };
    $$('[data-telefone]', form).forEach(function (campo) {
      campo.addEventListener('input', function () {
        if (campo.selectionStart === campo.value.length) campo.value = formataTelefone(campo.value);
      });
      campo.addEventListener('blur', function () { campo.value = formataTelefone(campo.value); });
    });

    var regras = {
      nome: function (v) { return v.trim().length >= 3 ? '' : 'Escreva o seu nome.'; },
      whatsapp: function (v) {
        var d = v.replace(/\D/g, '');
        if (!d) return 'Escreva o seu WhatsApp com DDD.';
        return /^[1-9]{2}9\d{8}$/.test(d) ? '' : 'Confira o WhatsApp: DDD e número do celular, como (31) 99999-9999.';
      },
      email: function (v) {
        v = v.trim();
        if (!v) return 'Escreva o seu e-mail.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Confira o e-mail. Exemplo: nome@empresa.com.br';
      },
      empresa: function (v) { return v.trim().length >= 2 ? '' : 'Escreva o nome da empresa indicada.'; },
      contato: function (v) { return v.trim().length >= 2 ? '' : 'Escreva o nome de quem decide na empresa.'; },
      contato_telefone: function (v) {
        var d = v.replace(/\D/g, '');
        if (!d) return 'Escreva o telefone de quem decide, com DDD.';
        return /^[1-9]{2}\d{8,9}$/.test(d) ? '' : 'Confira o telefone: DDD e número, como (31) 3333-3333 ou (31) 99999-9999.';
      },
      produto: function (v) { return v ? '' : 'Escolha um produto (ou “Ainda não sei”).'; },
      lgpd: function (v, campo) { return campo.checked ? '' : 'Marque a autorização para a OneX usar estes dados na indicação.'; }
    };
    var erroDe = function (campo) { return doc.getElementById('erro-' + campo.id); };
    var valida = function (campo, mostrar) {
      var regra = regras[campo.name];
      if (!regra) return true;
      var msg = regra(campo.value, campo);
      var alvo = erroDe(campo);
      if (mostrar || campo.getAttribute('aria-invalid') === 'true') {
        campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (alvo) alvo.textContent = msg;
      }
      return !msg;
    };
    var campos = $$('input, select, textarea', form);
    campos.forEach(function (campo) {
      campo.addEventListener('blur', function () { if (campo.value && campo.type !== 'checkbox') valida(campo, true); });
      campo.addEventListener('input', function () { valida(campo, false); });
      campo.addEventListener('change', function () { valida(campo, campo.tagName === 'SELECT' || campo.type === 'checkbox'); });
    });

    var estado = function (nome) {
      form.setAttribute('data-estado', nome);
      botao.disabled = nome === 'abrindo';
      botao.setAttribute('aria-busy', nome === 'abrindo' ? 'true' : 'false');
      rotulo.textContent = nome === 'abrindo' ? 'Abrindo WhatsApp…' : TEXTO_BOTAO;
    };
    var valor = function (nome) { var c = form.elements[nome]; return c ? c.value.trim() : ''; };
    var mensagem = function () {
      var linhas = [
        'Olá, OneX! Quero fazer uma indicação pelo programa Indique a OneX.',
        '',
        '*Quem indica*',
        'Nome: ' + valor('nome'),
        'WhatsApp: ' + valor('whatsapp'),
        'E-mail: ' + valor('email'),
        '',
        '*Empresa indicada*',
        'Empresa: ' + valor('empresa'),
        'Quem decide: ' + valor('contato') + ', ' + valor('contato_telefone'),
        'Produto de interesse: ' + valor('produto')
      ];
      if (valor('observacao')) linhas.push('Observação: ' + valor('observacao'));
      linhas.push('', 'Autorizo a OneX a usar estes dados para tratar desta indicação; a pessoa indicada concorda em receber o contato.');
      return linhas.join('\n');
    };

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      if (form.getAttribute('data-estado') === 'abrindo') return;
      var primeiroInvalido = null;
      campos.forEach(function (campo) { if (!valida(campo, true) && !primeiroInvalido) primeiroInvalido = campo; });
      if (primeiroInvalido) {
        status.className = 'formulario__status erro';
        status.textContent = 'Confira os campos destacados para enviar a indicação.';
        primeiroInvalido.focus();
        return;
      }
      status.className = 'formulario__status';
      status.textContent = '';
      var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensagem());
      estado('abrindo');
      // a janela abre dentro do gesto de envio (não é bloqueada); se o navegador recusar, segue na mesma aba
      var janela = null;
      try { janela = window.open(url, '_blank'); } catch (e) { janela = null; }
      if (!janela) { window.location.href = url; return; }
      try { janela.opener = null; } catch (e) { /* outra origem */ }
      if (linkSucesso) linkSucesso.href = url;
      setTimeout(function () {
        estado('pronto');
        form.hidden = true;
        sucesso.hidden = false;
        sucesso.focus();
      }, 900);
    });

    if (nova) nova.addEventListener('click', function () {
      // mantém os dados de quem indica e limpa os da empresa
      ['empresa', 'contato', 'contato_telefone', 'observacao'].forEach(function (n) { if (form.elements[n]) form.elements[n].value = ''; });
      form.elements.produto.selectedIndex = 0;
      form.elements.lgpd.checked = false;
      campos.forEach(function (c) { c.removeAttribute('aria-invalid'); var e = erroDe(c); if (e) e.textContent = ''; });
      estado('pronto');
      sucesso.hidden = true;
      form.hidden = false;
      form.elements.empresa.focus();
    });
  })();
})();
