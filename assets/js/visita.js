/* Visita à OneX: o hero da landing de indicação. A rolagem leva a pessoa para dentro da OneX (fachada → corredor →
   rack → rede → storage → telefonia → o X) e cada parada mostra produtos que dá para indicar.
   As cenas (fotos ilustrativas geradas no Higgsfield) são desenhadas em pontos: o efeito "Sunset" do editor ASCII do
   21st.dev (renderMode "dots"), refeito em WebGL com a paleta da OneX, em três passadas na GPU:
     1. grade: cada célula (5 px; 4 px no celular) amostra a cena da vez (e, na troca, a próxima, que nasce pequena no
        ponto para onde a câmera entra): média de 4 amostras misturada com a mais clara (os LEDs não somem), um reforço
        de contraste local (os contornos dos racks, das gavetas e dos cabos aparecem) e contraste 115%;
     2. brilho: a grade vira luz (cor × área do ponto) e é borrada em meia resolução (bloom 45%);
     3. pontos: cada pixel da tela acha a sua célula e desenha o ponto com borda suave; o raio cresce com a luz (sem
        ponto no preto) e a cor sai de uma rampa preto → laranja #F9681C → branco (o "tint" #ff3b1f em overlay do
        original, trocado pelo laranja da OneX); fundo sólido com 10% da cena por trás (bgOpacity 90) e o bloom em
        "screen". A vinheta (55%) é um gradiente no CSS.
   A animação "pulse" (intensidade 60%) faz o raio respirar, com uma onda leve que sai do centro. Ela fica acesa
   enquanto a pessoa rola ou move o ponteiro e assenta 5 s depois (nada se mexe sozinho por mais tempo).
   Em qualquer tela: a célula tem um número inteiro de pixels do canvas (pontos iguais também com a escala de 125% ou
   150% do Windows); as cenas cabem na altura livre (notebooks baixos, monitores largos, celular deitado) e, em pé,
   ficam no vão entre o cabeçalho e o texto; telas grandes baixam as fotos -hd (2048 px), as outras, as leves; e, se
   a máquina não aguentar (menos de 25 quadros/s rolando), a qualidade baixa sozinha em até três níveis.
   Só roda com html.visita-on (decidido no <head>: JS, WebGL, sem movimento reduzido e sem ?fx=0). Pausa fora da tela
   e com a aba oculta. Se algo falhar, tira .visita-on e a página volta para a versão estática (cartões). */
(function () {
  'use strict';

  var doc = document;
  var raiz = doc.documentElement;
  var secao = doc.querySelector('[data-visita]');
  if (!secao || !raiz.classList.contains('visita-on')) return;

  var palco = secao.querySelector('[data-visita-palco]');
  var arte = secao.querySelector('[data-visita-arte]');
  var tela = secao.querySelector('[data-visita-tela]');
  var legendas = [].slice.call(secao.querySelectorAll('[data-parada]'));
  var OPCOES = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  var gl = null;
  try { gl = tela && (tela.getContext('webgl', OPCOES) || tela.getContext('experimental-webgl', OPCOES)); } catch (erro) { gl = null; }

  var raf = 0;
  var desliga = function () {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    raiz.classList.remove('visita-on');
    legendas.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; el.classList.remove('ativa'); });
    if (palco) palco.style.removeProperty('--visita-m');
  };
  if (!palco || !arte || !gl) { desliga(); return; }

  /* ---------- parâmetros do "Sunset" (21st.dev/community/ascii), adaptados à OneX ---------- */
  var EFEITO = {
    celula: 5,        // cellSize (o original usa 10; aqui menor, para os equipamentos aparecerem com detalhe)
    celulaEstreita: 4,
    contraste: 1.15,  // contrast 115
    brilho: 0,        // brightness 0
    detalhe: 0.35,    // mistura a média da célula com a amostra mais clara (os LEDs pequenos não somem)
    nitidez: 0.9,     // reforço de contraste local: a célula contra a média da vizinhança (~6 células)
    gama: 0.8,        // raio = luz^gama (a área do ponto acompanha a luz; o preto fica vazio)
    ponto: 0.96,      // diâmetro máximo do ponto, em células (os pontos encostam, não se fundem)
    minimo: 0.05,     // abaixo disso, sem ponto
    fundo: 0.1,       // bgMode "solid" com bgOpacity 90: 10% da cena atrás dos pontos
    halo: 0.45,       // pfx.bloom 45
    pulso: 0.6,       // animIntensity 60
    periodo: 2.4,     // animSpeed 100: um ciclo a cada 2,4 s
    aceso: 5000       // o pulso assenta 5 s depois do último gesto
  };
  var RAMPA = [[0, 0x2a1206], [0.22, 0x5a2508], [0.45, 0xb5460c], [0.64, 0xf9681c], [0.82, 0xff9a63], [0.94, 0xffdcc6], [1, 0xfff7f2]];
  var BASE = [10 / 255, 9 / 255, 9 / 255];  // #0A0909, o preto do palco

  /* ---------- cenas ----------
     c: ponto da foto que fica na âncora da composição com a cena parada (o centro do assunto); f: ponto por onde a
     câmera entra (a porta, o fim do corredor, um servidor, uma porta do switch, uma gaveta, a tela do telefone);
     k: largura da foto em larguras de tela [paisagem, retrato]; kh: na paisagem, altura máxima da foto em alturas de
     tela (os objetos inteiros cabem em notebooks baixos e monitores largos); r: largura da próxima cena dentro desta,
     no ponto de entrada (a próxima nasce aninhada ali, com o centro dela no ponto de entrada, e a câmera atravessa até
     ela); luz: exposição da foto antes do contraste. Cada foto tem duas versões: a leve (as largas com 1280 px, as quadradas com 1024 px) e
     a -hd (2048 px), só para telas grandes (escolha em fotoDe) */
  var CENAS = [
    { src: 'assets/img/visita/0-fachada', c: [0.5, 0.5], f: [0.5, 0.5], k: [0.85, 1.6], r: 0.09, luz: 0.85 },
    { src: 'assets/img/visita/1-corredor', c: [0.5, 0.5], f: [0.5, 0.47], k: [1.12, 2.3], r: 0.07, luz: 0.8 },
    { src: 'assets/img/visita/2-rack', c: [0.5, 0.48], f: [0.47, 0.465], k: [0.66, 1.0], kh: 1.0, r: 0.3, luz: 1.1 },
    { src: 'assets/img/visita/3-rede', c: [0.5, 0.5], f: [0.475, 0.25], k: [0.6, 1.1], kh: 0.98, r: 0.08, luz: 0.85 },
    { src: 'assets/img/visita/4-storage', c: [0.5, 0.5], f: [0.42, 0.4], k: [0.62, 1.0], kh: 1.0, r: 0.06, luz: 0.85 },
    { src: 'assets/img/visita/5-voip', c: [0.5, 0.5], f: [0.806, 0.3], k: [0.6, 1.0], kh: 0.95, r: 0.2, luz: 0.85 },
    { src: 'assets/img/visita/6-x', c: [0.5, 0.49], f: [0.5, 0.49], k: [0.92, 1.9], luz: 1.15 }
  ];
  var N = CENAS.length;
  var CAUDA = 0.5;                       // rolagem parada no fim (o palco volta ao formato de caixa)
  // opções da seção: data-visita-continua (vem logo depois de outro hero escuro: entra em tela cheia e a abertura
  // aparece enquanto o palco chega, com t de T0 a 0) e data-visita-espalha (os textos de cada parada se espalham pela
  // tela e sobem em velocidades diferentes, data-vel)
  var continua = secao.hasAttribute('data-visita-continua');
  var espalha = secao.hasAttribute('data-visita-espalha');
  var T0 = continua ? -0.6 : 0;
  // onde fica o assunto: à direita do texto, no meio da altura livre abaixo do cabeçalho (paisagem; sai da largura
  // real da coluna de texto, em medeLegendas), ou no meio do vão entre o cabeçalho e o texto da vez (retrato; a cada
  // quadro, em desenhaGrade)
  var ANCORA = [[0.68, 0.5], [0.5, 0.3]];
  var cab = 80, topoTexto = 1e6, topos = [];  // base do cabeçalho e topo do texto da vez (px no palco)
  var escalaPaisagem = 1;  // telas paisagem estreitas (tablet deitado): as fotos encolhem para caber à direita do texto

  var suave = function (a, b, x) { var u = (x - a) / (b - a); u = u < 0 ? 0 : u > 1 ? 1 : u; return u * u * (3 - 2 * u); };
  var vaiVem = function (u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(2 - 2 * u, 3) / 2; };

  /* ---------- shaders ---------- */
  var PRECISAO = 'precision highp float;\n';
  var VERTICE = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  // 1. grade: um texel por célula. R = luz do ponto (com a máscara do texto), G = luz da cena sem máscara (fundo)
  var GRADE = PRECISAO + [
    'uniform sampler2D uT0,uT1;uniform vec4 uR0,uR1;uniform vec2 uA,uOrig;uniform float uCel;',
    'uniform vec4 uEf;uniform float uNit;uniform vec4 uMasc;',
    'float borda(vec2 u){return smoothstep(0.0,0.07,u.x)*(1.0-smoothstep(0.93,1.0,u.x))*smoothstep(0.0,0.09,u.y)*(1.0-smoothstep(0.91,1.0,u.y));}',
    // média das 4 amostras, a mais clara, a média da vizinhança e a opacidade da borda esfumada
    'vec4 camada(sampler2D t,vec4 r,vec2 p){',
    '  vec2 uv=(p-r.xy)/r.zw;vec2 d=vec2(uCel*0.25)/r.zw;',
    '  float a=texture2D(t,uv-d,-1.0).r;float b=texture2D(t,uv+vec2(d.x,-d.y),-1.0).r;',
    '  float c=texture2D(t,uv+vec2(-d.x,d.y),-1.0).r;float e=texture2D(t,uv+d,-1.0).r;',
    '  float m=texture2D(t,uv,2.6).r;float k=borda(uv);',
    '  return vec4((a+b+c+e)*0.25*k,max(max(a,b),max(c,e))*k,m*k,k);',
    '}',
    'void main(){',
    '  vec2 p=uOrig+gl_FragCoord.xy*uCel;',
    '  vec4 l0=camada(uT0,uR0,p)*uA.x;vec4 l1=camada(uT1,uR1,p)*uA.y;',
    '  vec3 v=l1.xyz+l0.xyz*(1.0-l1.w);',
    '  float base=mix(v.x,v.y,uEf.w);',
    '  float s=(base+(base-v.z)*uNit)*uEf.x;',
    '  float L=(s-0.5)*uEf.y+0.5+uEf.z;',
    '  float masc=smoothstep(uMasc.x-0.05,uMasc.x+0.07,p.x/uMasc.z)*(1.0-smoothstep(uMasc.y-0.05*uMasc.w,uMasc.y+0.03*uMasc.w,p.y));',
    '  gl_FragColor=vec4(clamp(L*masc,0.0,1.0),clamp(v.x*uEf.x,0.0,1.0),0.0,1.0);',
    '}'
  ].join('\n');
  // 2. brilho: a luz de cada célula (cor da rampa × área do ponto), borrada numa direção (duas passadas)
  var BRILHO = PRECISAO + [
    'uniform sampler2D uG,uRampa;uniform vec2 uTam,uPasso;uniform float uDaGrade,uGama,uPonto;',
    'vec3 fonte(vec2 uv){vec4 g=texture2D(uG,uv);if(uDaGrade<0.5)return g.rgb;',
    '  float d=min(pow(g.r,uGama),1.0)*uPonto;return texture2D(uRampa,vec2(g.r,0.5)).rgb*d*d*0.785;}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uTam;',
    '  vec3 c=fonte(uv)*0.24;',
    '  c+=(fonte(uv+uPasso)+fonte(uv-uPasso))*0.203;',
    '  c+=(fonte(uv+2.0*uPasso)+fonte(uv-2.0*uPasso))*0.123;',
    '  c+=(fonte(uv+3.0*uPasso)+fonte(uv-3.0*uPasso))*0.053;',
    '  gl_FragColor=vec4(c,1.0);',
    '}'
  ].join('\n');
  // 3. pontos: cada pixel acha a sua célula e o raio do ponto dela (com o pulso). Tudo em pixels do canvas: a célula tem
  // um número inteiro de pixels e começa num pixel inteiro, então todos os pontos saem iguais (também com a escala de
  // 125% ou 150% do Windows)
  var PONTOS = PRECISAO + [
    'uniform sampler2D uG,uB,uRampa;uniform vec2 uGrade,uOrig;uniform float uCel,uAlt;',
    'uniform vec4 uPt;uniform float uAng,uFundo,uHalo;uniform vec3 uBase;',
    'void main(){',
    '  vec2 p=vec2(gl_FragCoord.x,uAlt-gl_FragCoord.y);',
    '  vec2 c=(p-uOrig)/uCel;vec2 ci=floor(c);vec2 f=(c-ci-0.5)*uCel;',
    '  float L=texture2D(uG,(ci+0.5)/uGrade).r;',
    '  float fase=length((ci+0.5-uGrade*0.5)/max(uGrade.x,uGrade.y))*2.4;',
    '  float r=min(pow(L,uPt.x)*(1.0+uPt.w*sin(uAng-fase)),1.0)*uPt.y*0.5*uCel;',
    '  float cob=clamp(r-length(f)+0.5,0.0,1.0)*step(uPt.z,L);',
    '  vec2 uv=c/uGrade;',
    '  vec3 fundo=uBase+uFundo*texture2D(uRampa,vec2(texture2D(uG,uv).g,0.5)).rgb;',
    '  vec3 cor=mix(fundo,texture2D(uRampa,vec2(L,0.5)).rgb,cob);',
    '  vec3 h=texture2D(uB,uv).rgb*uHalo;',
    '  gl_FragColor=vec4(1.0-(1.0-cor)*(1.0-h),1.0);',
    '}'
  ].join('\n');

  /* ---------- estado ---------- */
  var W = 0, H = 0, dpr = 1, celula = 5, cd = 5, rx = 1, cols = 0, rows = 0, ox = 0, oy = 0, oxd = 0, oyd = 0, bw = 0, bh = 0;
  var retrato = false, limite = 2048, hd = false;
  var nivel = 0, quadros = [], pulaQuadros = 0;  // qualidade automática (máquinas lentas): 0 = cheia, 1 = menos densidade, 2 e 3 = células maiores
  var caixas = [];  // topo e borda direita de cada legenda no palco (px), para a máscara acompanhar o texto da vez
  var tCam = 0, tPintado = -1, energia = 1, energiaPintada = -1, ultimoGesto = performance.now(), antes = 0, ultimoSegundo = 0;
  var topoSecao = 0, curso = 1, bordaTexto = -10;
  var naTela = true, pronta = false, perdido = false, ancoraQA = null, semMascaraQA = false, escalaQA = 1;
  var P = {}, buf = null, texRampa = null, texVazia = null, grade = null, b1 = null, b2 = null;

  /* ---------- WebGL ---------- */
  var compila = function (fonte) {
    var prog = gl.createProgram();
    [[gl.VERTEX_SHADER, VERTICE], [gl.FRAGMENT_SHADER, fonte]].forEach(function (par) {
      var s = gl.createShader(par[0]);
      gl.shaderSource(s, par[1]);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(prog, s);
    });
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(prog));
    var u = {};
    var n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nome = gl.getActiveUniform(prog, i).name.replace(/\[0\]$/, ''); u[nome] = gl.getUniformLocation(prog, nome); }
    return { prog: prog, u: u };
  };
  var textura = function (filtro) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  var alvoDeTextura = function (w, h) {
    var t = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t: t, fb: fb, w: w, h: h };
  };
  var apagaAlvo = function (a) { if (a) { gl.deleteTexture(a.t); gl.deleteFramebuffer(a.fb); } };
  var montaGL = function () {
    P.grade = compila(GRADE);
    P.brilho = compila(BRILHO);
    P.pontos = compila(PONTOS);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    // rampa de cor: 256 tons
    var px = new Uint8Array(256 * 4);
    for (var i = 0; i < 256; i++) {
      var L = i / 255, j = 1;
      while (j < RAMPA.length - 1 && L > RAMPA[j][0]) j++;
      var a = RAMPA[j - 1], b = RAMPA[j], u = Math.max(0, Math.min(1, (L - a[0]) / (b[0] - a[0])));
      for (var c = 0; c < 3; c++) {
        var sh = 16 - c * 8;
        px[i * 4 + c] = Math.round(((a[1] >> sh) & 255) + (((b[1] >> sh) & 255) - ((a[1] >> sh) & 255)) * u);
      }
      px[i * 4 + 3] = 255;
    }
    texRampa = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    texVazia = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 1, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    grade = b1 = b2 = null;
    cols = rows = 0;
  };

  /* ---------- fotos: luminância numa textura potência de 2 com mipmaps (a média de cada célula sai pronta) ---------- */
  var pot = function (n) { return Math.min(limite, Math.pow(2, Math.round(Math.log(n) / Math.LN2))); };
  var sobe = function (cena) {
    var img = cena.img, w = pot(img.naturalWidth), h = pot(img.naturalHeight);
    var c = doc.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    var px = g.getImageData(0, 0, w, h).data;  // em file:// sem as cenas embutidas, isto falha (e a página fica estática)
    var lum = new Uint8Array(w * h);
    for (var i = 0, j = 0; i < lum.length; i++, j += 4) lum[i] = (0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2] + 0.5) | 0;
    cena.tex = textura(gl.LINEAR_MIPMAP_LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lum);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  // a foto -hd só quando a tela tem pixels para ela (largura × densidade ≥ 1700, sem economia de dados); telas menores
  // e celulares baixam a leve
  var fotoDe = function (cena, grande) { return cena.src + (grande ? '-hd' : '') + '.webp'; };
  var carregaCena = function (cena, depois) {
    var img = new Image();
    var url = fotoDe(cena, hd);
    img.decoding = 'async';
    img.onload = function () {
      cena.img = img;
      cena.razao = img.naturalHeight / img.naturalWidth;
      try { sobe(cena); } catch (erro) { cena.falhou = true; }
      pulaQuadros = 4;  // subir uma textura custa um quadro: não conta na medida de fluidez
      depois();
    };
    img.onerror = function () {
      if (url !== fotoDe(cena, false)) { url = fotoDe(cena, false); img.src = (window.VISITA_CENAS && window.VISITA_CENAS[url]) || url; return; }
      cena.falhou = true; depois();
    };
    img.src = (window.VISITA_CENAS && window.VISITA_CENAS[url]) || url;
  };
  // em file:// o navegador trata as fotos como de outra origem e não deixa ler os pixels: lá as cenas vêm embutidas
  // em assets/js/visita-cenas.js (gerado por qa/scripts/gera-cenas-js.js). Num servidor, os .webp normais.
  var fontes = function (prontas) {
    if (location.protocol !== 'file:' || window.VISITA_CENAS) { prontas(); return; }
    var s = doc.createElement('script');
    s.src = 'assets/js/visita-cenas.js';
    s.onload = prontas;
    s.onerror = desliga;
    doc.head.appendChild(s);
  };

  /* ---------- medidas ---------- */
  var mede = function () {
    var r = secao.getBoundingClientRect();
    topoSecao = r.top + window.pageYOffset;
    curso = Math.max(1, secao.offsetHeight - palco.offsetHeight);
  };
  var ajusta = function (forca) {
    var w = palco.clientWidth, h = palco.clientHeight;
    var d = Math.min(w < 600 ? 3 : 2, window.devicePixelRatio || 1);  // celular: até 3× (são poucas células)
    if (!forca && w === W && h === H && d === dpr) { mede(); return; }
    W = w; H = h; dpr = d;
    retrato = W / H < 0.9;
    var px = nivel > 0 ? (nivel === 1 && dpr > 1.5 ? 1.5 : 1) : dpr;   // máquina lenta: o canvas perde densidade
    tela.width = Math.round(W * px); tela.height = Math.round(H * px);
    rx = tela.width / W;
    // a célula tem um número inteiro de pixels do canvas (5 px CSS viram 6 a 125%, 8 a 150%, 10 na retina), e a grade
    // começa num pixel inteiro, centrada (sobra igual dos dois lados)
    cd = Math.max(3, Math.round((W < 600 ? EFEITO.celulaEstreita : EFEITO.celula) * (nivel > 2 ? 1.6 : nivel > 1 ? 1.3 : 1) * rx));
    celula = cd / rx;
    var c = Math.ceil(tela.width / cd), r = Math.ceil(tela.height / cd);
    oxd = Math.floor((tela.width - c * cd) / 2); oyd = Math.floor((tela.height - r * cd) / 2);
    ox = oxd / rx; oy = oyd / rx;
    if (c !== cols || r !== rows || !grade) {
      cols = c; rows = r;
      bw = Math.ceil(cols / 2); bh = Math.ceil(rows / 2);
      apagaAlvo(grade); apagaAlvo(b1); apagaAlvo(b2);
      grade = alvoDeTextura(cols, rows);
      b1 = alvoDeTextura(bw, bh);
      b2 = alvoDeTextura(bw, bh);
    }
    medeLegendas();
    mede();
    tPintado = -1;
  };

  // os pontos somem onde fica o texto e a legenda fica sobre preto limpo: na paisagem, à esquerda da borda direita
  // da coluna de texto; no retrato, abaixo do topo da legenda da vez (recalculado a cada quadro, em desenhaGrade)
  var medeLegendas = function () {
    caixas = legendas.map(function (el) { return { topo: el.offsetTop, direita: el.offsetLeft + el.offsetWidth }; });
    topos = [];
    legendas.forEach(function (el, i) { topos[+el.getAttribute('data-parada')] = caixas[i].topo; });
    var barraTopo = doc.querySelector('.topo__barra');
    cab = barraTopo ? barraTopo.offsetTop + barraTopo.offsetHeight : 80;  // o cabeçalho é fixo no topo (offset ignora a animação de entrada)
    if (!W || retrato) { bordaTexto = -10; return; }
    ANCORA[0][1] = Math.min(0.6, (cab + H) / 2 / H);
    // textos espalhados: a cena fica no meio, um pouco menor, e os pontos não somem atrás do texto (ele fica nos cantos,
    // sobre a vinheta)
    if (espalha) { ANCORA[0][0] = 0.5; escalaPaisagem = 0.86; bordaTexto = -10; return; }
    var borda = Math.max.apply(null, caixas.map(function (c) { return c.direita; })) / W;
    ANCORA[0][0] = Math.min(0.74, Math.max(0.64, borda + (1 - borda) * 0.45));
    escalaPaisagem = Math.min(1, (1 - borda) / 0.54);
    bordaTexto = borda;
  };

  /* ---------- câmera: quais cenas aparecem em t, em que escala, onde e com que opacidade ---------- */
  var ancoraDe = function () { return ancoraQA || ANCORA[retrato ? 1 : 0]; };
  // largura da foto da cena parada, em larguras de tela: k (na paisagem, menor se o texto for largo), e os objetos
  // (kh) limitados pela altura livre (paisagem: abaixo do cabeçalho; retrato: entre o cabeçalho e o texto da vez, sem
  // encolher para menos da metade) para caberem inteiros
  var largura = function (c) {
    var w;
    if (retrato) {
      w = c.k[1];
      if (c.kh && !ancoraQA) w = Math.max(w * 0.5, Math.min(w, (topoTexto - cab) / (W * (c.razao || 1))));
    } else {
      w = c.k[0] * (ancoraQA ? 1 : escalaPaisagem);
      if (c.kh) w = Math.min(w, c.kh * (ancoraQA ? H : H - cab) / (W * (c.razao || 1)));
    }
    return w * escalaQA;
  };
  // topo do texto da vez, contínuo: o da parada até o meio do trecho, e desliza para o da próxima antes de ela entrar
  var topoEm = function (t) {
    var i = Math.min(Math.floor(t), N - 1), a = topos[i] === undefined ? H * 0.6 : topos[i];
    if (i >= N - 1) return a;
    var b = topos[i + 1] === undefined ? a : topos[i + 1];
    return a + (b - a) * suave(0.5, 0.8, t - i);
  };
  // cada camada: a cena, a escala (1 = parada), a opacidade, o ponto da tela A (frações) e o ponto da foto P que fica nele
  var camadas = function (t) {
    var i = Math.min(Math.floor(t), N - 1);
    var f = t - i;
    if (i === N - 1) return [{ c: CENAS[i], s: 1 + 0.05 * suave(0, CAUDA, f), a: 1, A: ancoraDe(), P: CENAS[i].c }];
    var c = CENAS[i], p = CENAS[i + 1];
    // e: quanto da travessia já foi feito. Na primeira metade, uma deriva lenta (a parada); na segunda, a câmera
    // mergulha no ponto de entrada até a próxima cena, aninhada ali, ocupar a tela no tamanho dela
    var e = f < 0.5 ? 0.03 * f / 0.5 : 0.03 + 0.97 * vaiVem((f - 0.5) / 0.5);
    var lc = largura(c), R = c.r * lc / largura(p);   // largura da próxima em relação à atual, na tela
    var s = Math.pow(1 / R, e), sp = s * R;   // zoom exponencial: velocidade constante para o olho
    var A = ancoraDe();
    // o ponto da foto na âncora vai do centro ao ponto de entrada; na tela, a entrada anda até a âncora em linha reta
    // (distância × (1 − e)) enquanto o zoom cresce
    var w = 1 - (1 - e) / s;
    var P = [c.c[0] + (c.f[0] - c.c[0]) * w, c.c[1] + (c.f[1] - c.c[1]) * w];
    var dw = lc * s;                                              // largura da foto atual, em larguras de tela
    var dh = dw * (c.razao || 0.5625) * W / H;                    // altura, em alturas de tela
    var E = [A[0] + (c.f[0] - P[0]) * dw, A[1] + (c.f[1] - P[1]) * dh];
    // a atual some enquanto cresce (ampliada demais, a foto vira borrão) e a próxima só aparece quando o mergulho começa
    return [
      { c: c, s: s, a: (1 - suave(0.72, 0.97, sp)) * (1 - suave(2.5, 5.5, s)), A: A, P: P },
      { c: p, s: sp, a: suave(0.14, 0.4, sp) * suave(0, 0.35, e), A: E, P: p.c }
    ];
  };
  var alvoEm = function (a) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, a ? a.fb : null);
    if (a) gl.viewport(0, 0, a.w, a.h); else gl.viewport(0, 0, tela.width, tela.height);
  };
  var usaTextura = function (unidade, t) { gl.activeTexture(gl.TEXTURE0 + unidade); gl.bindTexture(gl.TEXTURE_2D, t); };
  var desenhaGrade = function (t) {
    t = Math.max(0, t);  // antes de o palco chegar (T0 < t < 0), a fachada parada
    topoTexto = retrato ? topoEm(t) : 1e6;
    if (retrato) ANCORA[1][1] = Math.max(0.12, (cab + topoTexto) / 2 / H);
    var ganho = 0, pesoLuz = 0, cam = [];
    camadas(t).forEach(function (l) {
      if (!l.c.tex || l.a <= 0.002) return;
      ganho += l.a * l.c.luz; pesoLuz += l.a;
      var dw = W * largura(l.c) * l.s;
      var dh = dw * l.c.razao;
      cam.push({ tex: l.c.tex, a: l.a, r: [l.A[0] * W - l.P[0] * dw, l.A[1] * H - l.P[1] * dh, dw, dh] });
    });
    while (cam.length < 2) cam.unshift({ tex: texVazia, a: 0, r: [0, 0, 1, 1] });
    var u = P.grade.u;
    gl.useProgram(P.grade.prog);
    alvoEm(grade);
    usaTextura(0, cam[0].tex); usaTextura(1, cam[1].tex);
    gl.uniform1i(u.uT0, 0); gl.uniform1i(u.uT1, 1);
    gl.uniform4fv(u.uR0, cam[0].r); gl.uniform4fv(u.uR1, cam[1].r);
    gl.uniform2f(u.uA, cam[0].a, cam[1].a);
    gl.uniform2f(u.uOrig, ox, oy);
    gl.uniform1f(u.uCel, celula);
    gl.uniform4f(u.uEf, pesoLuz ? ganho / pesoLuz : 1, EFEITO.contraste, EFEITO.brilho, EFEITO.detalhe);
    gl.uniform1f(u.uNit, EFEITO.nitidez);
    gl.uniform4f(u.uMasc, semMascaraQA ? -10 : bordaTexto, semMascaraQA ? 1e6 : topoTexto, W, H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // brilho: horizontal (da grade para b1) e vertical (de b1 para b2), em meia resolução
    u = P.brilho.u;
    gl.useProgram(P.brilho.prog);
    gl.uniform1i(u.uG, 0); gl.uniform1i(u.uRampa, 1);
    gl.uniform2f(u.uTam, bw, bh);
    gl.uniform1f(u.uGama, EFEITO.gama); gl.uniform1f(u.uPonto, EFEITO.ponto);
    alvoEm(b1);
    usaTextura(0, grade.t); usaTextura(1, texRampa);
    gl.uniform1f(u.uDaGrade, 1);
    gl.uniform2f(u.uPasso, 1.5 / cols, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    alvoEm(b2);
    usaTextura(0, b1.t);
    gl.uniform1f(u.uDaGrade, 0);
    gl.uniform2f(u.uPasso, 0, 1.5 / rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---------- pontos ---------- */
  var pinta = function (segundos) {
    ultimoSegundo = segundos;
    var u = P.pontos.u;
    gl.useProgram(P.pontos.prog);
    alvoEm(null);
    usaTextura(0, grade.t); usaTextura(1, b2.t); usaTextura(2, texRampa);
    gl.uniform1i(u.uG, 0); gl.uniform1i(u.uB, 1); gl.uniform1i(u.uRampa, 2);
    gl.uniform2f(u.uGrade, cols, rows);
    gl.uniform2f(u.uOrig, oxd, oyd);
    gl.uniform1f(u.uCel, cd);
    gl.uniform1f(u.uAlt, tela.height);
    gl.uniform4f(u.uPt, EFEITO.gama, EFEITO.ponto, EFEITO.minimo, EFEITO.pulso * 0.18 * energia);
    gl.uniform1f(u.uAng, Math.PI * 2 * segundos / EFEITO.periodo);
    gl.uniform1f(u.uFundo, EFEITO.fundo);
    gl.uniform1f(u.uHalo, EFEITO.halo);
    gl.uniform3fv(u.uBase, BASE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---------- legendas e o formato do palco ---------- */
  // com data-visita-continua (a visita vem logo depois de outro hero escuro), a abertura aparece enquanto o palco
  // chega (t negativo: a seção ainda está subindo) e o palco já entra em tela cheia, sem a caixa
  var visibilidade = function (k, d) {
    var entra = k === 0 ? (continua ? suave(-0.5, -0.1, d) : 1) : suave(-0.22, -0.02, d);
    var sai = k === N - 1 ? 0 : suave(0.38, 0.54, d);
    return Math.max(0, Math.min(entra, 1 - sai));
  };
  var legendasEm = function (t) {
    for (var i = 0; i < legendas.length; i++) {
      var el = legendas[i];
      var k = +el.getAttribute('data-parada');
      var d = t - k;
      var v = visibilidade(k, d);
      // textos espalhados: cada pedaço da legenda (data-vel) sobe na sua velocidade enquanto a parada passa, e eles se
      // afastam e se aproximam (no retrato, mais de leve: estão empilhados)
      if (espalha && (v > 0 || el._v > 0)) {
        el._filhos = el._filhos || [].slice.call(el.querySelectorAll('[data-vel]'));
        for (var j = 0; j < el._filhos.length; j++) {
          var y = (0.16 - d) * +el._filhos[j].getAttribute('data-vel') * H * (retrato ? 0.35 : 1);
          el._filhos[j].style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
        }
      }
      if (el._v !== undefined && Math.abs(v - el._v) < 0.002) continue;
      el._v = v;
      el.style.opacity = v.toFixed(3);
      el.style.transform = v > 0.999 ? '' : 'translate3d(0,' + ((1 - v) * (d < 0 ? 26 : -26)).toFixed(1) + 'px,0)';
      el.classList.toggle('ativa', v > 0.5);
    }
    palco.classList.toggle('no-fim', t > N - 1.4); // no X final, 'Pular a visita' sai de cena
    // o palco começa como caixa (o papel em volta), abre para a tela inteira ao entrar e volta a ser caixa no fim
    var m = Math.max(continua ? 0 : 1 - suave(0, 0.32, t), suave(N - 1 + 0.08, N - 1 + CAUDA, t));
    palco.style.setProperty('--visita-m', m.toFixed(3));
  };

  /* ---------- laço ---------- */
  var alvo = function () {
    var t = (window.pageYOffset - topoSecao) / curso * (N - 1 + CAUDA);
    return t < T0 ? T0 : t > N - 1 + CAUDA ? N - 1 + CAUDA : t;
  };
  var encadeado = false;  // este quadro veio logo depois de outro (o intervalo entre eles mede a fluidez)
  var quadro = function (agora) {
    raf = 0;
    if (perdido) return;
    var bruto = agora - antes;
    var dt = Math.min(0.1, Math.max(0.001, bruto / 1000));
    antes = agora;
    var t = alvo();
    var dif = t - tCam;
    tCam = Math.abs(dif) < 0.0004 ? t : tCam + dif * (1 - Math.exp(-dt * 7));
    var quer = agora - ultimoGesto < EFEITO.aceso ? 1 : 0;
    energia += (quer - energia) * (1 - Math.exp(-dt * (quer ? 5 : 1.4)));
    if (!quer && energia < 0.004) energia = 0;
    var mudou = tCam !== tPintado;
    if (mudou) {
      desenhaGrade(tCam);
      legendasEm(tCam);
      tPintado = tCam;
      // máquina lenta: enquanto a câmera anda, guarda o intervalo entre quadros; se a mediana de 12 passar de 40 ms
      // (menos de 25 quadros/s; a economia de energia do navegador trava em 30 e não conta), baixa um nível (primeiro o canvas perde densidade, depois as células crescem 30% e 60%)
      if (encadeado && nivel < 3) {
        if (pulaQuadros > 0) pulaQuadros--;
        else if (quadros.push(bruto) >= 12) {
          quadros.sort(function (a, b) { return a - b; });
          var mediana = quadros[6];
          quadros = [];
          if (mediana > 40) { nivel = nivel === 0 && dpr <= 1 ? 2 : nivel + 1; ajusta(true); pulaQuadros = 3; desenhaGrade(tCam); }
        }
      }
    }
    if (mudou || energia > 0 || energiaPintada !== 0) { pinta(agora / 1000); energiaPintada = energia; }
    if (!pronta) { pronta = true; arte.classList.add('pronta'); }
    encadeado = naTela && !doc.hidden && (tCam !== t || energia > 0);
    if (encadeado) raf = requestAnimationFrame(quadro);
  };
  var acorda = function () {
    if (raf || perdido || !naTela || doc.hidden || !CENAS[0].tex) return;
    antes = performance.now();
    encadeado = false;
    raf = requestAnimationFrame(quadro);
  };
  var gesto = function () { ultimoGesto = performance.now(); acorda(); };

  try {
    montaGL();
    limite = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), window.innerWidth < 600 ? 1024 : 2048);
    ajusta(true);
    hd = limite >= 2048 && W * dpr >= 1700 && !(navigator.connection && navigator.connection.saveData);
    // a fachada primeiro (é o hero); as outras logo depois, em ordem
    fontes(function () {
      carregaCena(CENAS[0], function () {
        if (CENAS[0].falhou) { desliga(); return; }
        tCam = alvo();
        gesto();
        var proxima = 1;
        var segue = function () {
          if (proxima >= N) return;
          carregaCena(CENAS[proxima++], function () { tPintado = -1; acorda(); segue(); });
        };
        segue();
      });
    });
  } catch (erro) {
    desliga();
    return;
  }

  // a GPU pode tirar o contexto (aba em segundo plano no celular, driver): para e, quando ele volta, refaz tudo
  tela.addEventListener('webglcontextlost', function (e) { e.preventDefault(); perdido = true; if (raf) cancelAnimationFrame(raf); raf = 0; });
  tela.addEventListener('webglcontextrestored', function () {
    try {
      perdido = false;
      montaGL();
      CENAS.forEach(function (c) { c.tex = null; if (c.img && !c.falhou) sobe(c); });
      ajusta(true);
      gesto();
    } catch (erro) { desliga(); }
  });

  window.addEventListener('scroll', gesto, { passive: true });
  palco.addEventListener('pointermove', gesto, { passive: true });
  var espera = 0;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(function () { ajusta(false); tPintado = -1; gesto(); }, 120);
  });
  if ('ResizeObserver' in window) new ResizeObserver(function () { mede(); medeLegendas(); tPintado = -1; acorda(); }).observe(secao);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { medeLegendas(); tPintado = -1; acorda(); });
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) gesto(); });
  new IntersectionObserver(function (entradas) {
    var antesNaTela = naTela;
    naTela = entradas[0].isIntersecting;
    if (naTela && !antesNaTela) { mede(); tCam = alvo(); tPintado = -1; gesto(); }
  }).observe(secao);
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduzido.addEventListener) reduzido.addEventListener('change', function () { if (reduzido.matches) desliga(); });

  // foco de teclado numa legenda que não está na tela: rola até a parada dela (o texto nunca fica invisível com foco)
  legendas.forEach(function (el) {
    el.addEventListener('focusin', function () {
      if ((el._v || 0) > 0.5) return;
      var k = +el.getAttribute('data-parada');
      window.scrollTo({ top: topoSecao + (k / (N - 1 + CAUDA)) * curso, behavior: 'instant' });
      tCam = k;
      tPintado = -1;
      gesto();
    });
  });

  // gancho de QA (qa/scripts): pinta um quadro exato e devolve a imagem (pontos, fundo e bloom; a vinheta é do CSS)
  secao.visitaQA = {
    quadro: function (t, segundos, nivelDeEnergia, ancora, semMascara, escala) {
      ancoraQA = ancora || null;
      escalaQA = escala || 1;
      semMascaraQA = !!semMascara;
      ultimoGesto = -1e9;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      naTela = false;
      energia = nivelDeEnergia || 0;
      tCam = t;
      desenhaGrade(t); legendasEm(t); pinta(segundos || 0);
      tPintado = t;
      return CENAS.every(function (c) { return !!c.tex || c.falhou; });
    },
    partes: function (t) {
      var px = new Uint8Array(4);
      var a = performance.now(); desenhaGrade(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var b = performance.now(); pinta(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [b - a, performance.now() - b];
    },
    imagem: function () {
      desenhaGrade(tCam);
      pinta(ultimoSegundo);
      return tela.toDataURL('image/png');
    },
    falhas: function () { return CENAS.filter(function (c) { return c.falhou; }).map(function (c) { return c.src; }); },
    estado: function () { return { hd: hd, nivel: nivel, celula: +celula.toFixed(3), cd: cd, rx: +rx.toFixed(3), cols: cols, rows: rows, fotos: CENAS.map(function (c) { return c.img ? c.img.naturalWidth : 0; }) }; }
  };
})();
