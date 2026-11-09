# Site WinnerZ

O site nasceu para mostrar de forma visual a planilha de coleção e backlog de games e virou um projeto maior. O código está em `winnerzbr/winnerz`, hospedado no Vercel, com banco no Supabase. O domínio é www.winnerz.com.br. Como colocar no ar está no `README.md` da raiz.

## Pilares
- **Coleção.**
- **Jogos:** catálogo pelo IGDB.
- **Jornada:** é a ideia central, um diário e linha do tempo das jogatinas, com backlog sem obrigação.
- **Comunidade:** feed, comunidades no estilo Reddit e jogatinas.
- **Eventos:** WinnerZ Awards e desafios.

## Situação
- O site fica fechado até o WinnerZ Awards estar pronto para divulgar. Antes disso, só convidados.
- Supabase e Vercel nos planos gratuitos. O e-mail sai pelo Resend.
- **Espaço no Vercel:** o grátis guarda até 10 GB somando todas as versões do site, e cada versão ocupa uns 75 MB (quase tudo é o Jogos de Verão).
  - O `vercel.json` só deixa montar uma versão nova quando muda algo do site (`scripts/vercel-pular.sh`).
  - Esse atalho compara com a última versão no ar. O Vercel baixa só os envios mais recentes; se essa versão ficou de fora, o atalho manda montar. Ele só pode responder 0 (pular) ou 1 (montar): qualquer outra resposta o Vercel trata como erro e não publica. Isso travou o site de 05/11 a 09/11/2026.
  - Para saber se uma publicação no ar deu certo, olhar o painel do Vercel (Deployments): no GitHub, versão pulada e versão com erro aparecem iguais ("Deployment has failed").
  - Enviar ao `main` uma vez por rodada de trabalho, não a cada commit.
  - Arquivos grandes que não vão para o site ficam fora de `public/`.
- **Autor dos commits:** `Claude <noreply@anthropic.com>`, que o GitHub reconhece. Com outro e-mail, o Vercel mostra o aviso "GitHub user not found". O aviso não bloqueia nada, mas é bom evitar.
- Fase atual: refinar o site. Antes de cada etapa, o dono quer ver como vai ficar.

## Visual
- **Linguagem visual "Fresta":**
  - títulos na Archivo larga em caixa alta;
  - avatar quadrado com contorno branco;
  - cortes a 22°.
- **Cores:** âmbar só para o que está acontecendo agora. Dourado só no que é lendário, e com parcimônia.
- **Logo:** o oficial é o monograma WZ (W e Z ligados) com "WINNERZ" embaixo. No rebranding, a versão escolhida é a Forjada (dourada).
- **Proibido:**
  - layout genérico de site feito por IA, como cards cinza com contorno fino;
  - octógonos.

  Tudo é criado do zero para o WinnerZ.
- **Notas:** escala de 0 a 5, sem estrelas.
- **Visual em uso desde 09/11/2026: "Impacto + Ímã · cards com contorno"**, escolhido pelo dono no canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb):
  - botões em duas peças inclinadas (o texto e a seta) que se afastam e se cravam no hover, com a emenda acendendo; o botão "agora" (âmbar) repete o impacto sozinho;
  - abas, filtros e etiquetas em blocos inclinados, rótulos em caixa alta larga;
  - cards com contorno discreto (escuro no modo escuro, cinza no claro) e um vão vazado de 5px; no hover, uma luz dá duas voltas dentro do vão e depois enche o vão inteiro, que fica aceso enquanto o mouse estiver em cima (a volta sem fim tirava a atenção). Os cards com foto que corta nas bordas (`rcard`, `evcard`, `hwcard`, `review`, `trail-card`) só acendem o contorno. Esse contorno com vão foi pedido pelo dono e não conta como "card cinza com contorno fino";
  - feixes de luz diagonais no fundo; o logo pulsa de tempos em tempos;
  - capas sem a inclinação com ponto de luz: sobem, a moldura acende e uma luz diagonal corta;
  - campos com o traço inclinado na frente e brilho no foco; interruptor inclinado;
  - linha do tempo do Início: linha mais grossa, trecho âmbar com brilho chegando ao Hoje, marcadores em barras inclinadas (passado cinza, próximo com contorno âmbar, marco dourado) e o Hoje pulsando;
  - **Nota:** barras inclinadas que enchem de baixo para cima, com os mesmos efeitos de antes, nas duas escalas (0 a 5 e 0 a 10). O meio ponto corta a barra na horizontal. O número fica numa caixa de largura fixa, para as barras não andarem. Ao apontar: a barra vem da posição de lado a lado (corrigida pela inclinação), e o meio ponto vem da altura: metade de cima = ponto inteiro, metade de baixo = meio ponto (`pickBar` em `src/components/Stars.tsx`, usado no `StarInput` e no `ScoreSlider`). O pulso sai a cada nota aplicada.
- **WinnerZ Awards:** os efeitos da votação ficam como sempre (cena em tela larga, zoom lento, reflexo de lente, luz vazando, granulado, faixas pretas e clarão). Nunca trocar. Os rótulos do Awards, da revelação e dos cards de evento continuam no estilo mono.
- **Como a Impacto foi montada (reversível):** é uma camada por cima da Fresta. A Fresta continua inteira no código (`fresta.css` e os outros).
  - `src/styles/impacto.css` é carregado por último; cada parte só vale quando o `<html>` tem a classe `vi-<parte>`;
  - as partes são: `fundo`, `menu`, `botoes`, `abas`, `filtros`, `etiquetas`, `cards`, `capas`, `campos`, `nota`, `linha` (a linha do tempo do Início), `avisos`;
  - `src/lib/visual.ts` liga as classes:
    - para voltar à Fresta inteira: `VISUAL = 'fresta'`;
    - para trazer de volta só algumas partes da Fresta: pôr o nome delas em `FRESTA_PARTES` (ex.: `['botoes', 'nota']`).
  - Teste sem mexer no código (vale só no aparelho que abre o link e fica guardado nele):
    - `?visual=fresta` ou `?visual=impacto` troca tudo;
    - `?fresta=botoes,cards` usa a Fresta só nessas partes;
    - `?visual=padrao` volta ao que está no código.
  - Para ajustar uma parte, mexer só no bloco dela em `impacto.css`.
  - Celular: há um bloco próprio para botões e fichas até 600 px (o texto quebra em duas linhas). A luz do vão dos cards só existe com mouse.
  - Para revisar o celular: navegador do app em 375 px e um script que mede texto que não cabe e elementos além da borda; comparar com `?visual=fresta`.
- **Cinco direções novas em avaliação (09/11/2026, pedidas pelo dono; nada aplicado no site):** cada uma tem página própria no canvas, com os elementos e 8 páginas do site, no escuro e no claro.
  - **Pincel:** peças pintadas à mão, com pinceladas de borda irregular e segunda demão no hover; rótulos pequenos manuscritos (Caveat).
  - **Figurinha:** peças como figurinhas do Álbum (borda branca recortada, levemente tortas); o canto descola e passa o brilho de holográfica; o que falta é espaço tracejado.
  - **Estojo:** a coleção física; lombadas na prateleira, disco que sai do botão, card que abre como estojo, capa que abre e mostra o disco.
  - **Quadrinho:** nanquim grosso, retícula como sombra, linhas de velocidade, cards como quadros com legenda, campos como balões.
  - **Zênite:** luz vinda de cima; peças sobem para a luz; estados como fases (disco cheio, anel, eclipse com coroa âmbar).
  - Aguardando a escolha do dono. O visual no ar continua "Impacto + Ímã · cards com contorno".
- **As outras direções do canvas** (para consulta): Fresta 2, Monolito, Letreiro, Anamórfico, Impacto, Ímã, Transmissão, Cromo e Impacto + Ímã. Todas aparecem em 8 páginas do site, no modo escuro e no claro. O gerador fica em `prototipos/redesign-elementos/`.

## WinnerZ Awards
- 19 categorias. O dono escolhe os indicados.
- Na primeira edição, quem acabou de se cadastrar já pode votar.
- O troféu se chama **Zênite**.
- O resultado nunca pode vazar antes da revelação.

## Áreas e ideias
- **IAmiguinho:** é o mascote e o guia do site, com perfil próprio, @iamiguinho.
- **Museu:** a primeira versão é a visita guiada. O museu jogável vem depois, como novidade.
- **Arcade do IAmiguinho e Fase da Semana:** aprovados. O Minigolfe saiu dos Jogos de Verão e vai entrar no Arcade, com os gráficos do Arcade.
  - **Arcade com 23 jogos** (07/11/2026): os 13 de antes, mais Jato de Refri, Ladeira do Rolimã, Fuga do Spoiler, Rumo à Loja, Torre do Backlog, Queda do Disco, Gancho do Cabo, Lobby dos Bugs, Defesa da Live e Derruba o Backlog, todos inspirados em mecânicas consagradas de celular. A página atual é o artefato "Arcade do IAmiguinho" a7133e84-99f5-4677-b39d-4b4b8fce46f9. O código fica em `jogos/arcade/` (novos jogos em `novos/`, juntar com `montar.py`, regras em `BRIEF.md`).
  - **Estilo do Arcade: 8 bits** (pedido do dono em 07/11/2026). Demos de teste em `jogos/arcade-demos/`, publicadas como página no Claude: Temporada Relâmpago, Fábrica de Balacaxi, Pega o Boné, Pinball WinnerZ, Cabo Enrolado e Lag. Base comum em `arcade.js` (tela 320x180, letra própria em pixels, controles, recorde da semana). O dono ainda vai escolher quais entram.
- **IAmiguinho: Jogos de Verão:** no ar em `/jogos-de-verao` (tela inteira) e `/studio/jogos-de-verao` (com o editor, só administração). Guarda o editor na tabela `jogo_dados` e as imagens pintadas na pasta `jogos` do Storage (migração 0097, o dono roda no SQL Editor). Detalhes em `jogos-de-verao.md`.
- **Álbum de figurinhas:** deixado de lado por causa de direitos autorais. Nada de figurinhas com arte de IA.
- **Cartas Vivas** (cartas no estilo super trunfo): guardada para depois. Não usar o nome "Super Trunfo", que é marca da Grow.
- **App de celular** (iPhone e Android): o site dentro do app, com widgets e notificações.
- **Tradutor de tela:** aprovado.
- **Modo TV:** feito, mas **desligado** em 01/11/2026 a pedido do dono: o controle usado nos Jogos de Verão abria o Modo TV e tirava a pessoa do jogo. O código continua em `src/tv/`; para religar, trocar `MODO_TV` para `true` em `src/tv/mode.ts`. Desligado, o controle não abre nada no site e os endereços /tv não existem (o /tv/parear continua).
- **IAmiguinho no Sofá:** aprovado. É só para as lives do dono, ver `lives.md`.
- **Jornada:** o modo mapa sai e fica a linha do tempo com rolagem.
- **Início, dia de lançamento:** quando um jogo do Radar sai hoje, ele aparece no ponto "Hoje" da linha do horizonte (só capa, nome e "Saiu hoje · No seu Radar", sem a palavra HOJE embaixo da capa), e não no quadrinho "No seu Radar". Nada de faixa grande: o dono não gostou. Código: `Horizon` em `src/pages/Home.tsx`, estilo no fim de `src/styles/fresta.css`.
