# Hero em parallax: o que foi feito

Registro das versões do hero em parallax (26/10/2026), para continuar depois. A página oficial continua sendo
`index.html` (a visita à OneX, sem a barra de progresso). As duas páginas abaixo são versões para comparar, com
`noindex`, e usam o mesmo conteúdo do `index.html`; só o topo da página (e, na B, mais algumas seções) muda.

| Página | O que é |
|---|---|
| `index-parallax.html` (A) | só o parallax no lugar da visita; a página segue direto para o "Como funciona" |
| `index-parallax-visita.html` (B) | versão imersiva: parallax em tela cheia, cabeçalho só com a marca, a visita emendada com os textos espalhados, "Produtos" em cartões com parallax e o X do "Quero indicar" sempre desenhado |

Próximos passos sugeridos para a visita (ela cansa a partir da 3ª parada): [parallax-proximos-passos.md](parallax-proximos-passos.md).

## 1. O parallax do hero (A e B)

Referência: o componente "Parallax" do Osmo (osmo.supply), em React com GSAP, ScrollTrigger e Lenis. Aqui ele foi
refeito em JS vanilla, sem dependências, porque o projeto é estático (sem React, Tailwind nem build).

- Quatro camadas presas no hero descem em velocidades diferentes enquanto a página sobe, cada uma uma fração da
  própria altura até o hero sair da tela: serras de Minas 70%, a OneX no morro 55%, o texto 40%, as pedras da frente
  10%. Por isso o texto afunda atrás das pedras.
- O Lenis (rolagem suavizada) ficou de fora: ele sequestra a rolagem nativa (acessibilidade, teclado, âncoras), e a
  rolagem nativa já deixa o efeito fluido.
- As camadas são desenhadas em pontos com a mesma receita da visita (rampa preto → laranja #F9681C → branco, raio do
  ponto pela luz, contraste local e bloom). Cada camada vira um canvas 2D desenhado uma vez por tamanho de tela; a
  rolagem só move os canvas (`transform`, na GPU).
- O prédio nunca fica atrás do texto: `medeTexto()` mede a coluna de texto a cada tamanho de tela e põe a OneX à
  direita dela (paisagem) ou no vão entre o cabeçalho e o texto (retrato).
- Movimento reduzido: os pontos aparecem, nada se mexe. Sem JS, `?fx=0` ou se o desenho falhar: o pôster em pontos.
  Em `file://` as camadas vêm embutidas em `assets/js/parallax-camadas.js` (o navegador não deixa ler os pixels).

### Arquivos

| Caminho | O que é |
|---|---|
| `assets/js/parallax.js` | o hero: desenho das camadas em pontos e o movimento na rolagem |
| `assets/css/parallax.css` | estilos do hero e das partes da versão B (cabeçalho só marca, visita espalhada, produtos em cartões) |
| `assets/js/parallax-camadas.js` | as camadas em data URI, só para `file://` (gerado por `qa/scripts/gera-camadas-js.ps1`) |
| `assets/js/parallax-secoes.js` | parallax genérico das seções (B): `data-paralaxe` e `data-paralaxe-colunas` |
| `assets/img/parallax/1-serra.webp` | camada de trás (opaca): céu estrelado e serras com névoa |
| `assets/img/parallax/2-onex.webp` | a OneX no alto de um morro, fundo transparente (centro do prédio em 0,5 × 0,43 da foto) |
| `assets/img/parallax/4-frente.webp` | pedras e capim da frente, baixos à esquerda e mais altos à direita, fundo transparente |
| `assets/img/parallax/poster.webp`, `poster-retrato.webp` | o hero parado em pontos (1600 × 900 e 780 × 1688), para sem JS e `?fx=0` |

### Ajustes (no topo de `assets/js/parallax.js`)

- `EFEITO`: célula (5 px; 4 no celular), contraste, nitidez, gama, tamanho do ponto, mínimo, halo (bloom).
- `CAMADAS`: por camada, `desce` (fração da própria altura), `luz` (exposição; as fotos são noturnas, então 1,5 a 2,4),
  `opaca`, e o encaixe da foto `[paisagem, retrato]`: `a` (ponto da foto) fica em `e` (ponto da tela, em frações do
  hero), com largura mínima `k` (em larguras de tela). A foto cresce o que for preciso para cobrir as laterais.
- `TEXTO`: quanto o texto desce (0,4).
- Na B (`.parallax--tela`), o texto também apaga enquanto sai (para não passar por baixo da marca).

### Como as camadas foram feitas (para refazer ou trocar)

Geradas no Higgsfield com `gpt_image_2_5`, 16:9, resolução 2k, qualidade high (0,25 crédito cada; 5 imagens no total).

1. **Serras** (`background: opaque`): "Black and white night landscape photograph, wide panoramic view of layered
   mountain ridges of Minas Gerais, Brazil (serra), seen from a high viewpoint. Pure black starry sky occupying the top
   half, a soft pale glow along the horizon behind the farthest ridge, thin mist between the ridges, the ridges get
   darker and closer toward the bottom, the bottom 30% of the frame is a dark rolling hill silhouette. Strong contrast,
   monochrome, grayscale only, no people, no buildings, no text. Cinematic, minimal, clean silhouettes."
2. **A OneX** (`background: transparent`): morro largo e liso cobrindo toda a largura, crista a ~52% da altura; no
   alto, centralizado, um data center pequeno (~24% da largura): caixa baixa de concreto, linha de LED no topo,
   arandelas na fachada, porta de vidro acesa no meio; capim escuro que escurece até o preto embaixo; tudo acima do
   morro transparente. (A primeira versão, com o prédio largo, ficava atrás do texto.)
3. **Frente** (`background: transparent`): cumeeira baixa de pedras de granito e capim ao longo da base, ~16% da altura
   na metade esquerda subindo até ~30% na borda direita, luz de lua nas bordas; acima, transparente. (A primeira
   versão, alta dos dois lados, cobria os botões.)

Tratamento (ImageMagick, no sandbox do Higgsfield): reduzir para 1600 px, tons de cinza e escurecer os meios-tons para
o capim não virar um campo de pontos (`-level 0,100%,0.85` na serra, `0.8` na OneX, `0.85` na frente), webp com alfa:

```
convert l2.png -resize 1600x -channel RGB -colorspace Gray -level 0,100%,0.8 +channel -define webp:alpha-quality=85 -quality 80 2-onex.webp
```

Depois de trocar uma camada:
1. `powershell -File qa/scripts/gera-camadas-js.ps1` (refaz `parallax-camadas.js`, para `file://`);
2. refazer os pôsteres: abrir `index-parallax.html?intro=0` em 1600 × 900 (e 390 × 844 com densidade 2), esconder
   `.topo`, o texto, `.parallax__veu` e `.parallax__esfuma`, tirar `margin` e `border-radius` do `.parallax`, esperar
   `.parallax.pronto` e capturar a tela (foi feito com Playwright no sandbox do Higgsfield; o Edge headless do
   `qa/scripts/cdp.js` serve do mesmo jeito) e converter para webp (qualidade 78).

## 2. Versão B (`index-parallax-visita.html`)

### Cabeçalho só com a marca
O `<header>` tem só o logo (sem links, botão "Quero indicar" e menu) e a classe `topo--so-marca`, que tira a barra
translúcida que aparecia ao rolar. O logo continua trocando de tom sobre as seções claras. O CTA fixo do celular
continua.

### Parallax em tela cheia e transição para a visita
- `.parallax--tela`: sem margem nem cantos arredondados, 100svh.
- A visita tem `data-visita-continua` (opção nova em `assets/js/visita.js`): o palco entra já em tela cheia (sem a
  caixa do começo) e a abertura ("Entre no data center e veja o que dá para indicar") aparece enquanto o palco chega
  (a câmera aceita `t` de −0,6 a 0; a cena fica parada na fachada nesse trecho).

### Textos espalhados na visita
- `data-visita-espalha` (opção nova em `visita.js`): na paisagem, a cena fica no meio (`ANCORA` 0,5, escala 0,86) e os
  pontos não somem atrás do texto (a vinheta segura a leitura); no CSS (`.visita--espalhada`), cada parada ocupa a tela
  inteira: rótulo e título num canto do alto, itens e ganho nos cantos de baixo, espelhados de uma parada para a outra.
- Cada pedaço com `data-vel` sobe na sua velocidade enquanto a parada passa: `y = (0,16 − d) × vel × altura da tela`
  (no retrato, × 0,35, porque os textos estão empilhados). Rótulo e título têm a mesma velocidade (0,32) para não se
  encostarem; itens 0,12; ganho 0,26.
- "Pular a visita" sobe para a linha do cabeçalho, à direita.
- Sem essas opções (como no `index.html`), a visita se comporta como antes.

### "Produtos" em cartões com parallax
- `assets/js/parallax-secoes.js` (genérico): `data-paralaxe="v"` desloca o elemento `v × (distância do centro dele ao
  centro da tela)`; `data-paralaxe-colunas="v1,v2,v3"` num grupo dá a cada filho a velocidade da sua coluna (medida
  pelo `offsetLeft`). O deslocamento para a uma tela de distância (sem isso, o que está longe na carga sairia do lugar).
- Na seção: cartões (`.produtos--cartoes`), colunas `0.07,-0.1,0.07` (a do meio corre na frente), título `0.05`. Só a
  partir de 700 px, sem movimento reduzido nem `?fx=0`; no celular, uma coluna parada.
- Para usar em outra seção, basta pôr os atributos (o script já está na página).

### X do "Quero indicar" sempre desenhado
O `<svg class="marca-dagua marca-dagua--indicar">` está sem `data-desenha`: não se apaga nem se redesenha ao rolar.

## 3. Mudança no `index.html`

A barra de progresso da visita (`.visita__progresso`) saiu: marcação, CSS e JS.

## 4. Testes feitos

Chromium headless (Playwright, no sandbox do Higgsfield):
- Hero (A): 1920 × 950, 1440 × 900, 1366 × 657, 1280 × 600 a 125%, 1024 × 640, 768 × 1024, 390 × 844, 360 × 740,
  320 × 568, 844 × 390 e 667 × 375: texto abaixo do cabeçalho, sem estouro lateral, sem erros de console; também com
  movimento reduzido, `?fx=0` e em `file://`.
- Versão B: transição, abertura e paradas em 1440 × 900 e 390 × 844; produtos em 1920, 1440, 1024 e 390 px sem
  cartões se encostando.

Limites conhecidos:
- No 320 × 568 (iPhone SE antigo) o prédio do hero fica parcialmente atrás do título.
- Os pôsteres não se refazem sozinhos: depois de mexer nas camadas ou nos parâmetros, refazer (ver acima).
