# Visita: deixar mais dinâmica a partir da 3ª parada

Problema (versão B, `index-parallax-visita.html`): a visita tem 6,5 trechos de 88svh, quase 6 telas de rolagem, e
cada parada pede o mesmo esforço. Da 3ª parada em diante (rede, storage, telefonia) a pessoa já entendeu a mecânica e
a novidade acaba. Esses produtos ainda se repetem logo depois, na seção "Produtos".

Quatro caminhos, todos mantendo o parallax. **Recomendação: 1 + 2 juntas** (corredor e rack no ritmo de hoje, onde a
imersão funciona; depois um mergulho rápido em que rede, storage e telefonia aparecem juntas, espalhadas e em
velocidades diferentes, antes de fechar no X). A visita fica com cerca de metade da rolagem e termina num ponto alto.

Contexto do código (`assets/js/visita.js`): `CENAS` (7 cenas: fachada, corredor, rack, rede, storage, telefonia, X),
`alvo()` converte a rolagem em `t` (de 0 a `N − 1 + CAUDA`) de forma linear, `camadas(t)` monta a câmera entre a cena
`floor(t)` e a seguinte, `legendasEm(t)` cuida dos textos (`visibilidade(k, d)` com `d = t − k`). A altura da seção sai
de `--visita-trechos` (6.5) e `--visita-trecho` (88svh) em `assets/css/indique.css`.

## 1. Acelerar a partir da 3ª parada

Paradas 1 e 2 como estão; da 3ª em diante, cada trecho cai para uns 45% da tela. A câmera mergulha mais rápido e os
textos espalhados entram e saem num ritmo maior. A visita encolhe para umas 3,5 telas.

- Mais simples: só muda como a rolagem vira tempo.
- Como fazer: um peso por trecho, por exemplo `PESOS = [1, 1, 1, 0.5, 0.5, 0.5, 0.5]` (o último é a cauda). Em
  `alvo()`, a fração de rolagem `p` vira `t` pela soma acumulada dos pesos (achar o trecho onde `p` cai e interpolar
  dentro dele). A altura da seção passa a ser `soma dos pesos × 88svh + 100svh` (pôr numa variável CSS pelo JS ou
  fixar o valor). O foco de teclado numa legenda (`focusin`, que rola até a parada) precisa da conta inversa (`t → p`).
- Cuidado: a inércia da câmera (`1 − exp(−dt × 7)`) fica mais visível em trechos curtos; talvez subir para 9 a 10.

## 2. Juntar rede, storage e telefonia num momento só

Depois do rack, a câmera dá um mergulho mais longo e as três paradas aparecem juntas, como três blocos espalhados pela
tela, cada um entrando de um lado e numa velocidade diferente, enquanto o fundo passa pelas três cenas. Um clímax só em
vez de três paradas; corta quase 2 telas.

- As cenas podem continuar as mesmas (o fundo atravessa rede → storage → telefonia em trechos curtos, como no item 1).
- Textos: as paradas 3, 4 e 5 ganham uma janela de visibilidade comum (por exemplo, todas visíveis de `t = 2,8` a
  `t = 5,4`) em `visibilidade()`, e cada uma entra de um lado (`translateX` além do `translateY` de hoje).
- Layout (`.visita--espalhada`): em vez de cada parada ocupar a tela inteira, as três dividem a tela, por exemplo rede
  no alto à esquerda, storage no meio à direita, telefonia embaixo à esquerda (`grid-area` por `data-parada`), com
  menos texto (só título e ganho; os itens ficam para a seção "Produtos").
- Velocidades diferentes por bloco (`data-vel` 0,15 / 0,3 / 0,45) para elas se cruzarem enquanto a rolagem passa.

## 3. Mudar de direção na 3ª parada

A partir da rede, a rolagem para baixo vira movimento lateral: as paradas 3, 4 e 5 deslizam da direita para a
esquerda como painéis, com cena, título e itens em velocidades diferentes. Quebra a monotonia porque muda o tipo de
movimento, não só o ritmo. É a opção mais trabalhosa.

- Câmera: para `t ≥ 2`, em vez do zoom (`camadas()`), um deslocamento lateral: a cena atual sai pela esquerda e a
  próxima entra pela direita (mudar `A`, o ponto da tela onde a foto fica, em vez de `s`, a escala).
- Textos: as paradas 3 a 5 lado a lado numa faixa (`display: flex`, cada uma com 100% da largura), que anda
  `translateX(−(t − 2) × 100%)`; dentro de cada painel, `data-vel` vira deslocamento horizontal.
- Voltar ao zoom para entrar no X no fim.

## 4. Encerrar a visita no rack e passar o resto para os cartões

A visita termina na 2ª parada com o X; rede, storage e telefonia ficam só nos cartões em parallax da seção
"Produtos", que já tem tudo isso. É a página mais curta e sem conteúdo repetido, mas perde três cenas.

- `CENAS`: tirar rede, storage e telefonia; ajustar o ponto de entrada do rack (`f` e `r`) para mergulhar no X.
- HTML: tirar as paradas 3, 4 e 5 da lista; o fim ("Tudo isso você pode indicar…") pode citar os outros produtos e
  apontar para a seção "Produtos".
- CSS: `--visita-trechos` de 6.5 para 3.5.
- As fotos `3-rede`, `4-storage`, `5-voip` (e as `-hd`) e os `pontos-3..5.webp` deixam de ser usados (podem ficar
  guardados ou sair; `visita-cenas.js` precisa ser refeito por `qa/scripts/gera-cenas-js.js`).
