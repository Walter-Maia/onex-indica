# Indique a OneX: landing do programa de indicação

Página estática (HTML, CSS e JS vanilla, sem build) do programa de indicação da OneX Data Centers. A promessa central, definida pelo cliente: **quem indica recebe 100% da 1ª parcela do produto que indicou, quando a empresa indicada contrata.** Nada além disso foi inventado; o que a página precisa e o cliente ainda não definiu está em [Pendências](#pendências-a-confirmar-com-a-onex).

## Como abrir

Abra `index.html` direto no navegador (funciona em `file://`). Não há dependência local; a única requisição externa é a fonte Montserrat (Google Fonts). Sem internet, a página usa a fonte de reserva (Arial ajustada) e continua legível. Em `file://` o navegador não deixa o script ler os pixels das fotos; nesse caso o hero carrega as cenas embutidas em `assets/js/visita-cenas.js` (num servidor, usa os `.webp` normais e esse arquivo nem é baixado).

| Parâmetro | O que faz |
|---|---|
| `?intro=1` | força a intro (ignora "já vista nesta sessão", `#âncora`, página rolada e aba oculta). Não passa por cima de movimento reduzido nem de `?fx=0`. |
| `?intro=0` | pula a intro. |
| `?fx=0` | composição estática: sem intro, sem entradas e sem a visita animada (o hero mostra a fachada em pontos e as paradas viram cartões); tudo no estado final. |
| `?intro=1&ixqa=1` | verificação: a intro monta e fica parada; `window.__ix.quadro(ms)` desenha aquele instante exato (`qa/scripts/intro-quadros.js`). |

Os parâmetros combinam (`?intro=0&fx=0`). A intro toca uma vez por sessão do navegador (`sessionStorage`, chave `onex-indique-intro`).

## Arquivos

| Caminho | O que é |
|---|---|
| `index.html` | conteúdo, SEO, JSON-LD (Organization, WebPage, BreadcrumbList, HowTo, FAQPage), sprite do X, hero em parallax e a "visita à OneX" |
| `assets/css/indique.css` | estilos mobile-first, tokens, roteiro comentado da intro, hero (versão estática e `html.visita-on`) |
| `assets/js/indique.js` | cabeçalho e menu, CTA fixo do celular, efeitos que se repetem, ícones, títulos linha a linha, simulador, formulário |
| `assets/js/visita.js` | hero: câmera da rolagem e efeito de pontos em WebGL ("Sunset" do editor ASCII do 21st.dev, com a paleta da OneX) |
| `assets/js/visita-cenas.js` | as fotos da visita em data URI, só para `file://` (gerado por `qa/scripts/gera-cenas-js.js`) |
| `assets/js/intro.js` | intro "indique \ receba /" em ASCII: grade de caracteres em canvas, X oficial que voa para o cabeçalho (só roda com `html.intro-ativa`) |
| `assets/img/` | logo oficial (branco e cinza), X oficial, favicon, `og-indique.jpg` (1200 × 630), `x-luz-*.webp` (não usados na página; guardados para peças) |
| `assets/img/visita/` | `0-fachada` a `5-voip.webp`: fotos ilustrativas geradas no Higgsfield, em tons de cinza (só a luz importa) e em duas versões: a leve (1280 px as largas, 1024 px as quadradas) e a `-hd` (2048 px), que só telas grandes baixam; `6-x.webp`: o X oficial sobre preto; `pontos-*.webp`: as cenas já em pontos, geradas pelo próprio renderizador (`qa/scripts/gera-pontos.js`) para o pôster e a versão estática |
| `robots.txt`, `sitemap.xml`, `llms.txt` | rastreamento e resumo do programa para assistentes de IA |
| `docs/` | `parallax.md` (as versões do hero em parallax) e `parallax-proximos-passos.md` (as 4 sugestões para a visita) |
| `backup/` | o site como estava em 27/10/2026, antes do site novo (as 5 páginas e os `assets/` delas) |
| `qa/scripts/` | harness de QA (Edge headless por DevTools Protocol via pipe, Node 14) e geradores |
| `qa/final/` | capturas e registros da verificação final |

## Identidade aplicada

Preto, branco e laranja (paleta da página OnexCloud, sem azul): laranja `#F9681C` (botões, traços, destaques grandes), preto `#111010` (texto e caixas escuras, token `--preto`), cinza quente `#55504A` (texto corrido, `--cinza`), papel `#F6F4F1`, branco `#FFFFFE`, fundo do hero `#0A0909` (`--preto-fundo`); pontos do hero numa rampa preto → laranja → branco; vermelho `#DD4444` só na borda de campo com erro. Montserrat 300–800. Logo e X sempre oficiais (imagens de `assets/img/`); o cabeçalho recorta o logo oficial em duas partes por `clip-path` só para animar a entrada, e o X fica sempre laranja (o do logo oficial), sobre o escuro e sobre o claro. As três peças do X usadas nas animações são os polígonos medidos no alfa do PNG oficial; onde o X aparece inteiro, a arte oficial entra por cima no fim.

| Contraste | Razão |
|---|---|
| preto sobre o botão laranja | 6,3:1 |
| laranja sobre preto (destaques, índices, "100%") | 6,3:1 |
| preto sobre a caixa laranja | 6,3:1 |
| cinza quente sobre branco / papel | 8,0:1 / 7,2:1 |
| laranja de texto `#B5460C` sobre branco / papel | 5,5:1 / 5,0:1 |
| placeholder `#6B7290` sobre branco | 4,7:1 |

Laranja `#F9681C` sobre branco dá 3,0:1: não é usado em texto sobre fundo claro.

## Intro "indique \ receba /" (3,0 s, termina dentro do hero)

O X da OneX são dois eixos, `\` e `/`, e o programa são dois verbos, *indique* e *receba*. A intro escreve o X numa grade de caracteres com esses dois glifos (o `\` é "indique", o `/` é "receba"). No cruzamento, cada célula vira um `x` (o X feito de x), e uma onda sai dali escrevendo a paisagem do hero em caracteres. O X oficial entra por cima e voa até o X do logo no cabeçalho, enquanto uma varredura "/" derrete os caracteres nos pontos do hero. A intro não cobre e depois revela: ela vira o hero, sem corte, porque a paisagem em caracteres é lida dos próprios canvas do hero (com eles ainda carregando, do pôster; em `file://` só dos canvas).

É diferente da intro do site principal (varredura de terminal, letras digitadas, dissolução em ASCII): nada é digitado, não há chuva de caracteres nem cursor, os glifos são vetoriais (desenhados no código, iguais em qualquer sistema) e escolhidos **pela forma**, não só pela luz. Bordas fortes da paisagem ganham `-` `|` `/` `\` na direção do contorno (o horizonte vira `----`, as paredes do prédio `|`, a porta acesa `XXX`), as áreas claras `+` `x` `X`, as fracas `·` `•` e as estrelas `*`. A célula tem a proporção dos eixos do X (altura = 1,16 × largura), então `\` e `/` correm paralelos às peças. Cores: a mesma rampa dos pontos do hero (preto → `#B5460C` → `#F9681C` → branco).

| Início (s) | Duração | Camada | Técnica |
|---|---|---|---|
| 0,15 | 0,70 | "\\" se escreve: peça A e perna direita da C, célula a célula pelo eixo; a cabeça nasce branca e esfria para o laranja em 0,26 s | frente pelo eixo (`cubic-bezier(.45,0,.2,1)`) |
| 0,28 | +28 ms por letra | rótulo `\ INDIQUE` sobre o início do "\\" | cada letra passa por 2–3 glifos antes de assentar |
| 0,52 | 0,70 | "/" se escreve: peça B e perna esquerda da C | idem |
| 0,64 | +28 ms | rótulo `RECEBA /` sobre o início do "/" | idem |
| 0,98 | +22 ms | legenda `100% DA 1ª PARCELA` embaixo do X | idem |
| 1,20 | 0,75 | onda do cruzamento para fora: cada célula do X vira `X`; a paisagem aparece em caracteres a 55% de exposição (35% atrás do X, num véu elíptico que sai com o voo) | raio com ease-out |
| 1,60 | 0,28 | X oficial por cima; o X de caracteres esfria por baixo | troca para a arte oficial |
| 1,95 | +15 ms | os rótulos se desfazem em glifos | — |
| 1,98 | 0,60 | o X oficial voa até o X do logo (escala exponencial, alvo medido no layout real) | voo |
| 1,98 | 0,64 | varredura "/" de baixo à esquerda para cima à direita; cada célula leva 0,34 s: acende a 100%, encolhe, vira ponto e abre para o hero | caractere → ponto |
| 2,33 | — | `--rise-start`: o texto do hero sobe e o nome do logo entra da esquerda | — |
| 2,58 | — | o X pousa: o X do cabeçalho assume, parado (sem a entrada que gira) | entrega ao cabeçalho |
| 3,00 | — | tudo aberto: o overlay sai do DOM | — |

Ajustes no topo de `assets/js/intro.js`: `R` (o roteiro), `VIDA` (quanto cada célula leva para virar ponto), `FANTASMA` (exposição da paisagem antes da varredura), `ROTULOS` (texto e ritmo), `LOGO_X` (onde fica o X dentro do logo oficial, medido no alfa: x 637–866, y 0–194 de 866 × 250). Tamanhos em `monta()`: célula de 13 px de altura no celular e ~1/62 da altura da tela no resto (13–18 px); X com metade da largura da tela (84% no celular), no máximo 60% da altura e 620 px.

Contrato técnico (skill `efeito-de-intro`): decisão no `<head>` antes da primeira pintura; cobertura em CSS com failsafe de 4,6 s e outro failsafe no próprio overlay (5,4 s, caso o JS morra no meio); `intro.js` com `onerror` que libera a página; dois `requestAnimationFrame` antes de tocar (mais um `setTimeout` de reserva); `finish(true)` no fim natural e `finish(false)` em Escape, Tab, Enter, teclas de rolagem, roda, toque, clique, rolagem, aba oculta, mudança de tamanho e nas travas (sem quadro em 1,5 s; duração + 2 s); sessão gravada logo no começo; não roda com `#âncora`, aba oculta, página já rolada, movimento reduzido ou `?fx=0`. Diferente das intros vetoriais, a coreografia corre num relógio só (`requestAnimationFrame`), porque o desenho é de canvas; cada quadro é uma função pura do tempo, o que permite o gancho `?ixqa=1`. O cabeçalho e o hero entram via `--rise-start`, calculado a partir do instante real em que as animações de entrada nasceram. Classes no `<html>`: `intro-ativa` (decidida no `<head>`, cobertura) → `intro-tocando` (o overlay pinta o próprio fundo e a varredura pode abrir para o hero) → `ix-pousou` (o X do cabeçalho aparece parado; fica para sempre). Se a pessoa pular, o X do cabeçalho faz a entrada normal dele.

Referências: os glifos escolhidos pela forma vêm de [ASCII characters are not pixels](https://alexharri.com/blog/ascii-rendering) (Alex Harri) e do renderizador "shape-aware" da [Codrops](https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/); a contenção (só a grade, sem efeitos em volta) do playground de ASCII do [ertdfgcvb](https://korben.info/en/ertdfgcvb-live-coding-ascii.html) (Andreas Gysin); a entrega "tela cheia → objeto do hero" do conceito E do catálogo de aberturas (`skills opnening agentes/references/aberturas.md`). Nenhuma imagem nova foi gerada: a paisagem é a das camadas que já tinham sido feitas no Higgsfield para o hero. A intro anterior ("conexão", trilhas de luz pelos eixos do X) continua em `backup/` e no histórico do git.

## Hero: visita à OneX (rolagem)

A rolagem leva a pessoa para dentro da OneX e cada parada mostra o que dá para indicar:

| Parada | Cena | Produtos | Você recebe |
|---|---|---|---|
| abertura | a fachada à noite, a porta acesa | título, oferta e botões | 100% da 1ª parcela |
| 01 O corredor | o corredor entre os racks | Colocation, área dedicada | 100% da 1ª parcela (sob consulta) |
| 02 O rack | um rack aberto com os servidores | Servidores dedicados, VPS Linux, virtualização | 100% da 1ª parcela (sob consulta) |
| 03 A rede | o switch com os cabos de rede | OnexCloud, hospedagem de sites, e-mail profissional | 100% da 1ª parcela (R$ 29,90 no Plano Básico de hospedagem) |
| 04 O storage | o storage com as gavetas de disco | Backup em nuvem | 100% da 1ª parcela (sob consulta) |
| 05 A telefonia | headset e telefone IP | Telefonia VoIP (Essencial, Profissional, Enterprise) | R$ 99 ou R$ 199 (Enterprise sob consulta) |
| fim | o X da OneX | "Tudo isso você pode indicar" + botões | a 1ª parcela |

Textos e valores saem da seção de produtos (nada novo). As fotos são **ilustrativas**, geradas no Higgsfield (GPT Image 2.5) com o assunto bem iluminado sobre o preto (para virar pontos legíveis); o X do fim é o oficial.

**Câmera.** A seção tem 6,5 trechos de rolagem (88 svh cada) e o palco fica preso na tela. Cada cena tem um centro (o assunto, parado à direita do texto ou acima dele) e um ponto de entrada (a porta, o fim do corredor, um servidor, uma porta do switch, uma gaveta, a tela do telefone); a próxima cena nasce aninhada ali, do tamanho daquele ponto. Na segunda metade de cada trecho a câmera mergulha nele com zoom exponencial (velocidade constante para o olho, com aceleração e chegada suaves) até a próxima ocupar a tela; a cena de onde se sai apaga enquanto cresce (ampliada demais vira borrão) e a próxima só aparece quando o mergulho começa. A câmera segue a rolagem com uma inércia leve. O palco começa como caixa (o papel em volta), abre para a tela inteira ao entrar e volta a ser caixa no fim. Legendas: uma por parada, no mesmo lugar (à esquerda na paisagem, embaixo no retrato), entram de baixo e saem para cima. Foco de teclado numa legenda fora da tela rola até ela. "Pular a visita" leva direto ao "Como funciona".

**Efeito de pontos** (`assets/js/visita.js`, parâmetros no topo do arquivo): o "Sunset" do editor ASCII do 21st.dev refeito em WebGL.

| Parâmetro do Sunset | Aqui |
|---|---|
| `renderMode: "dots"`, `cellSize: 10` | células de **5 px** (4 px no celular): o dobro de resolução do original, para os servidores, cabos e teclas aparecerem; raio do ponto = luz^0,8 (até 96% da célula: os pontos encostam sem se fundir), nada no preto |
| `contrast: 115`, `brightness: 0` | igual; exposição por cena, mistura da média com a amostra mais clara da célula (os LEDs não somem) e reforço de contraste local (a célula contra a média de ~6 células em volta: contornos de racks, gavetas e cabos) |
| `tint: #ff3b1f`, 32%, `overlay` | trocado pela marca: a cor de cada ponto sai de uma rampa preto → `#B5460C` → `#F9681C` → `#FF9A63` → branco |
| `bgMode: "solid"`, `bgOpacity: 90` | fundo `#0A0909` com 10% da cena (na cor da rampa) atrás dos pontos |
| `pfx.bloom: 45`, `pfx.vignette: 55` | a luz de cada célula (cor × área do ponto) borrada em meia resolução, somada em `screen` a 45%; vinheta em gradiente no CSS |
| `animStyle: "pulse"`, `animSpeed: 100`, `animIntensity: 60` | o raio respira (±11%, ciclo de 2,4 s) com uma onda leve a partir do centro; acende ao rolar ou mover o ponteiro e assenta 5 s depois |

Três passadas na GPU: (1) a grade, um texel por célula, amostra a cena da vez e a próxima (luminância das fotos em texturas com mipmaps, 4 amostras por célula); (2) o bloom, em duas passadas de borrão em meia resolução; (3) os pontos, em que cada pixel da tela acha a sua célula e desenha o ponto com borda suave (nítido em qualquer densidade de tela). As fotos sobem uma vez como textura de luminância (1 byte por pixel); se a GPU tirar o contexto, tudo é refeito quando ele volta. Onde fica o texto, os pontos somem (máscara pela borda da coluna de texto na paisagem e pelo topo da legenda da vez no retrato). Pausa fora da tela e com a aba oculta; sem gesto, nada é redesenhado.

**Responsivo.** As células têm um número inteiro de pixels da tela (5 px CSS viram 6 px a 125% e 8 px a 150% na escala do Windows, 10 px na retina) e a grade começa num pixel inteiro: todos os pontos saem iguais. O celular usa até 3× de densidade (são poucas células). Na paisagem, os objetos cabem na altura livre abaixo do cabeçalho (notebooks de 600 a 800 px de área útil, monitores largos, celular deitado) e ficam centrados nela; em pé, a cena fica no vão entre o cabeçalho e o texto da vez e encolhe para caber nele. A abertura acompanha a altura: o título é `min(tamanho, 7,2vh)`, abaixo de 820 px a condição sai (o subtítulo já diz que a 1ª parcela é sua quando a empresa contrata), abaixo de 640 px a dica de rolagem sai, e no celular deitado tudo fica menor e o texto ocupa no máximo 56% da largura. Telas com largura × densidade ≥ 1700 px baixam as fotos `-hd` (as outras, e quem pede economia de dados, as leves). Se a máquina não aguentar (mediana acima de 40 ms entre quadros enquanto rola, ou seja, menos de 25 quadros/s; a economia de energia do navegador trava em 30 e não conta), a qualidade baixa sozinha: primeiro a densidade do canvas, depois células 30% e 60% maiores.

**Quando não roda** (sem JS, sem WebGL, movimento reduzido, `?fx=0`, ou se a leitura dos pixels falhar): o `<head>` não liga `html.visita-on` (ou o JS desliga), e o hero vira a versão estática: a fachada em pontos (`pontos-0.webp`, retrato `pontos-0-retrato.webp`) atrás do texto e as paradas como cartões, cada um com a sua cena em pontos.

## Site novo (27/10/2026) e backup

O `index.html` agora é a versão imersiva que estava em `index-parallax-visita.html`, com estes ajustes:

- **Hero em parallax** em tela cheia, sem o olho "Programa de indicação OneX Data Centers" e sem subtítulo: o título, a condição ("quando a empresa indicada contrata", em todas as telas) e os botões. Na paisagem o texto fica no meio da tela, centralizado; no retrato, embaixo e à esquerda. No lugar de "Role para visitar a OneX", um mouse em pixels no meio da base, com a rodinha descendo; ele some no começo da rolagem (`.parallax__mouse`, `parallax.js`). No retrato o texto termina acima dele; em celulares de até 760 px de altura ele sai.
- **Cabeçalho** só com o logo, no meio da tela. Depois da rolagem, o logo ganha uma pílula translúcida no tom do que passa por baixo, para não brigar com o conteúdo.
- **Visita** só até o rack (`data-visita-cenas="0,1,2"`), sem "Pular a visita". No rack, os servidores vêm para perto e o cartão laranja de "Como funciona" sobe por cima do palco preso (`data-visita-sobe`: a última tela da seção, com o cartão em `margin-top: -100svh`). Rede, storage e telefonia ficam nos cartões de "Produtos".
- **Como funciona** é um cartão laranja (como "Por que a OneX"). Cada passo é um cartão (papel; o da comissão, preto) com o ícone da etapa num círculo preto no lugar do número.
- **FAQ** com um vão entre as perguntas (cada uma é um cartão) e letra menor.
- **O fechamento** ("Conhece uma empresa que precisa de infraestrutura?") saiu; a página termina no FAQ e no rodapé.

O site como estava antes dessas mudanças está em `backup/`, com as próprias cópias de `assets/` (abre sozinho):

| Página em `backup/` | O que é |
|---|---|
| `index.html` | a página oficial de antes, com o hero da visita |
| `index-parallax.html` | só o parallax |
| `index-parallax-visita.html` | a versão imersiva (opções 1 + 2: rede, storage e telefonia num momento só) |
| `index-visita-lateral.html` | opção 3: do rack em diante a câmera anda de lado |
| `index-visita-curta.html` | opção 4: a visita termina no rack e mergulha no X |

O registro do parallax (arquivos, ajustes, como refazer as camadas, testes) está em [docs/parallax.md](docs/parallax.md), e as 4 sugestões para a visita, em [docs/parallax-proximos-passos.md](docs/parallax-proximos-passos.md).

### Como o parallax funciona

É o "Parallax" do Osmo (componente React com GSAP, ScrollTrigger e Lenis) refeito em JS vanilla, sem dependências: quatro camadas presas no hero descem em velocidades diferentes enquanto a página sobe (serras de Minas 70% da própria altura, a OneX no morro 55%, o texto 40%, as pedras da frente 10%), e com isso o texto afunda atrás das pedras. O Lenis (rolagem suavizada) ficou de fora: ele sequestra a rolagem nativa, e a rolagem nativa já deixa o efeito fluido. As camadas são fotos noturnas geradas no Higgsfield, em tons de cinza e com fundo transparente (`assets/img/parallax/1-serra`, `2-onex`, `4-frente.webp`), desenhadas em pontos por `assets/js/parallax.js` com a mesma receita da visita (rampa preto → laranja → branco, raio pela luz, contraste local e bloom). Cada camada vira um canvas 2D desenhado uma vez por tamanho de tela, e a rolagem só move os canvas (`transform`). O prédio fica sempre fora do texto: à direita da coluna na paisagem e no vão entre o cabeçalho e o texto no retrato (medido a cada tamanho de tela).

Com movimento reduzido, os pontos aparecem mas nada se mexe. Sem JS, com `?fx=0` ou se o desenho falhar, aparece o pôster em pontos (`poster.webp`, `poster-retrato.webp`, capturas do próprio renderizador). Em `file://` as camadas vêm embutidas em `assets/js/parallax-camadas.js` (refeito por `qa/scripts/gera-camadas-js.ps1` depois de trocar as camadas). Estilos em `assets/css/parallax.css`.

Testado (26/10/2026, Chromium headless) em 1920 × 950, 1440 × 900, 1366 × 657, 1280 × 600 a 125%, 1024 × 640, 768 × 1024, 390 × 844, 360 × 740, 320 × 568, 844 × 390 e 667 × 375: texto abaixo do cabeçalho, sem estouro lateral e sem erros de console; também com movimento reduzido, `?fx=0` e em `file://`. No 320 × 568 o prédio fica parcialmente atrás do título.

## Animações por seção

| Seção | Animação | Gatilho |
|---|---|---|
| Intro | o X se escreve em `\` e `/` numa grade de caracteres, cruza em `x`, a paisagem do hero aparece em ASCII, o X oficial voa para o cabeçalho e uma varredura derrete os caracteres nos pontos do hero | 1ª visita da sessão |
| Cabeçalho | com a intro, o X do logo é o X da intro que pousa e "one" vem da esquerda; sem ela (pulada ou já vista), o X gira e assenta com mola; barra flutuante troca de tom (claro/navy) conforme o que passa por baixo | fim da intro / rolagem |
| Hero (visita) | texto sobe em sequência; a rolagem atravessa fachada → corredor → rack → rede → storage → telefonia → X, em pontos que pulsam | carga / intro; rolagem |
| Como funciona | nó numerado → título → linha laranja até o próximo nó, sobre um trilho fantasma; o nó 4 (laranja) solta um pulso | 35% na tela |
| Produtos | cada ícone com movimento próprio: racks entram no gabinete, LEDs do servidor piscam, cursor do terminal pisca, linhas do site se escrevem, VMs saltam dentro do host, seta sobe na nuvem, aba do envelope fecha, ondas do VoIP, seta do backup dá a volta e o arquivo desce | 15% na tela; de novo ao passar o mouse |
| Simulador | o valor troca num cruzamento suave (o antigo sobe pouco e esmaece, o novo assenta de baixo logo depois; algarismos tabulares, sem contagem) e a barra da 1ª parcela se enche | mudar produto/plano |
| Por que a OneX | pino cai no lugar, fone se desenha e o microfone completa, camadas empilham, escudo e visto se desenham | 15% na tela; mouse |
| Formulário | estados Enviar → "Abrindo WhatsApp…" → painel de sucesso com o visto desenhado; marca-d'água do X em traço | envio / 20% na tela |
| FAQ | hover: fundo branco e o + gira 90°; aberta: cartão navy e o + laranja vira × (uma curva e uma duração) | mouse / clique |
| Fechamento | X em traço se desenha como marca-d'água | 20% na tela |
| Títulos H2 | linha a linha, cada uma sobe de dentro da própria máscara (90 ms entre linhas) | 60% na tela |

Tudo anima só `transform`, `opacity`, `stroke-dashoffset` e `clip-path` (cores em hover/estado são transições curtas de cor). Os efeitos de entrada voltam ao início quando o bloco sai da tela e tocam de novo na volta; o que já está na tela na carga não é escondido.

## Decisões

1. **Intro própria e diferente da do site principal** (28/10/2026, substitui a intro "conexão"): em ASCII, como pedido, mas sem nada digitado nem varredura de terminal. Os dois eixos do X são os dois glifos `\` e `/` e os dois verbos do programa (indique, receba), e a intro termina dentro do hero (os caracteres viram os pontos dele) em vez de cobrir e revelar.
2. **Hero é uma visita à OneX guiada pela rolagem** (pedido do cliente, com o efeito "Sunset" do 21st.dev como referência): a pessoa entra no data center e cada parada mostra o que dá para indicar, com a comissão. O pulso dos pontos só fica aceso enquanto a pessoa rola ou move o ponteiro e assenta 5 s depois: nada se mexe sozinho por mais de 5 s (WCAG 2.2.2), então não precisa de botão de pausa. "Pular a visita" leva direto ao "Como funciona".
3. **Botões laranja com texto preto** (6,3:1). Texto branco em `#F9681C` dá 3,0:1 e não passa AA.
4. **"100% da primeira parcela" em laranja no H1**: é a oferta, não decoração; a condição ("quando a empresa indicada contrata") fica logo abaixo, no hero, no passo 3, no simulador e na primeira resposta do FAQ.
5. **Formulário sem backend e honesto**: valida inline, monta a mensagem e abre `https://wa.me/553140404888?text=…` (dentro do gesto de envio; se o navegador recusar a aba nova, abre na mesma aba). A interface diz que nada é guardado e que a indicação só chega quando a pessoa toca em enviar no WhatsApp. "Indicar outra empresa" mantém os dados de quem indica.
6. **Simulador** abre em Telefonia VoIP Profissional (R$ 199,00). Produtos "sob consulta" mostram "100% da 1ª parcela do plano que a empresa fechar". A nota "valores de referência…" fica ao lado do simulador e na seção de produtos.
7. **Produtos como tabela com filetes**, não cartões iguais; a caixa laranja "Por que a OneX" sobe sobre a do simulador.
8. **Montserrat sem bloquear a primeira pintura** (`media="print"` → `all`, com `<noscript>`), com reserva Arial ajustada (`size-adjust: 112%`); os títulos linha a linha são refeitos quando a fonte chega.
9. **`?intro=1` não passa por cima de movimento reduzido nem de `?fx=0`** (acessibilidade primeiro).
10. **Rodapé no papel**, depois da caixa de fechamento; o link "Conheça a OneX" aponta para `../principal/index.html` (site institucional em construção na pasta vizinha) e há também `https://onexdc.com.br/`.

## SEO e AEO

Title (59 caracteres) e description (154) com "Programa de indicação OneX Data Centers" e a oferta; canonical `https://onexdc.com.br/indique/` (**provisório**); Open Graph e Twitter com `og-indique.jpg` (o X em pontos desenhado pelo renderizador do hero, o logo oficial com o X laranja e o texto, compostos por `qa/scripts/gera-og.js`); `theme-color` navy; JSON-LD com `Organization` (contatos, redes, data centers de Ipatinga e BH), `WebPage`, `BreadcrumbList`, `HowTo` (os 4 passos) e `FAQPage` (as 9 perguntas, com o mesmo texto da página); um único H1 e títulos sem salto; respostas do FAQ com a resposta direta na primeira frase; `llms.txt` com o resumo do programa e o que não é publicado.

Na publicação: `robots.txt` só vale na raiz do domínio (se a página ficar em `/indique/`, copie as linhas para o `robots.txt` da raiz); as URLs absolutas de `og:image`, canonical, sitemap e JSON-LD dependem do endereço final.

## QA

Harness em `qa/scripts/` (Node 14, sem dependências; Edge headless controlado pelo DevTools Protocol via `--remote-debugging-pipe`, em tempo real):

```bash
cd qa/scripts
node intro.js final/intro-ascii 1440,390   # quadros da intro em tempo real + pouso no cabeçalho, Escape, sessão, #âncora
node intro-quadros.js final/intro-ascii/quadros 1440x900,390x844,768x1024   # quadros exatos (?ixqa=1)
node visita.js final/visita 1440,390    # hero: quadros ao longo da rolagem, fluidez e estouro lateral
node visita-quadros.js tmp/q 1440 0.5 1 0.0625  # quadros exatos de uma troca de cena
QA_GPU=1 node visita-telas.js final/visita-telas    # o hero em 23 telas (notebooks com escala do Windows, monitores, tablets, celulares em pé e deitados): encaixe do texto + folha de quadros
QA_GPU=1 node visita-custo.js           # custo de um quadro (grade + bloom, pontos) na GPU de verdade
node olhar.js final/responsivo 320,1440 # hero, estouro lateral e página inteira em ?fx=0
node secoes.js final/secoes 1440        # cada seção depois da entrada
node funcional.js final/funcional       # estrutura, simulador, formulário/WhatsApp, FAQ, foco, menu
node folha.js ../final/intro 1440 480 3 # folha de contato dos quadros
node gera-og.js                         # refaz assets/img/og-indique.jpg
node gera-pontos.js                     # refaz assets/img/visita/pontos-*.webp (depois de mexer nas fotos ou no efeito)
node gera-cenas-js.js                   # refaz assets/js/visita-cenas.js (depois de trocar as fotos)
```

### Verificado (23/10/2026, Edge 155 headless, Windows)

- **Larguras** 320, 360, 390, 768, 1024, 1280, 1440 e 1920 px: `scrollWidth` igual à largura da tela em todas (sem estouro lateral), sem erro de console nem de rede (`qa/final/log-responsivo.txt`, `qa/final/responsivo/`: hero e página inteira em `?fx=0`).
- **Seções** capturadas depois da entrada de cada uma em 1440 e 390 px (`qa/final/secoes/`), e em 320 px durante o desenvolvimento.
- **Intro "indique \ receba /"** (28/10/2026, Edge headless, por servidor local e por `file://`): quadros em tempo real em 1440 e 390 px (`qa/final/intro-ascii/`, folhas `folha-1440.jpg` e `folha-390.jpg`) e quadros exatos pelo gancho `?ixqa=1` em 1440 × 900, 390 × 844 e 768 × 1024 (`qa/final/intro-ascii/quadros/`); também conferidos em 1366 × 768, 1920 × 1080, 844 × 390 e 320 × 568. Fim natural: overlay fora do DOM, X do cabeçalho visível e parado no lugar onde o X da intro pousou, h1 visível, sessão gravada. Escape, clique (não atravessa para o botão do hero), roda (não rola) e Escape no meio do voo: página liberada na hora, overlay fora do DOM em ~0,3 s, X do cabeçalho com a entrada normal. Recarga na sessão, `#âncora`, `?fx=0` e movimento reduzido: sem intro. 60 quadros/s em 1440 e 390 px sem GPU (mediana 16,7 ms entre quadros); o desenho de um quadro custa 0,6 ms (mediana) e 1,5 ms (p95) de script em 1440 px. A pasta `qa/final/intro/` guarda os quadros da intro anterior ("conexão", hoje em `backup/`).
- **Hero "visita"** (26/10/2026, WebGL com células de 5 px, fotos leves e -hd, `qa/final/visita/` e `qa/final/visita-telas/`): 23 telas sem o texto encostar no cabeçalho nem passar da base (notebooks 1280 × 600, 1366 × 657, 1280 × 689 e 720, 1536 × 730, 1440 × 789, 1600 × 789, 1024 × 640; monitores 1920 × 950 e 2560 × 1271; tablets em pé e deitados; celulares de 320 × 568 a 430 × 932 e deitados de 667 × 375 a 915 × 412); objetos inteiros e reconhecíveis em pontos; pontos iguais com a escala de 125% e 150% do Windows (células de 6 e 8 px); rolagem a 60 quadros/s em 1440, 1024, 768, 390 e 320 px; quadro de ~5 ms numa GPU integrada (Intel UHD) em 1440 e 1920 px; sem GPU (só CPU) a qualidade baixa sozinha até o nível 3; página inteira sem estouro lateral de 320 a 2560 px; movimento reduzido e `?fx=0`: sem `visita-on`, sem canvas, cartões; sem erros de console.
- **Funcional** 25/25 (`qa/final/log-funcional.txt`, capturas em `qa/final/funcional/`): um H1, títulos sem salto, `img` com `alt`/`width`/`height`, botões-ícone com nome, campos com `label` e `autocomplete`, ids únicos; simulador (VoIP Profissional R$ 199,00, Essencial R$ 99,00, Hospedagem R$ 29,90 sem grupo de planos, Colocation e VoIP Enterprise "100% da 1ª parcela", cliques rápidos deixam um valor só); formulário (envio vazio: 8 erros inline e foco no primeiro campo; máscaras; "Abrindo WhatsApp…"; aba nova com `wa.me` → `api.whatsapp.com` e a mensagem completa, inclusive "&"; painel de sucesso; "Indicar outra empresa"); FAQ abre; primeiro Tab no "Pular para o conteúdo"; menu do celular abre, Escape fecha e devolve o foco.
- **Sem JavaScript** (`qa/final/semjs/`): nenhuma cobertura presa, tudo visível no estado final, cabeçalho navy sólido com os links, aviso `<noscript>` no formulário. O hero vira a versão estática (fachada em pontos e paradas em cartões).
- **Checklist** `boas-praticas/checklist-revisao-ui.md`: sem `transition: all`; nenhuma animação de largura, altura, posição ou sombra; `outline: none` só em alvos de foco programático (`main` e o painel de sucesso); viewport sem bloqueio de zoom; `scroll-padding-top`; `text-wrap: balance` nos títulos; reticências e aspas tipográficas; `theme-color`; JSON-LD válido como JSON.
- **Imagem de compartilhamento** `og-indique.jpg` 1200 × 630 conferida visualmente.

### Não verificado

- Safari, Firefox e celulares físicos (só Edge/Chromium, com emulação de celular).
- Desempenho medido (CPU limitada, quadros longos, Lighthouse).
- Leitor de tela real (NVDA, VoiceOver): só a estrutura (rótulos, `aria-*`, `aria-live`) foi conferida.
- Navegação completa por teclado em todos os controles (conferidos: pular para o conteúdo, links do cabeçalho, menu e Escape).
- Validação do JSON-LD no Teste de pesquisa aprimorada do Google e prévia real do Open Graph nas redes.
- Entrega real da mensagem no WhatsApp da OneX (o teste parou na abertura da conversa com o texto).

## Pendências a confirmar com a OneX

**Regras do programa (a página não inventa nenhuma; o FAQ diz que a equipe informa):**
- Prazo de pagamento da comissão.
- Forma de pagamento (Pix, transferência, crédito em fatura…) e se é preciso emitir nota/recibo.
- Quem pode participar (clientes, não clientes, pessoa física, parceiros, funcionários).
- Limite de indicações por pessoa e validade da indicação (prazo para a empresa fechar).
- O que acontece se a empresa já é cliente, já está em negociação ou foi indicada por outra pessoa.
- O que conta como "1ª parcela": mensalidade cheia ou com desconto, taxa de instalação/setup, impostos, plano anual ou contrato de 12 meses (VPS), e se a comissão é paga só depois que a empresa paga essa parcela.
- Se haverá regulamento publicado (a página pode linkar).

**Conteúdo e dados:**
- Confirmar os valores de referência (Hospedagem Plano Básico R$ 29,90/mês; VoIP Essencial R$ 99/mês e Profissional R$ 199/mês) e as descrições de uma linha dos produtos.
- Confirmar os argumentos de "Por que a OneX" (data center próprio e visitável em Ipatinga e BH, engenheiro na primeira ligação 24/7, um fornecedor para tudo, dados em MG) e a frase sobre LGPD.
- Confirmar se as indicações devem ir para o WhatsApp (31) 4040-4888 ou para outro número/equipe.
- Texto de consentimento (LGPD) e URL da política de privacidade para linkar (não foi encontrada; nenhum link foi inventado).

**Publicação:**
- URL final da página (canonical, `og:url`, `og:image`, sitemap, JSON-LD e `llms.txt` usam `https://onexdc.com.br/indique/` como provisório).
- `robots.txt` na raiz do domínio e envio do sitemap ao Search Console.
- Ajustar o link "Conheça a OneX" (`../principal/index.html`) ao endereço publicado do site institucional.
- Medição de conversão (nenhuma tag instalada): sugerido um evento quando o WhatsApp abre.
- Avaliar hospedar a Montserrat junto da página (hoje vem do Google Fonts, um terceiro).
