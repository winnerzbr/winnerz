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
- **Visual no ar desde 09/11/2026 (noite): "Carga"**, escolhido pelo dono no canvas. É a Impacto + Ímã com o contorno com vão dos cards levado para tudo:
  - botões: uma moldura inclinada com vão em volta das duas peças. **Sem luz correndo no vão.** No hover as peças se afastam bastante (11 px para cada lado, o texto vai junto com a peça da esquerda), se cravam, a emenda acende no impacto e depois o vão preenche e fica aceso. **Nada se mexe sem o mouse em cima**, nem o botão âmbar do "agora" (usado em "Finalizar sessão" e nas ações do Álbum);
  - botão só de ícone (favoritar, mais ações): uma peça só dentro da moldura, sem emenda no meio; no hover o vão preenche;
  - abas, alternadores e filtros: borda e vão; no hover a luz dá uma volta e o vão acende; o escolhido já fica carregado;
  - capas: a capa inclina seguindo o ponteiro, com o ponto de luz onde ele está (a animação da Fresta, de volta em 09/11), e a luz dá uma volta na moldura e ela fica acesa;
  - campos: borda e vão; no foco, a borda acende e o vão fica aceso, **sem luz correndo** (pedido do dono, 09/11); o campo de Dificuldade da Jornada tem o mesmo tamanho dos outros;
  - cards: **sem luz correndo no vão**; no hover só a borda de fora acende, discreta (borda a 55% e brilho leve; pedido do dono, 09/11 à noite). Os dois cards da sessão aberta ("Hoje é para…" e "Dá para parar aqui?", classes `goalcard` e `stopcard`) entraram na lista de cards com contorno;
  - fundo: **sem as faixas de luz** (o dono achou que disputavam a atenção);
  - logo do menu: **não pulsa sozinho**; só a animação do hover;
  - nota: igual ao quadro "Nota em barras" do canvas: barras e número na cor da nota (do vermelho ao verde), a barra onde a nota parou pula e solta o pulso, o número dá um pulinho; no máximo, as barras fazem a onda e saem faíscas quadradas da última (componente `Burst`, em `StarInput` e `ScoreSlider`);
  - Coleção: os filtros ocupam a altura que precisarem ao lado das capas, sem caixa com rolagem (`.cfilters` em `etapa2.css`, vale para todos os visuais); as três opções de Formato cabem na coluna; no computador, os botões do topo ficam numa grade de duas colunas, com "Adicionar jogo" embaixo na largura toda;
  - listas de escolha (`select.field`, ex.: Ordem): sem o traço da frente, com a setinha à direita;
  - etiquetas, linha do tempo e avisos ficam como na Impacto + Ímã.
- **As três camadas do visual (todas inteiras no código):** Fresta (`fresta.css` e os outros) → Impacto + Ímã (`impacto.css`, classes `vi-<parte>`) → Carga (`carga.css`, classes `vc-<parte>`).
  - `src/lib/visual.ts` decide a camada de cada parte:
    - `VISUAL = 'carga'`, `'impacto'` ou `'fresta'` troca tudo;
    - `IMPACTO_PARTES = ['botoes']` deixa só essas partes como na Impacto + Ímã; `FRESTA_PARTES = ['nota']` deixa só essas na Fresta.
  - Partes: `fundo`, `menu`, `botoes`, `abas`, `filtros`, `etiquetas`, `cards`, `capas`, `campos`, `nota`, `linha`, `avisos`.
  - Teste sem mexer no código (vale só no aparelho que abre o link e fica guardado nele): `?visual=carga|impacto|fresta`, `?impacto=botoes,cards`, `?fresta=nota`, `?visual=padrao` para desfazer.
  - Para lançar um visual novo sem risco: publicar desligado, conferir com `?visual=...` no site no ar e só depois trocar o `VISUAL`.
- **A camada de baixo, "Impacto + Ímã · cards com contorno"** (no ar em 09/11/2026 até a Carga), escolhido pelo dono no canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb):
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
  - Quem liga as classes é `src/lib/visual.ts` (ver "As três camadas do visual").
  - Para ajustar uma parte, mexer só no bloco dela em `impacto.css`.
  - Celular: há um bloco próprio para botões e fichas até 600 px (o texto quebra em duas linhas). A luz do vão dos cards só existe com mouse.
  - Para revisar o celular: navegador do app em 375 px e um script que mede texto que não cabe e elementos além da borda; comparar com `?visual=fresta`.
- **Variações da Impacto + Ímã no canvas (09/11/2026):** Engate, Lâmina, Rastro, Forja e Carga. O dono escolheu a **Carga**, que foi para o site. As outras quatro ficam no canvas para consulta.
- **Descartadas pelo dono (09/11/2026):** Pincel, Figurinha, Estojo, Quadrinho e Zênite, fora da linha Impacto. Ele apagou as páginas do canvas. Não propor de novo direções fora da linha Impacto + Ímã.
- **As outras direções do canvas** (para consulta): Fresta 2, Monolito, Letreiro, Anamórfico, Impacto, Ímã, Transmissão, Cromo e Impacto + Ímã. Todas aparecem em 8 páginas do site, no modo escuro e no claro. O gerador fica em `prototipos/redesign-elementos/`.

## WinnerZ Awards
- 19 categorias. O dono escolhe os indicados.
- Na primeira edição, quem acabou de se cadastrar já pode votar.
- O troféu se chama **Zênite**.
  - Como ele é: figura esculpida em ouro, de braço erguido, com manto e bandeira ao vento (peça única em ouro); símbolo da Jornada em prata na bandeira; base de diamante transparente; logo WinnerZ em ouro na frente da base.
  - Modelo 3D oficial: enviado pelo dono em 11/11/2026 (`.glb`, 10,5 MB, fora do repositório). A versão preparada para a web, com a bandeira em movimento, está em `prototipos/awards-cena/zenite.bin`.
- **O Zênite em 3D (a versão mais fiel):** a página "Troféu WinnerZ Awards", https://claude.ai/artifact/Moh8mrJHKZAWyP4LVadHdT (21/10/2026; girar e aproximar; o título ainda diz "O Troféu", de antes do nome). As prévias do Awards de 11/11 usam um modelo mais simples feito em código. A versão mais antiga "Confluência" (https://claude.ai/artifact/7wyVUZhSfoMSo7f8vLf9Sz, 04/10) é de outro conceito, antes do troféu oficial. **Atualização (11/11, mais tarde):** o dono enviou o modelo `.glb` atual e a prévia do Awards passou a usar esse modelo de verdade.
- **Página do Awards (desde 11/11/2026):** abas Votação, Troféu Zênite e Como funciona; abertura com o troféu em 3D; "Seus votos" em quadros; categorias em lista grande com os indicados abrindo logo abaixo; "Por que Zênite" com o sol interativo. A cena de voto é a de sempre. Código em `src/pages/Awards.tsx`, `src/components/AwardsCena.tsx`, `src/lib/zenite3d.js` e `src/styles/awards-cena.css`; modelo em `public/modelos/zenite.bin`. Prévia e histórico das escolhas: `prototipos/awards-cena/` e o `historico.md` de 11/11.
- **No Início:** durante a votação e a apuração, banner do Awards em toda a largura com o troféu girando conforme o mouse (`AwardsBanner`).
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
- **Jornada (revisão de 10/11/2026):** lista com "Em andamento" (já teve sessão) e "Na fila"; página do jogo com dois botões no topo, trilha de progresso, abas História (Diário, por parte, linha do tempo) e Detalhes; o Diário tem um bloco por dia e o topo conta dias de jogo. Rodada 2: curva "Como foi, dia a dia" e previsão opcional "no seu ritmo" na aba Detalhes. "Anteriormente…" e os ecos das amizades já existiam. Rodada 3: pontes "Lives da Twitch" e "Lives do YouTube" (a live vira sessão); dependem da migração 0098 e ainda precisam de teste com live de verdade. Recusados pelo dono: palpites lacrados e figurinha por região.
- **Linha do tempo do jogo (10/11/2026):** tem página própria, `/jornada/<jogo>/linha-do-tempo`, com botão em destaque e cartão de entrada na página do jogo. É em cenas (uma por vez), com o **corte em lâmina** aprovado pelo dono no canvas https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM (quadro H). A linha deve ser cinematográfica; os efeitos tocam uma vez por cena. Já feitos também: linha geral por mês e por jogo, "Neste dia", "Lembra disso?", sessões do mesmo dia numa cena e nomes de capítulos. Também feitos: antes e depois, selos, capa do capítulo, legenda depois e compartilhar capítulo. "Por região" usa o Trilho lateral (proposta S do canvas), também com o corte em lâmina. A lista aprovada está completa.
- **Linha do tempo geral (12/11/2026):** `/jornada/linha-do-tempo` também é em cenas com o corte em lâmina, um mês por cena, e a régua embaixo tem as capas dos jogos centradas na linha (`LinhaMeses.tsx`). Deve continuar igual à linha do tempo do jogo.
- **Álbum de figurinhas:** em espera; só será lançado um tempo depois da estreia do site (decisão de 10/11/2026). Não criar coisas novas que dependam dele por enquanto.
- **Início, dia de lançamento:** quando um jogo do Radar sai hoje, ele aparece no ponto "Hoje" da linha do horizonte (só capa, nome e "Saiu hoje · No seu Radar", sem a palavra HOJE embaixo da capa), e não no quadrinho "No seu Radar". Nada de faixa grande: o dono não gostou. Código: `Horizon` em `src/pages/Home.tsx`, estilo no fim de `src/styles/fresta.css`.
