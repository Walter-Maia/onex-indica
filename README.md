# Indique a OneX: landing do programa de indicação

Página estática (HTML, CSS e JS vanilla, sem build) do programa de indicação da OneX Data Centers. A promessa central, definida pelo cliente: **quem indica recebe 100% da 1ª parcela do produto que indicou, quando a empresa indicada contrata.** Nada além disso foi inventado; o que a página precisa e o cliente ainda não definiu está em [Pendências](#pendências-a-confirmar-com-a-onex).

## Como abrir

Abra `index.html` direto no navegador (funciona em `file://`). Não há dependência local; a única requisição externa é a fonte Montserrat (Google Fonts). Sem internet, a página usa a fonte de reserva (Arial ajustada) e continua legível.

| Parâmetro | O que faz |
|---|---|
| `?intro=1` | força a intro (ignora "já vista nesta sessão", `#âncora`, página rolada e aba oculta). Não passa por cima de movimento reduzido nem de `?fx=0`. |
| `?intro=0` | pula a intro. |
| `?fx=0` | composição estática: sem intro, sem vídeo, sem cena, sem entradas; tudo no estado final. |

Os parâmetros combinam (`?intro=0&fx=0`). A intro toca uma vez por sessão do navegador (`sessionStorage`, chave `onex-indique-intro`).

## Arquivos

| Caminho | O que é |
|---|---|
| `index.html` | conteúdo, SEO, JSON-LD (Organization, WebPage, BreadcrumbList, HowTo, FAQPage), sprite do X, arte vetorial do hero |
| `assets/css/indique.css` | estilos mobile-first, tokens, roteiros comentados da intro e da cena do hero |
| `assets/js/indique.js` | cabeçalho e menu, CTA fixo do celular, efeitos que se repetem, cena do hero, vídeo de fundo, ícones, títulos linha a linha, simulador, formulário |
| `assets/js/intro.js` | intro "conexão" (só roda com `html.intro-ativa`) |
| `assets/img/` | logo oficial (branco e cinza), X oficial, favicon, pôster do vídeo, `og-indique.jpg` (1200 × 630), `x-luz-*.webp` (não usados na página; guardados para peças) |
| `assets/video/` | `conexao-x.mp4` (1280 × 716, desktop) e `conexao-x-720.mp4` (720 × 402, celular), vídeos do Higgsfield fornecidos pelo time |
| `robots.txt`, `sitemap.xml`, `llms.txt` | rastreamento e resumo do programa para assistentes de IA |
| `qa/scripts/` | harness de QA (Edge headless por DevTools Protocol via pipe, Node 14) e geradores |
| `qa/final/` | capturas e registros da verificação final |

## Identidade aplicada

Preto, branco e laranja (paleta da página OnexCloud, sem azul): laranja `#F9681C` (botões, traços, destaques grandes), preto `#111010` (texto e caixas escuras, token `--preto`), cinza quente `#55504A` (texto corrido, `--cinza`), papel `#F6F4F1`, branco `#FFFFFE`; vídeo e pôsteres das fitas de luz reprocessados para tirar o azul do fundo; vermelho `#DD4444` só na borda de campo com erro. Montserrat 300–800. Logo e X sempre oficiais (imagens de `assets/img/`); o cabeçalho recorta o logo oficial em duas partes por `clip-path` só para animar a entrada. As três peças do X usadas nas animações são os polígonos medidos no alfa do PNG oficial; onde o X aparece inteiro, a arte oficial entra por cima no fim.

| Contraste | Razão |
|---|---|
| preto sobre o botão laranja | 6,3:1 |
| laranja sobre preto (destaques, índices, "100%") | 6,3:1 |
| preto sobre a caixa laranja | 6,3:1 |
| cinza quente sobre branco / papel | 8,0:1 / 7,2:1 |
| laranja de texto `#B5460C` sobre branco / papel | 5,5:1 / 5,0:1 |
| placeholder `#6B7290` sobre branco | 4,7:1 |

Laranja `#F9681C` sobre branco dá 3,0:1: não é usado em texto sobre fundo claro.

## Intro "conexão" (3,0 s + 0,6 s de saída)

Indicar é ligar duas pontas. Duas trilhas de luz laranja entram pelos cantos de cima correndo exatamente pelos eixos do X da OneX e se cruzam no ponto de cruzamento do próprio X; as três peças correm pelos mesmos eixos e travam; a arte oficial assenta; "100%" sobe algarismo por algarismo; a tela se recolhe para a caixa do hero e se abre pela diagonal "/" do X. É diferente da intro do site principal (varredura de terminal, letras mono digitadas, dissolução em ASCII): aqui não há texto digitado, monoespaçada nem caracteres.

| Início (s) | Duração | Camada | Técnica |
|---|---|---|---|
| 0,10 | 0,50 | entrada: trilha 1 (eixo "\\", você → indicado) e trilha 2 (eixo "/", o retorno) nascem logo fora da tela e aceleram até o cruzamento; as pontas chegam juntas em 0,60 | traço + cometa |
| 0,60 | 0,45 | saída das trilhas até a borda oposta | traço + cometa |
| 0,58 | 0,62 | um pulso único no cruzamento | anel |
| 0,68 / 0,76 / 0,84 | 0,55 | peças A, B e C correm pelos eixos e travam | montar |
| 1,15 | 0,50 | trilhas esmaecem para 14% (ficam como filetes) | — |
| 1,35 | 0,30 | X oficial por cima das peças (peças saem 1,60–1,80) | troca para a arte oficial |
| 1,50 + i·0,07 | 0,55 | "1", "0", "0", "%" sobem das máscaras | letras em sequência |
| 2,05 | 0,45 | legenda "da 1ª parcela para quem indica a OneX" | — |
| 2,50–3,00 | — | marca parada | — |
| 3,00 | 0,35 | a tela se recolhe para o formato da caixa do hero (`clip-path`) e o conteúdo some | saída |
| 3,15 | 0,45 | as metades se abrem pela "/" do X; cabeçalho (em partes) e hero entram | saída + entrega ao cabeçalho |

Contrato técnico (skill `efeito-de-intro`): decisão no `<head>` antes da primeira pintura; cobertura navy em CSS com failsafe de 4,6 s; `intro.js` com `onerror` que libera a página; dois `requestAnimationFrame` antes de tocar (mais um `setTimeout` de reserva); `finish(true)` no fim natural e `finish(false)` em Escape, Tab, Enter, teclas de rolagem, roda, toque, clique, rolagem, aba oculta e nas travas (sem quadro em 1,5 s; duração + 2 s); sessão gravada logo no começo; não roda com `#âncora`, aba oculta, página já rolada, movimento reduzido ou `?fx=0`. O cabeçalho e o hero entram via `--rise-start`, calculado a partir do instante real em que as animações de entrada nasceram (a primeira pintura pode demorar; sem essa correção o hero ficava invisível depois da intro).

## Cena do hero (4,65 s, toca uma vez e para no quadro final)

As pernas do X apontam para as duas pontas da história: você (esquerda) e a empresa indicada (direita). Sem depender de texto: você → empresa (traço com ponta de luz) → a empresa acende, sobe o contrato, a assinatura se desenha e o selo assenta → o traço sobe pela perna direita e as três peças do X travam (a arte oficial entra por cima) → o traço desce pela perna esquerda até você → brilho e o cartão "100% da 1ª parcela". Só dois textos na arte: "Você" e o valor. Roteiro com tempos no comentário "CENA DO HERO" de `indique.css`.

O quadro final é o estado base do CSS: sem JS, com movimento reduzido ou `?fx=0`, a arte mostra a história inteira, com setas de sentido. Quando o hero sai inteiro da tela, a cena volta ao início parada e toca de novo na volta; com a aba oculta, congela. Como não é loop, não precisa de botão de pausa. Ao fundo, o vídeo das fitas de luz (`muted loop playsinline preload="none"`) carrega só com movimento liberado, depois da intro, com o hero na tela e a aba visível (versão de 720 px no celular); pausa fora da tela; tem botão de pausar/retomar (WCAG 2.2.2); se não carregar ou não tocar, fica o pôster. Um "remanso" navy atrás da arte impede que a luz do vídeo dispute com o traço.

## Animações por seção

| Seção | Animação | Gatilho |
|---|---|---|
| Intro | trilhas pelos eixos do X, peças que montam o X, "100%" por máscara, saída em diagonal | 1ª visita da sessão |
| Cabeçalho | X do logo gira e assenta com mola, "one" vem da esquerda, links e botão descem; barra flutuante troca de tom (claro/navy) conforme o que passa por baixo | fim da intro / rolagem |
| Hero | texto sobe em sequência; cena vetorial da indicação; vídeo de fundo | carga / intro |
| Como funciona | nó numerado → título → linha laranja até o próximo nó, sobre um trilho fantasma; o nó 4 (laranja) solta um pulso | 35% na tela |
| Produtos | cada ícone com movimento próprio: racks entram no gabinete, LEDs do servidor piscam, cursor do terminal pisca, linhas do site se escrevem, VMs saltam dentro do host, seta sobe na nuvem, aba do envelope fecha, ondas do VoIP, seta do backup dá a volta e o arquivo desce | 15% na tela; de novo ao passar o mouse |
| Simulador | o valor troca como uma placa (sai para cima, entra de baixo, algarismos tabulares, sem contagem) e a barra da 1ª parcela se enche | mudar produto/plano |
| Por que a OneX | pino cai no lugar, fone se desenha e o microfone completa, camadas empilham, escudo e visto se desenham | 15% na tela; mouse |
| Formulário | estados Enviar → "Abrindo WhatsApp…" → painel de sucesso com o visto desenhado; marca-d'água do X em traço | envio / 20% na tela |
| FAQ | hover: fundo branco e o + gira 90°; aberta: cartão navy e o + laranja vira × (uma curva e uma duração) | mouse / clique |
| Fechamento | X em traço se desenha como marca-d'água | 20% na tela |
| Títulos H2 | linha a linha, cada uma sobe de dentro da própria máscara (90 ms entre linhas) | 60% na tela |

Tudo anima só `transform`, `opacity`, `stroke-dashoffset` e `clip-path` (cores em hover/estado são transições curtas de cor). Os efeitos de entrada voltam ao início quando o bloco sai da tela e tocam de novo na volta; o que já está na tela na carga não é escondido.

## Decisões

1. **Intro própria e diferente da do site principal**, derivada da ideia de conexão e da geometria real do X (trilhas pelos eixos medidos, cruzamento no ponto de cruzamento do X).
2. **Hero conta a indicação com a geometria do X** (as pernas apontam para você e para a empresa) e **toca uma vez** (não é loop). O loop contínuo fica só no vídeo de fundo, que tem botão de pausa.
3. **Botões laranja com texto preto** (6,3:1). Texto branco em `#F9681C` dá 3,0:1 e não passa AA.
4. **"100% da primeira parcela" em laranja no H1**: é a oferta, não decoração; a condição ("quando a empresa indicada contrata") fica logo abaixo, no hero, no passo 3, no simulador e na primeira resposta do FAQ.
5. **Formulário sem backend e honesto**: valida inline, monta a mensagem e abre `https://wa.me/553140404888?text=…` (dentro do gesto de envio; se o navegador recusar a aba nova, abre na mesma aba). A interface diz que nada é guardado e que a indicação só chega quando a pessoa toca em enviar no WhatsApp. "Indicar outra empresa" mantém os dados de quem indica.
6. **Simulador** abre em Telefonia VoIP Profissional (R$ 199,00). Produtos "sob consulta" mostram "100% da 1ª parcela do plano que a empresa fechar". A nota "valores de referência…" fica ao lado do simulador e na seção de produtos.
7. **Produtos como tabela com filetes**, não cartões iguais; a caixa laranja "Por que a OneX" sobe sobre a do simulador.
8. **Montserrat sem bloquear a primeira pintura** (`media="print"` → `all`, com `<noscript>`), com reserva Arial ajustada (`size-adjust: 112%`); os títulos linha a linha são refeitos quando a fonte chega.
9. **`?intro=1` não passa por cima de movimento reduzido nem de `?fx=0`** (acessibilidade primeiro).
10. **Rodapé no papel**, depois da caixa de fechamento; o link "Conheça a OneX" aponta para `../principal/index.html` (site institucional em construção na pasta vizinha) e há também `https://onexdc.com.br/`.

## SEO e AEO

Title (59 caracteres) e description (154) com "Programa de indicação OneX Data Centers" e a oferta; canonical `https://onexdc.com.br/indique/` (**provisório**); Open Graph e Twitter com `og-indique.jpg` (gerada por `qa/scripts/gera-og.js` com ffmpeg a partir do pôster, do logo e do X oficiais); `theme-color` navy; JSON-LD com `Organization` (contatos, redes, data centers de Ipatinga e BH), `WebPage`, `BreadcrumbList`, `HowTo` (os 4 passos) e `FAQPage` (as 9 perguntas, com o mesmo texto da página); um único H1 e títulos sem salto; respostas do FAQ com a resposta direta na primeira frase; `llms.txt` com o resumo do programa e o que não é publicado.

Na publicação: `robots.txt` só vale na raiz do domínio (se a página ficar em `/indique/`, copie as linhas para o `robots.txt` da raiz); as URLs absolutas de `og:image`, canonical, sitemap e JSON-LD dependem do endereço final.

## QA

Harness em `qa/scripts/` (Node 14, sem dependências; Edge headless controlado pelo DevTools Protocol via `--remote-debugging-pipe`, em tempo real):

```bash
cd qa/scripts
node intro.js final/intro 1440,390      # quadros da intro + Escape, sessão, #âncora
node cena.js final/cena 1440            # quadros da cena do hero + fora da tela, aba oculta, reduzido, ?fx=0
node olhar.js final/responsivo 320,1440 # hero, estouro lateral e página inteira em ?fx=0
node secoes.js final/secoes 1440        # cada seção depois da entrada
node funcional.js final/funcional       # estrutura, simulador, formulário/WhatsApp, FAQ, foco, menu
node video.js                           # vídeo de fundo
node folha.js ../final/intro 1440 480 3 # folha de contato dos quadros
node gera-og.js                         # refaz assets/img/og-indique.jpg
```

### Verificado (23/10/2026, Edge 155 headless, Windows)

- **Larguras** 320, 360, 390, 768, 1024, 1280, 1440 e 1920 px: `scrollWidth` igual à largura da tela em todas (sem estouro lateral), sem erro de console nem de rede (`qa/final/log-responsivo.txt`, `qa/final/responsivo/`: hero depois da cena e página inteira em `?fx=0`).
- **Seções** capturadas depois da entrada de cada uma em 1440 e 390 px (`qa/final/secoes/`), e em 320 px durante o desenvolvimento.
- **Intro** em quadros de tempo real, 1440 e 390 px (`qa/final/intro/`, folhas de contato `folha-1440.jpg` e `folha-390.jpg`): trilhas entram, cruzam em ~0,6 s com o pulso, peças travam, X oficial, "100%", saída para a caixa do hero e abertura em diagonal, cabeçalho e hero entrando. Também: sessão gravada, Escape pula na hora, recarga na mesma sessão não repete, `#âncora` não roda. As capturas pedidas por linha de comando (`--virtual-time-budget` 300, 1200 e 2200 ms com `?intro=1`, e `?intro=0`/`?fx=0`) estão em `qa/final/cli/`.
- **Cena do hero** em quadros, 1440 e 390 px (`qa/final/cena/`): ordem da história conforme o roteiro; rearma fora da tela e toca de novo na volta; com a aba oculta congela (o relógio da cena andou 17 ms em 800 ms); movimento reduzido: sem intro, quadro final, sem vídeo; `?fx=0`: sem intro, sem vídeo e nenhuma animação rodando.
- **Vídeo** (`qa/final/log-funcional.txt`, fim): 1440 px carrega `conexao-x.mp4`, 390 px carrega `conexao-x-720.mp4`; pausa com o hero fora da tela e volta a tocar; o botão pausa e retoma, com o rótulo trocando.
- **Funcional** 25/25 (`qa/final/log-funcional.txt`, capturas em `qa/final/funcional/`): um H1, títulos sem salto, `img` com `alt`/`width`/`height`, botões-ícone com nome, campos com `label` e `autocomplete`, ids únicos; simulador (VoIP Profissional R$ 199,00, Essencial R$ 99,00, Hospedagem R$ 29,90 sem grupo de planos, Colocation e VoIP Enterprise "100% da 1ª parcela", cliques rápidos deixam um valor só); formulário (envio vazio: 8 erros inline e foco no primeiro campo; máscaras; "Abrindo WhatsApp…"; aba nova com `wa.me` → `api.whatsapp.com` e a mensagem completa, inclusive "&"; painel de sucesso; "Indicar outra empresa"); FAQ abre; primeiro Tab no "Pular para o conteúdo"; menu do celular abre, Escape fecha e devolve o foco.
- **Sem JavaScript** (`qa/final/semjs/`): nenhuma cobertura presa, tudo visível no estado final, cabeçalho navy sólido com os links, aviso `<noscript>` no formulário. (Na captura de página inteira os links do cabeçalho somem; é defeito da captura `captureBeyondViewport`: a captura da tela, `1440-semjs-tela.png`, mostra os links.)
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
