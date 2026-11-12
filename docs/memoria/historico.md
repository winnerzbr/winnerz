# Histórico

A entrada mais nova fica em cima. Cada entrada traz o que foi feito, o que foi decidido e o que ficou pendente.

---

## 12/11/2026 — Cartões com faixa lateral (layout antigo) trocados pelo cartão atual

- Pedido do dono: a lista de respostas e aparições no perfil do IAmiguinho usava o cartão antigo (faixa colorida na lateral); padronizar e varrer o resto do site.
- Passaram para o cartão atual (`.card`, sem a faixa): as aparições públicas do perfil dele (com o lugar e a data num título pequeno), a resposta dele dentro das conversas (`.iam-resp`), o "Anteriormente…" (`.previously`) e o aviso de convite novo no Studio (`.invnew`).
- Continuam com a linha lateral, de propósito, as citações e respostas encadeadas nas conversas e mensagens (ali a linha marca "isto é uma citação", não é cartão).

## 12/11/2026 — IAmiguinho 3D, segunda rodada: dedos, rostos dos jogos, balão novo e os lugares antigos

- Pedidos do dono: mãos segurando a borda de verdade (com ossos nos dedos); os rostos iguais aos dos jogos; balão de diálogo estilizado (o cartão era "padrão de IA"); trocar os lugares que ainda usavam o desenho antigo; mãos em posição neutra ou expressiva (não espalmadas); tirar as pontas que saíam do lado do tronco.
- **Dedos:** 22 ossos agora. Em cada mão, os quatro dedos dobram juntos em dois ossos (base e meio) e o polegar tem o dele. Na borda, as mãos ficam de palma para baixo com os dedos fechados por cima dela. Parado, o braço fica solto com a palma virada para a perna e os dedos meio fechados; andando e comemorando, punhos; acenando, mão aberta de frente.
- **Pontas no tronco:** eram vértices do lado da barriga puxados pelo braço; os pesos do braço agora só pegam o que está para fora do tronco.
- **Rostos:** a folha `provas/volei/rostos_ia.png` do Jogos de Verão (uma fileira, em `public/modelos/iamiguinho-rostos.png`): normal, olhos fechados (pisca e sono), feliz, surpreso, sem jeito e decidido. As 12 expressões antigas e as reações das lives caem nesses seis.
- **Balão** (`.iam-tela`, no fim de `iamiguinho.css`): a fala sai numa "tela" igual ao visor dele: vidro azul-escuro com cantos cortados, moldura de luz ciano, linhas de varredura, etiqueta "IAMIGUINHO mascote" presa no canto e um rabinho em raio. A fala aparece letra por letra. Vale para as aparições e para as telas vazias.
- **Lugares antigos:** `Figura` (em `IAmiguinho.tsx`) agora desenha o modelo 3D (`Boneco3D`) a partir dos mesmos nomes de antes (pose-* e cara-*): telas vazias, página não encontrada, erro, carregando, perfil dele (foto e Momentos), Preferências, Chegada e os overlays das lives. As placas com texto e os enfeites de época das imagens antigas não existem no 3D (ficaram só na reserva sem 3D).

## 12/11/2026 — Folga entre botões vizinhos no site todo

- Pedido do dono: botões lado a lado se sobrepunham na animação do hover ("Abrir a linha do tempo" e "Rever a jornada", e outros). Varredura: o mesmo acontecia no topo da página do jogo, no início, nos eventos, no álbum, nas Preferências e na linha do tempo.
- Regra geral no fim de `carga.css`: todo botão seguido de outro botão ganha 18px de folga à direita (8px no celular). É uma regra fraca (`:where`), então quem define a própria margem continua valendo.
- Busca da página Jogos em tela estreita: a lupa ficava fora do campo e o botão colado nele; a lupa agora fica dentro do campo e o botão tem 20px de distância (fim de `fresta.css`).
- O cartão "Linha do tempo" com uma foto só voltou a preencher a metade direita (a foto estava solta no meio).

## 12/11/2026 — Títulos de cartão com o retângulo ao lado e barra de progresso padrão

- Pedido do dono: todo título de cartão com o retângulo inclinado ao lado (muitos não tinham) e a barra de progresso da campanha igual à barra padrão do site.
- Os títulos pequenos em letra de máquina que não usavam `.kicker` ganharam o mesmo retângulo: `.jside__k` (Progresso nesta campanha, Como foi dia a dia, Bloco da campanha…), `.jx__k`, `.ff1__k` (fim de sessão) e `.jret__k2`. Regra no fim de `fresta.css`; título novo de cartão deve usar `.kicker` ou entrar nessa lista.
- A barra de progresso da campanha (aba Detalhes da Jornada) usa a classe padrão `.range` (linha laranja, marcador retangular) no lugar da bolinha de luz.

## 12/11/2026 — Jornada do jogo: cartão da linha do tempo, linha abaixo do título e botões do cabeçalho

- Cartão "Linha do tempo" (`.jtlcard`): com uma foto em pé o cartão ficava enorme; agora as fotos têm altura fixa (220px; 120px no celular) e a foto única fica à direita, recortada.
- Abaixo do título: plataforma / campanha / estado numa linha, e "X dias de jogo · tempo" sempre na linha de baixo, sem barra solta no começo.
- Botões do cabeçalho: mais folga entre eles (a ponta com a seta de um botão encostava no "Ações" nas animações). Quando o jogo tem mais de uma História, as abas ficam numa linha embaixo do título e os botões vão para a linha seguinte, à direita.
- Depois: o título do jogo fica sempre numa linha só (os botões vão para a linha de baixo, à direita; título comprido diminui a letra e termina em "…").
- Só CSS, no fim de `src/styles/jornada.css`.

## 12/11/2026 — IAmiguinho 3D no site: o modelo dos jogos, com ossos, e as aparições com balão

- Pedido do dono: trocar o IAmiguinho do site pelo modelo 3D dos jogos (`IAmiguinho_3D_Final.glb`, feito no Tripo); pintar de laranja as partes brancas embaixo da aba do boné; separar os pés; pôr ossos (rig) para animar; a hélice girar; e trocar as aparições em cartão pelo próprio modelo animado, com a fala num balão de diálogo (ideias dele: subir segurando a borda de baixo da tela, entrar andando, surgir de pixels).
- **Modelo** (scripts em `prototipos/iamiguinho-3d/preparo/`): aba pintada; hélice nivelada (veio inclinada 19°) e solta num osso próprio; emenda entre os pés cortada e pernas um pouco afastadas; 16 ossos (quadril, peito, cabeça, hélice, 3 por braço, 3 por perna) com pesos. A versão do site é leve (53 mil vértices, 1,7 MB, cores por vértice) em `public/modelos/iamiguinho.bin`.
- **Motor** `src/lib/iamiguinho3d.js` (WebGL puro, como o Zênite): animações parado, acenar, andar, comemorar, borda, dormir e tonto; o rosto é desenhado na tela pelo sombreador (olhos e boca de luz, pisca, olha para os lados, 12 expressões); os anéis dos fones brilham; "pix" desmonta ele em quadradinhos.
- **Aparição** `src/components/IAmiguinho3D.tsx` (`Aparicao3D`): três entradas sorteadas, "borda" (sobe pela borda de baixo até o peito, com as mãos na borda; no celular, em cima da barra de baixo), "andar" (vem de fora da tela pela direita e acena) e "pixels" (quadradinhos que se juntam). Balão de diálogo em cima dele, com × e Esc; some sozinho em uns 13 s; um toque assusta, cinco deixam tonto. Nos momentos de festa (zerou, página do álbum, voto no Awards) ele comemora. Com "reduzir movimento" aparece parado. Sem 3D no aparelho, cai no cartão antigo.
- `CameoBalao` e `Espiando` (em `IAmiguinho.tsx`) passaram a usar a aparição 3D. Na página `/iamiguinho` há "Chamar o IAmiguinho", com um botão para cada entrada.
- **Ainda no desenho antigo (2D):** as telas vazias (`MascoteVazio`), a página de perfil dele, as Preferências, a Chegada e os overlays das lives. Ficam para as próximas rodadas.
- O GLB completo corrigido para os jogos sai de `preparo/glb.py` (`IAmiguinho_3D_Rig.glb`, 35 MB, entregue ao dono na conversa; não fica no repositório): malha cheia, textura com a aba pintada, 22 ossos e a animação `helice_girando`. Ainda não foi aberto no Godot.

## 12/11/2026 — Cartão das notas: ajustes na análise

- O aviso ao lado de "Salvar análise" ficava escondido embaixo da ponta inclinada do botão e apagado: agora tem distância do botão (a ponta com a seta do botão passa 44px da borda), letra um pouco maior e cor mais clara (no celular vai para a linha de baixo). Mais espaço entre "Fechar a análise" e o título "Sua análise". Sem nota da comunidade e sem nota sua, o cartão ficou mais baixo (sem a linha vazia embaixo das barras).

## 12/11/2026 — Página do jogo: um cartão só para as notas, e a distribuição certa

- Pedido do dono: a média da comunidade com uma nota 9,5 aparecia na barra "10"; e os três cartões (comunidade, sua nota, dar nota + análise) ocupavam espaço demais e repetiam coisas.
- Agora é **um cartão só** (`.rate-card--uni`, `#analise`): à esquerda a comunidade (média, quantas notas, barras); à direita "Sua nota" com as barras para dar a nota na hora, o número em cima à direita e "Remover nota"; embaixo, o botão "Escrever análise" / "Ver sua análise", que abre a análise dentro do mesmo cartão. O "Escrever análise" do menu "…" abre essa parte. O cartão separado "Sua nota" saiu.
- Distribuição: a barra "9" junta 9 e 9,5, a "10" é só nota 10 e a "1" junta tudo abaixo de 2 (nas estrelas: 4★ = 4 e 4,5; 5★ = só 5). Precisa da **migração 0099** (coluna `dist10b` na `review_stats`, o dono roda no SQL Editor); sem ela, o site continua com as barras antigas.
- Depois de dar, mudar ou tirar a nota, a média da comunidade é buscada de novo. "análise(s)" virou "nota(s)" no contador, porque conta notas.

## 12/11/2026 — Página do jogo: a nota vale na hora, dá para tirar, e a análise vem embaixo

- Pedido do dono: enquanto arrasta, a nota aparece à direita; ao clicar/definir, a nota já vale (sem escrever e salvar a análise); opção de remover a nota; no cartão, primeiro "Sua nota" e embaixo "Sua análise".
- `NotaEditor` (em `src/pages/Game.tsx`): começa vazio (sem nota), o número acompanha o mouse/dedo (`onPreview` em `ScoreSlider` e `StarInput`) e a nota é gravada meio segundo depois da última mudança (arrastando, só onde parou). "Remover nota" apaga a nota; se houver análise escrita, pede uma segunda confirmação ("Tirar a nota e a análise junto" / "Manter"), porque a análise fica presa à nota.
- `AnaliseEditor`: título e texto opcionais com "Salvar análise"; só salva depois de ter nota. Com análise escrita, aparece a citação com "Editar".
- Nova ação `actions.removeReview` (`review.delete`, apaga a linha em `reviews`; a regra de acesso do banco já deixa cada pessoa apagar a própria).

## 12/11/2026 — Nota na página do jogo: mesmo texto e mesmo espaço nas duas escalas

- Pedido do dono: o texto da nota igual nas escalas até 10 e até 5 ("Arraste e clique para dar a nota") e o espaço entre as barras padronizado num meio-termo do espaço da escala até 10.
- As duas escalas agora têm 14px entre as barras (antes: ~28px na até 10, que esticava as barras na largura toda, e ~5px na até 5, que deixava as barras grudadas) e barras da mesma altura (36px). A dica embaixo da escala até 5 virou só "Dá para dar meio ponto."
- `GAP_NOTA` em `src/components/ScoreInput.tsx` (o tamanho das barras da escala até 10 é calculado com ele) e CSS no fim de `fresta.css`.

## 12/11/2026 — Awards: a linha de luz do voto passa abaixo do nome do jogo

- Pedido do dono: a linha de luz que aparece no meio da arte quando se vota agora passa logo abaixo do nome do jogo escolhido (os reflexos redondos acompanham).
- `alinharFlare` em `src/pages/Awards.tsx` conta de baixo para cima (o bloco do título fica preso no pé da cena; estúdio e dica embaixo do nome ficam numa linha só) e grava em `--fyb` na cena. Assim a linha já nasce no lugar certo, sem passar pelo meio nem pular enquanto o painel abre (o dono viu a linha indo para o meio e pulando na primeira versão, que media de cima para baixo). Mede de novo quando a janela muda de tamanho. CSS no fim de `awards-cena.css`. O resto do efeito do voto (barras pretas, flash, brilho) continua igual. A abertura e o banner da página inicial não mudaram.

## 12/11/2026 — Lobby dos Bugs: a opção do menu aprovada, no jogo

- O dono escolheu o efeito da opção do menu num artefato com opções (a MIX·2g: letra Tiny5, pontinhos dos dois lados, o tranco dos botões do site WinnerZ, borda que engrossa, palavra laranja itálica e em negrito, pulso no tranco e pulso leve, seta chevron de luz azul) e pediu para aplicar. Feito no repositório `winnerzbr/lobby-dos-bugs` (diretriz E11). Detalhes em `lobby-dos-bugs.md`.

## 12/11/2026 — Awards: textos pequenos maiores e com mais contraste

- Pedido do dono: dar mais visibilidade aos textos pequenos da página do Awards ("1 pessoa votou…", "Continuar votando", "Edições anteriores", "Seu voto: …", a descrição da categoria, o botão da próxima categoria, "Toque numa arte para votar" e o estúdio embaixo do nome do jogo).
- Fontes de 10–12 px para 12–14 px e cores mais claras. Sobre as artes, cada texto pequeno ganhou uma placa escura translúcida atrás (com desfoque), para não sumir quando a arte tem a mesma cor do texto. O nome do estúdio ganhou uma sombra mais forte.
- Só estilo, no fim de `src/styles/awards-cena.css`. Os efeitos da votação (barras pretas, flare, flash) não mudaram.

## 12/11/2026 — Logo do menu: dourado mais suave

- O dono achou o dourado exagerado. As cores do degradê ficaram mais perto do dourado claro antigo (#E2BE84): escuro `#F2DAAA → #E2BA78 → #C4975C`; O brilho em volta ficou mais fraco.
- No tema claro, o logo do menu é **preto** (degradê `#33373E → #16181C → #050607`, com brilho branco no hover), a pedido do dono. Tamanho e inclinação continuam iguais.

## 12/11/2026 — Logo do menu maior, mais dourado e inclinando com o mouse

- Pedido do dono: logo do menu principal um pouco maior e mais dourado, e no hover o mesmo efeito das capas dos jogos (muda de perspectiva conforme o mouse), mantendo a animação atual (o W e o Z se juntando).
- Tamanho: 66 → 76 px no computador, 54 → 62 no notebook pequeno, 46 → 52 no celular.
- Dourado de metal: `BrandMark` ganhou a opção `gold` (degradê do dourado claro em cima ao dourado fundo embaixo; cores em `--logo-g1/2/3`, mais escuras no tema claro). Só o menu usa.
- Hover: o logo inclina seguindo o mouse (até 16° para cima/baixo e 22° para os lados) e um brilho corre por dentro da forma do logo. Só com mouse; com "reduzir movimento" não inclina. Código em `Header.tsx` (`inclinaLogo`/`soltaLogo`) e estilos no fim de `fresta.css`.

## 12/11/2026 — Linha do tempo geral: todos os jogos do mês cabem na cena

- Pedido do dono: em outubro (13 jogos) o nome do mês ficava cortado no alto e sobrava um "+7"; todos os jogos têm que aparecer.
- Agora a cena mede o espaço que sobra embaixo do título e arruma as capas nele: até 6 jogos, uma fileira com nome e resumo embaixo de cada capa; com mais, as capas diminuem e vão em 2 a 4 fileiras, e uma linha embaixo mostra o nome e o resumo da capa sob o mouse (ou com foco). Sem "+N".
- O resumo do mês diz "zerou 4 jogos" quando são mais de dois, para não ocupar duas linhas.

## 12/11/2026 — Linha do tempo geral da Jornada em cenas, igual à do jogo (Lâmina)

- O dono escolheu o efeito **A · Lâmina** e pediu que, em vez dos botões ←/→ de mês, ficasse embaixo do carrossel **a mesma régua da linha do tempo do jogo**, com **as capas dos jogos centradas na linha**. "Tudo igual à linha do tempo dos jogos."
- Feito em `src/components/LinhaMeses.tsx` (usado por `GlobalTimelinePage` em `src/pages/Memory.tsx`), com as mesmas peças da Faixa em lâmina: cena por mês com o corte em lâmina, setas ‹ ›, "▶ Passeio", "Hoje", contador `08 / 09`, roda do mouse, arraste, deslizar no celular, setas do teclado, poeira dourada e fundo com a arte do mês.
- Cena do mês: ano (e "agora"), nome do mês grande, resumo ("3 jogos · 11 sessões · zerou X") e as capas dos jogos do mês no centro; cada capa leva à linha do tempo daquele jogo (ou à página do jogo, se só chegou à coleção).
- Régua: uma capa por mês centrada na linha (a do jogo principal do mês, com o número de jogos no canto); a do mês aberto fica maior e com borda dourada. Meses vazios no meio dão um espaço maior (raiz do tempo parado). Toca na capa ou na régua e vai ao mês. No celular a régua fica acima das setas, na largura toda.
- Saíram a lista por mês, a coluna "Ir para" e a legenda. Ficam: "Neste dia", os filtros e a gaveta "Sem data" embaixo.
- Estilos no fim de `src/styles/jornada.css` (`.lm`, `.lm-jg`, `.fx-ruler--capas`, `.lm-cap`).

## 12/11/2026 — Linha do tempo da Jornada (geral): prévia com nova organização e seis efeitos de carrossel

- Pedido do dono: dar à linha do tempo geral (`/jornada/linha-do-tempo`, hoje em lista) o mesmo tratamento da linha do tempo de cada jogo, com sugestões de organização e carrosséis com VFX.
- Prévia em `prototipos/linha-do-tempo-geral/index.html` (artefato https://claude.ai/artifact/APtkQCHJNib2YwsifsbKu2).
- **Organização sugerida:** topo com números (momentos, jogos, desde quando) no lugar da coluna "Ir para"; "rio do tempo" (uma barrinha por mês, altura = quanto jogou, toca e vai ao mês; ponto brilhante = Neste dia); carrossel com um mês por cena (nome grande, resumo do mês e os jogos em faixas que abrem ao passar o mouse/tocar e levam à linha do tempo do jogo); filtros numa barra e legenda num botão "?"; embaixo, "Neste dia" menor e a gaveta "Sem data".
- **Efeitos de troca de mês:** A · Lâmina (o mesmo da linha do tempo do jogo), B · Túnel, C · Rio de luz, D · Mosaico, E · Feixe, F · Ano em título (quadro com o ano gigante quando muda o ano).
- Aguardando o dono escolher. Nada aplicado no site.

## 12/11/2026 — Botão Compartilhar dos cartões no tamanho normal

- O dono achou o botão "Compartilhar" do Cartão da temporada grande demais, no computador e no celular.
- Os botões de compartilhar dos cartões (temporada, cartão da Jornada e recortes/capítulos) deixaram de ser do tamanho grande e não esticam mais: `Seasons.tsx`, `ShareCard.tsx`, `SnipShare.tsx` e `.share-card__opts` em `etapa2.css`.

## 12/11/2026 — Início: mais espaço entre a linha do horizonte e o "Neste dia"

- O dono achou o cartão "Neste dia · há 1 mês" colado na linha do tempo do Início. O espaço acima dele passou de 18 px para 30 a 48 px, conforme a largura da tela (`.page.hz-lemb` em `jornada.css`).

## 12/11/2026 — Revisão: itens 1, 5 e 6 feitos (site mais rápido, mais leve; ficha de jogo não lançado)

- O dono aprovou no documento da revisão ("faça") os três itens sem mudança visual.
- **1. Abertura mais rápida:** as ~20 conferências de quais migrações já rodaram (`src/data/supabaseAdapter.ts`) agora vão todas ao mesmo tempo, em vez de uma de cada vez. Mesmo resultado, ~2 s a menos em toda abertura.
- **5. Código mais leve:** 18 páginas pouco usadas passaram a baixar só quando alguém abre: Studio (e suas telas), overlay, administração e revelação do Awards, edições anteriores do Awards, museu e museu público, importar planilha e Steam, consoles, lixeira, vitrines, consertos, retrospectiva e recorte. Função `sobDemanda` em `src/App.tsx`.
- **6. Ficha de jogo que ainda não saiu:** sem Jornada começada, "Jogar agora" e "Já zerei" dão lugar à data, por exemplo "Sai em 19 nov · faltam 7 dias" (só o ano, se não houver data exata). Radar, desejos e o resto continuam. `src/pages/Game.tsx`, estilo `.ghero__sai` em `carga.css`.

## 12/11/2026 — Revisão completa do site (documento)

- Pedido do dono: revisão completa do site e o que melhorar. Feita no documento "WinnerZ: revisão completa do site" (https://claude.ai/artifact/HkMiRZcx4X2TaiVWkLafKy).
- Principais achados:
  - **Velocidade:** o Início aparece em ~3 s; ~2,2 s disso são 20 conferências do banco feitas em fila (`supabaseAdapter.ts`, linhas ~336-351). 54 pedidos ao Supabase por abertura.
  - **Peso:** código num arquivo só de 2,0 MB (68 páginas, só 9 sob demanda); estilo de 843 KB (etapa2.css com 557 KB e três visuais empilhados); pasta pública de 77 MB por versão, 68 MB do Jogos de Verão do navegador.
  - **Ficha de jogo não lançado** (GTA VI) mostra "Jogar agora" e "Já zerei".
  - **Modo claro:** Chegada nunca adaptada (40 cores claras fixas, nenhuma regra do modo claro).
  - **Segurança:** em ordem no código; falta Security Advisor do Supabase e cópia semanal dos dados.
  - **Pendências:** migração 0098 e teste das lives; teste do Awards com 19 categorias.
- A volta pelo site com login parou no meio (o computador do dono saiu do ar).
- Plano sugerido: agora (banco em paralelo, páginas sob demanda, ficha de não lançado, erro da IA em português simples, tirar Jogos de Verão da pasta se o dono concordar); antes da estreia (segurança, teste do Awards, lives, limpeza de estilos + modo claro); depois (cartão "Meus votos", QR na live, lembrete de voto, voto → Jornada, retrospectiva). Aguardando o dono.

## 12/11/2026 — Lobby dos Bugs: as salas do andar 1 na régua
- Cada sala do andar 1 com o seu clima (cor do escuro e luzes do teto), contorno completo nos móveis e chão calmo em todos os pisos (M1 tarefa 4). Detalhes no repositório do jogo.

## 12/11/2026 — Lobby dos Bugs: os chefões do andar 1 e os ataques únicos
- Robô de Spam repintado em 32 pontos e com golpes só dele; Troll do Chat com os golpes de fase dele (BAN HAMMER, RAID NO CHAT); o Servidor Touro com o tráfego; 6 bugs do andar 1 com golpes que deixaram de ser iguais. Detalhes no repositório do jogo (`docs/memoria/historico.md` e `ataques.md`).

## 12/11/2026 — Lobby dos Bugs: o andar 1 testado e o equilíbrio das armas

- No repositório `winnerzbr/lobby-dos-bugs`: tarefa 1 do M1 feita (o piloto jogou o andar 1, sem erros); o CD limitado, o mouse melhorado, o Ping recarrega mais devagar e as outras secundárias mais rápido. O que o dono notou jogando (inimigos no estilo Gungeon, jeitos novos de inimigo, dificuldade dos chefões) foi para o caderno e o plano.

## 12/11/2026 — Lobby dos Bugs: brilho dos tiros mais fraco

- No repositório `winnerzbr/lobby-dos-bugs`: o brilho dos tiros menor e mais fraco, contorno escuro nos tiros do IAmiguinho e a bala da pistola (e outros tiros miúdos) maiores.

## 12/11/2026 — Lobby dos Bugs: capangas caem com o chefão; ataques únicos

- No repositório `winnerzbr/lobby-dos-bugs`: os bugs que um chefão chama caem junto com ele; regra nova (D11): nenhum ataque reaproveitado entre inimigos e chefões, com a fila do que hoje se repete em `docs/memoria/ataques.md` e as tarefas no plano.

## 12/11/2026 — Lobby dos Bugs: o mapa do andar e os bugs que não ficam presos

- No repositório `winnerzbr/lobby-dos-bugs`: o item de mapa (mostra o andar e os ícones das salas sem entrar; sai como prêmio de sala) e os bugs grandes não nascem mais em cantinhos (e saem sozinhos se ficarem presos).

## 12/11/2026 — Lobby dos Bugs: tiros nítidos e o mapa do Gungeon

- No repositório `winnerzbr/lobby-dos-bugs`: o brilho dos tiros foi para baixo do desenho (o CD não parece mais uma bola de luz), os tiros do IAmiguinho redesenhados, o CD girando de verdade com ecos e quique de arco-íris; o mapa só mostra as salas visitadas (diretrizes D10 e C10).

## 12/11/2026 — Lobby dos Bugs: a 2ª leva das evoluções

- No repositório `winnerzbr/lobby-dos-bugs`: as 10 formas evoluídas que faltavam, desenhadas pelo Claude em 32 pontos a partir dos conceitos do ChatGPT mandados pelo dono, com golpes mais fortes e sons próprios. Os 14 bugs comuns agora evoluem (tarefa 2 do M1 pronta).

## 12/11/2026 — Lobby dos Bugs: o plano até a Steam

- No repositório `winnerzbr/lobby-dos-bugs`: `docs/plano.md` (etapas e marcos) e os pedidos de conceito para o ChatGPT.

## 12/11/2026 — Lobby dos Bugs: penumbra glitch e evolução dos inimigos

- No repositório `winnerzbr/lobby-dos-bugs` (diretrizes C7 e D9).

## 11/11/2026 — Lobby dos Bugs: tamanho por tipo, chibi oficial, ideia da evolução

- No repositório `winnerzbr/lobby-dos-bugs` (diretrizes D5 e B16; a evolução dos inimigos em `ideias.md`).

## 11/11/2026 — Lobby dos Bugs: 32 pontos confirmados, inimigos maiores, chão calmo

- No repositório `winnerzbr/lobby-dos-bugs` (diretrizes B14, B15 e D5).

## 11/11/2026 — Lobby dos Bugs: a régua do visual

- No repositório `winnerzbr/lobby-dos-bugs`: diretrizes B12 (a arte continua feita pelo Claude, sem ChatGPT nos desenhos) e B13 (a régua do visual, `docs/regua.md`); a sala vitrine refeita nela.

## 11/11/2026 — Lobby dos Bugs: chibi (teste), VFX e corpo vivo

- No repositório `winnerzbr/lobby-dos-bugs` (detalhes no histórico do jogo). Diretriz nova D8: VFX e animação o mais sofisticados possível.

## 11/11/2026 — Lobby dos Bugs: penumbra total, sons de cada inimigo, cadeiras sólidas

- No repositório `winnerzbr/lobby-dos-bugs` (detalhes no histórico do jogo). Duas diretrizes novas do dono: D7 (cada inimigo com os sons dele) e C9 (não andar por cima de cadeira e móvel; andar por trás dos objetos altos).

## 11/11/2026 — Lobby dos Bugs: revisão geral das sombras (1ª rodada)

- No repositório `winnerzbr/lobby-dos-bugs`: sombra nova em 32 pontos para tudo que se move (inclusive os tiros) e a sombra dos objetos do cenário com a forma de cada um. Detalhes no histórico do jogo.

## 11/11/2026 — Limpeza: jogos da coleção saem dos desejos e do Radar; botões ligados com texto escuro

- **Limpeza** (pedido do dono): os jogos que já estavam na coleção e continuavam na lista de desejos ou no Radar saem dos dois. Roda uma vez por conta, ao abrir o site com login (`actions.limparColecaoDesejos` em `src/data/store.ts`, marcada em `prefs.limpezaColecao1`). Depois disso, a regra do `addCopy` cuida; se a pessoa quiser, ainda pode pôr no Radar, de propósito, um jogo que já tem.
- **Botões com texto branco em fundo branco:** no visual Carga, os botões ligados (No radar, favorito, os marcados) ficam com fundo claro; o "No radar" da ficha do jogo vinha com texto âmbar e outros com texto branco. Agora todo botão ligado ou principal de fundo claro tem texto escuro (`src/styles/carga.css`). O botão âmbar ("agora") não mudou.

## 11/11/2026 — Coleção: jogo adicionado sai dos desejos e do Radar

- Pedido do dono: depois de adicionar um jogo à coleção, ele deve sair da lista de desejos e do Radar.
- Feito em `actions.addCopy` (`src/data/store.ts`), que é por onde passam todas as formas de adicionar no site: pelo nome, código de barras, foto, Chegada e estatísticas da coleção. Ao entrar o primeiro (ou outro) exemplar, o jogo sai dos desejos e deixa de ser acompanhado no Radar.
- Não mexi nos jogos que já estavam na coleção e nos desejos/Radar antes desta mudança; dá para fazer uma limpeza única se o dono quiser.

## 11/11/2026 — Adicionar à estante pela foto: ajustes no celular

- A chave nova da IA funcionou (leitura feita). O dono apontou, no celular: o quadro ficava "solto" e escorregava para os lados ao arrastar; arrastar em cima da foto não rolava a tela; botões desorganizados; e, depois da leitura, nada avisava, os resultados ficavam lá embaixo.
- Feito:
  - o quadro não escorrega mais para os lados (só rola para cima e para baixo);
  - a foto não segura mais o dedo: arrastar em cima dela rola a tela; no celular ela ficou mais baixa (até um terço da tela);
  - os dois botões ocupam a largura toda: lado a lado em telas médias, um embaixo do outro em celular estreito (até 440 px): "Tirar foto" (ou "Outra foto") e "Da galeria";
  - depois da leitura aparece "Li 1 jogo · confira abaixo ↓" em cima da foto e a tela desce sozinha até "Confira antes de adicionar".
- Código: `PhotoRead` em `src/components/CameraAdd.tsx`, `onGames` em `src/components/AddGameDialog.tsx`, estilo no fim de `src/styles/etapa2.css`.

## 11/11/2026 — Chave da IA: servidor limpa a chave e mensagem mais clara

- Depois de trocar a chave, o dono ainda viu "A chave da IA no servidor foi recusada". O último deploy de produção tinha sido às 18h08, antes de a chave nova ser criada (18h14): a Vercel só passa a usar uma variável nova depois de um deploy novo.
- Este envio já gera um deploy novo, que lê a chave atual.
- O servidor passou a limpar a chave antes de usar (tira espaços, quebras de linha e aspas coladas por engano), em `reconhecer`, `retomada`, `iamiguinho` e `pontes` (função `chaveIA`).
- A mensagem de erro agora diz qual é o caso: chave com formato errado (não começa com `sk-ant-`) ou chave recusada (vencida, apagada ou ainda não ativa), sempre com o passo seguinte. A chave nunca aparece em mensagens nem em logs.

## 11/11/2026 (18h30): Lobby dos Bugs — memória reorganizada
- Diretrizes numeradas em `docs/memoria/diretrizes.md` (repositório do jogo), instruções enxutas e conferência automática de tudo.

## 11/11/2026 — Troféu: toco nas costas tirado; banner do Início girando devagar; texto da faixa do Zênite legível

- **Toco nas costas:** a "lasca" que continuava aparecendo era um pedaço da própria bandeira que ficou grudado nas costas depois do corte de hoje (uns 8 cm, parado, atravessado pela bandeira quando ela balança). Foi tirado e o furinho no corpo fechado (`prototipos/awards-cena/preparo/tirar_toco.py`). Novos `public/modelos/zenite.bin` (site) e `prototipos/awards-cena/zenite.bin` (prévia).
- **Banner do Início:** o dono achou o giro rápido demais e de perfil. Agora vai só até um 3/4 leve (uns 20° para cada lado) e bem devagar (uns 20 s de um lado ao outro).
- **Como funciona:** o texto da faixa "A revelação" estava difícil de ler por cima do troféu. O troféu foi um pouco para cima e para a direita, e a sombra de baixo ficou mais forte nessa faixa.

## 11/11/2026 (19h): Lobby dos Bugs — level design e inimigos únicos
- Portas livres, regras de lugar, transparência dos objetos altos, penumbra, arenas próprias dos chefões, tiros únicos.

## 11/11/2026 — Awards, Como funciona: Zênite na terceira faixa e linha de luz atrás

- Pedido do dono: na aba Como funciona, pôr o Zênite na terceira imagem ("A revelação"), estático e com zoom, e a linha do horizonte atrás de tudo.
- A terceira faixa mostra o troféu de perto (da cintura para cima, com a bandeira), sobre fundo grafite. A câmera fica parada; só a bandeira balança. Carrega quando a aba abre.
- A linha de luz agora passa por trás dos textos e do troféu (continua por cima das artes dos jogos, para seguir visível).

## 11/11/2026 — Início: troféu do banner maior e girando sozinho entre os dois 3/4

- Pedido do dono: no banner do Início, troféu com zoom maior (ocupando mais o banner) e sem seguir o mouse; ele gira sozinho até ficar em 3/4, volta e fica em 3/4 do outro lado, e assim por diante.
- Feito: câmera bem mais perto: o troféu aparece cortado, dos joelhos para cima (mão erguida e bandeira inteiras; base e pés ficam fora), depois que o dono viu que ainda aparecia inteiro e área do troféu maior (metade direita). O giro vai de uns 45° para um lado a uns 45° para o outro, segurando um pouco em cada ponta; uma ida leva uns 10 segundos. Com "reduzir movimento", fica parado em 3/4.
- O mouse não mexe mais no troféu do banner (na aba do troféu, na página do Awards, continua dando para girar arrastando).

## 11/11/2026 — Início: troféu do banner em close

- Pedido do dono: no banner do Awards no Início, dar mais zoom no troféu para ele ocupar mais o banner.
- A câmera chegou perto: o troféu aparece dos joelhos até a ponta da bandeira, ocupando a altura do banner, na metade direita. Continua girando com o mouse.

## 11/11/2026 — Awards: abertura com brilho menor, fundo grafite e partículas

- Pedido do dono: no banner do título do Awards o brilho estava estourado e o fundo simples demais (todo preto). Pediu brilho menor, partículas no fundo e um fundo mais grafite atrás da figura.
- Feito na abertura da página do Awards e, do mesmo jeito, no banner do Awards no Início:
  - troféu menos estourado (luz do ouro reduzida);
  - atrás da figura, uma mancha grafite (cinza-escuro) com um toque dourado bem fraco, no lugar do clarão dourado forte;
  - partículas de poeira dourada (algumas brancas e azuladas, poucas maiores e desfocadas) subindo devagar, mais concentradas em volta do troféu. Com "reduzir movimento", ficam paradas; o desenho pausa fora da tela.
- As partículas são um movimento contínuo de fundo, aberto como exceção a pedido do dono, só no Awards (como os efeitos da cena de voto).
- Código: `Particulas` em `src/components/AwardsCena.tsx`; fundos `.aw2op__bg` e `.awbn__bg` em `src/styles/awards-cena.css`.

## 11/11/2026 — Troféu: lasca nas costas corrigida

- O dono viu uma lasca saindo das costas do troféu.
- Causa: na versão leve do modelo (a do site), ao juntar vértices vizinhos para diminuir o arquivo, alguns pontos do pano (que balança) foram juntados com pontos do corpo (que fica parado), perto do ombro de trás. Esses triângulos esticavam quando a bandeira se mexia.
- Correção: o preparo do modelo (`prototipos/awards-cena/preparo/bake5.py`) não junta mais pontos com movimento diferente. Novo `public/modelos/zenite.bin`. Conferido com `preparo/stretch.py`, que simula o vento e procura triângulos que esticam: zero.

## 11/11/2026 — Adicionar à estante: abas sem texto cortado no celular; chave da IA recusada

- O dono mandou print do celular: as abas "Código de barras" e "Foto das capas" apareciam cortadas, e a leitura por foto deu "A chave da IA no servidor foi recusada".
- **Abas:** agora as três dividem a largura do quadro; em telas estreitas (até 560 px) aparecem como "Nome", "Código" e "Foto" (para quem usa leitor de tela continua o nome inteiro). Código em `src/components/AddGameDialog.tsx` e `src/styles/carga.css`.
- **Chave da IA:** a mensagem quer dizer que a chave da Anthropic cadastrada na Vercel (`ANTHROPIC_API_KEY`) foi recusada (apagada, expirada ou trocada). Só o dono resolve: criar uma chave nova em console.anthropic.com e colar direto na Vercel (Settings → Environment Variables), depois fazer um novo deploy. Nunca colar a chave na conversa. A mesma chave é usada pela leitura por foto, pela Retomada, pelo IAmiguinho e pelas pontes das lives; todas voltam a funcionar com a chave nova.
- A tentativa que falhou não gasta leitura do mês (o servidor devolve o uso quando a IA recusa).
- Provável causa: a chave antiga tinha prazo de validade. Ao criar a nova (nome `winnerz-site`, espaço de trabalho padrão), a recomendação foi escolher sem validade, ou a validade mais longa possível; com prazo, ela volta a parar sozinha no fim dele.

## 11/11/2026 — Início: banner do Awards só segue o mouse em cima dele; botão Votar com animação

- O dono notou: o troféu girava mesmo com o mouse fora do banner, e o botão Votar não tinha a animação de passar o mouse.
- Agora o troféu só segue o mouse enquanto ele está sobre o banner; ao sair, volta a balançar sozinho em pouco mais de um segundo.
- O botão Votar virou um botão de verdade por cima do banner (antes ficava atrás do link invisível que cobre o banner e não recebia o mouse), então a animação de sempre funciona.

## 11/11/2026 — Início: banner do WinnerZ Awards com o troféu girando conforme o mouse

- Pedido do dono: o cartão do Awards no Início ocupa toda a largura normal do site, com um banner de fundo que cobre o cartão inteiro (bordas incluídas), interativo, com o troféu girando conforme o mouse.
- Feito: o aviso saiu da coluna "Próximo" e virou um banner na largura da página, logo antes de "O que jogar". Fundo escuro de ponta a ponta (sem borda), luz dourada e risco de luz atrás, troféu Zênite 3D à direita.
  - No computador o troféu gira para acompanhar o mouse (esquerda e direita giram, cima e baixo inclinam um pouco). Sem mouse por uns segundos, ele balança devagar sozinho. No celular, gira arrastando o dedo no banner (a rolagem da página continua).
  - Texto: selo da fase, nome da edição, até quando vai a votação, contagem regressiva e o botão Votar (ou Ver, na apuração). O banner inteiro leva para a página do Awards.
  - Aparece nas mesmas fases de antes (votação aberta e apuração). O troféu só carrega quando o banner aparece na tela.
- Código: `AwardsBanner` em `src/components/AwardsCena.tsx`; `AwardsNotice` em `src/pages/Home.tsx`; estilo `.awbn` no fim de `src/styles/awards-cena.css`.

## 11/11/2026 — Jornada: cartão "Lembra disso?" corrigido na coluna lateral

- O dono mostrou o cartão "Lembra disso?" desconfigurado na página da Jornada: foto à esquerda espremendo o texto em colunas de uma palavra e "Ver na linha do tempo" por cima do título.
- Causa: quando o cartão tem foto, a regra de três colunas (foto de 168 px, texto, link) vencia a regra da coluna lateral. Agora, na lateral, o cartão fica sempre em pé: foto em cima (150 px), texto embaixo e o link por último. Vale também para o "Neste dia". Em `src/styles/jornada.css`.

## 11/11/2026 — Awards: página adaptada ao modo claro

- Pedido do dono: adaptar a página do Awards ao modo claro.
- No modo claro a página fica clara (fundo, abas, "Seus votos", títulos de seção, lista de categorias com contorno cinza, botões da organização). As cenas continuam escuras, como fotos: abertura com o troféu, carrossel dos indicados, troféu 3D, sol do "Por que Zênite" e Como funciona (classe `on-photo` em cada cena, não mais na página inteira).
- No modo escuro nada muda.

## 11/11/2026 — Awards: textos das faixas do carrossel na largura normal do site

- O dono pediu o mesmo para o carrossel dos indicados: os textos da faixa de cima (nome da categoria, "1 de 2", "Toque numa arte para votar") e da faixa de baixo (descrição da categoria e o botão da próxima) agora se alinham com a coluna central do site. O carrossel continua de ponta a ponta. No celular nada muda.

## 11/11/2026 — Awards: textos das faixas da abertura na largura normal do site

- O dono pediu que os textos das faixas pretas da abertura ("← Eventos", "Votação até…", a frase da fase e "Continuar votando →") fiquem na largura normal do site, e não nas pontas da tela.
- Eles agora se alinham com a coluna central (a mesma das abas e da lista). A abertura continua de ponta a ponta; só esses textos mudaram de lugar.

## 11/11/2026 — Awards: ao abrir uma categoria, a tela centraliza no carrossel

- Pedido do dono: centralizar a tela no carrossel também quando a pessoa clica na categoria.
- Vale para todo jeito de abrir uma categoria: tocar no nome dela, tocar num quadro de "Seus votos", o botão "Começar a votar" da abertura e o botão da próxima categoria dentro da cena.
- Como a categoria aberta antes se fecha ao mesmo tempo, a conta já desconta a altura dela, para a tela parar no lugar certo de primeira.
- O deslize é feito quadro a quadro (`deslizar`), em 0,9 s, porque a página ainda está crescendo enquanto o carrossel abre; o deslize comum do navegador parava antes da hora nas últimas categorias. Se a pessoa rolar a página no meio do caminho, o deslize para.
- Código: `abrir`, `centralizarCena` e `deslizar` em `src/pages/Awards.tsx`.

## 11/11/2026 — Awards: abertura em telas largas e linha de luz atrás

- O dono mandou um print num monitor bem largo (2.535 px): o título ficava colado na esquerda e o troféu na direita. Pediu para aproximar os dois do centro, sem centralizar demais, e para a linha do horizonte (o risco de luz) ficar atrás de tudo.
- **Telas largas:** acima de 1.600 px de largura, o título vem para a direita e o troféu para a esquerda, aos poucos, conforme a tela alarga (em 2.535 px: título a uns 350 px da borda, troféu a uns 66% da largura). Até 1.600 px nada muda. A luz dourada do fundo acompanha o troféu.
- **Linha de luz:** na abertura ela e os reflexos passaram para trás do troféu e do título. Na cena de voto continua na frente, como sempre.

## 11/11/2026 — Awards: ao votar, a tela centraliza no carrossel

- Pedido do dono: quando a pessoa clica no jogo para votar, a tela deve centralizar no carrossel.
- Ao votar (ou tirar o voto), a página desliza até a cena daquela categoria ficar no meio da área livre da tela, abaixo do menu e das abas. Se a cena for mais alta que a área livre, o topo dela encosta logo abaixo das abas. Com "reduzir movimento" ligado, a tela pula direto, sem deslizar.
- Código: `centralizarCena` em `src/pages/Awards.tsx`.

## 11/11/2026 — Awards: só a abertura e o carrossel em largura total; carrossel não encolhe ao votar

- O dono corrigiu o pedido anterior: **só o título (abertura) e o carrossel dos indicados** ocupam a tela de ponta a ponta. Abas, títulos de seção, lista de categorias, aba do troféu e Como funciona voltaram para a coluna central (1320 px).
- **Carrossel não encolhe ao votar (celular):** no celular a cena ficava mais baixa depois do voto, porque as artes não escolhidas encolhem. Agora a cena guarda a altura de antes e a arte escolhida ocupa o espaço liberado. Vale só para a cena dentro da lista do Awards (`.aw2slot`); o estilo geral da cena não mudou.
- **No computador:** a cena tinha altura fixa, mas ao votar entram as faixas pretas de cinema (80 px em cima e embaixo) e a imagem dos indicados ficava 160 px mais baixa. Agora, dentro da lista do Awards, a cena cresce esses 160 px junto com as faixas, e a imagem continua da mesma altura. As faixas e os outros efeitos continuam iguais.

## 11/11/2026 — Awards: abertura em largura total, só com o título

- O dono viu no site que o título passava por cima do troféu e pediu mais espaço horizontal, só com o título.
- A abertura agora ocupa a tela de ponta a ponta (saiu de dentro da coluna central). O título fica só na metade esquerda e o troféu na metade direita, sem se cruzarem.
- Na cena ficaram só o selo da fase, o título e a contagem regressiva. A frase da fase desceu para a faixa de baixo da cena; o texto de apresentação da edição passou para logo abaixo da abertura.
- No celular continua igual: troféu em cima, título embaixo.
- Logo depois o dono pediu o mesmo para o resto: **toda a página do Awards usa a largura inteira da tela** (abas, títulos, lista de categorias, a cena com os indicados para votar, a aba do troféu e Como funciona). Só sobra uma margem lateral pequena. Os efeitos da cena de voto são os mesmos; ela só ficou mais larga.

## 11/11/2026 (15h30): Lobby dos Bugs — ritmo, 1ª rodada
- Personagem mais rápido, inimigos mais ativos e em menor número (detalhes no repositório do jogo).

## 11/11/2026 — Awards: página nova aplicada no site (para o dono testar)

- Pedido do dono: aplicar no site o que foi aprovado na prévia, para ele ir testando.
- **O que entrou em `/eventos/awards`:**
  - três abas que grudam abaixo do menu: Votação, Troféu Zênite e Como funciona (endereços `#trofeu` e `#como`);
  - abertura em cena única com o troféu Zênite em 3D no fundo, título da edição, contagem regressiva, frase da fase e os botões de sempre (entrar para votar, começar ou continuar a votar, links da organização);
  - "Seus votos": um quadro por categoria, que acende quando há voto (tocar no quadro leva à categoria);
  - categorias em "Lista grande": tocar numa categoria abre os indicados logo abaixo dela. Fora do resultado, só uma fica aberta por vez; no resultado, todas começam abertas;
  - aba Troféu Zênite: o troféu para girar, as quatro partes (figura, símbolo, base, logo) e "Por que Zênite" com o sol interativo;
  - aba Como funciona: três faixas, com artes de indicados ao fundo.
- **A cena de voto não mudou:** o mesmo código e o mesmo estilo de antes, só passou a morar dentro da lista.
- **Ficou de fora por enquanto:** "Quem já levou" (os pedestais), para não haver risco nenhum de mostrar resultado antes da hora.
- **Arquivos:** `src/pages/Awards.tsx` (página), `src/components/AwardsCena.tsx` (troféu, sol, como funciona), `src/lib/zenite3d.js` (desenho 3D), `src/styles/awards-cena.css`, `public/modelos/zenite.bin` (modelo leve, 3,5 MB; a prévia usa o de 8 MB). O modelo leve é feito por `prototipos/awards-cena/preparo/bake5.py`, que junta vértices vizinhos sem misturar os dois lados do pano.
- O estilo antigo do topo (`awhero`, `awbar`, `awrow`) continua em `etapa2.css` sem uso na página; pode sair numa limpeza futura.
- **Não deu para testar aqui antes de publicar** (o ambiente não monta o site); a conferência é no site no ar.

## 11/11/2026 — Awards: aba Troféu Zênite no celular com o troféu à direita (prévia)

- O dono viu no celular que o troféu ficava atrás do texto na aba Troféu Zênite e pediu para colocá-lo à direita.
- No celular (telas até 760 px): o troféu ocupa a metade direita do painel e o texto fica embaixo, à esquerda, em coluna estreita; o painel ficou mais alto (500 px) e o troféu inteiro aparece um pouco mais afastado para a bandeira não cortar ao girar. No computador nada mudou.
- Nada aplicado no site ainda.

## 11/11/2026 — Awards: "Por que Zênite" fica com o efeito A (o sol sobe), agora interativo (prévia)

- O dono escolheu o efeito **A · O sol sobe** e pediu uma forma interativa. Os outros quatro efeitos saíram da prévia.
- **Como funciona:** a pessoa leva o sol pelo arco do céu.
  - No computador o sol segue o mouse; no celular, arrasta-se com o dedo (rolar a página para cima e para baixo continua funcionando); no teclado, setas, Home e End.
  - O número de graus acompanha o sol (0° no horizonte, 90° no topo) e há uma régua à direita. Conforme o sol sobe, o céu clareia e as estrelas somem. Passando do topo, o sol desce do outro lado.
  - Perto do topo o sol "encaixa" no ponto mais alto: acende o risco de luz da votação, aparece "ZÊNITE · O PONTO MAIS ALTO" e o título do texto ganha brilho dourado.
  - Quando o bloco aparece, o sol sobe sozinho até uns dois terços, como convite. Não há animação em repetição: tudo para quando o sol para.
- Texto do bloco: o mesmo da entrada anterior.
- Nada aplicado no site ainda.

## 11/11/2026 — Awards: "Por que Zênite" com texto novo e cinco efeitos para escolher (prévia)

- Pedido do dono: melhorar a explicação (zênite é o ponto mais alto do céu; o troféu tem esse nome porque é o ponto mais alto que o jogo chega ao ganhar) e criar exemplos de efeitos que demonstrem o zênite.
- **Texto novo:** "O mais alto que um jogo chega. Zênite é o ponto mais alto do céu: aquele que fica bem acima da sua cabeça. O troféu tem esse nome porque é o ponto mais alto que um jogo alcança no WinnerZ Awards. Quem leva o troféu chegou ao zênite."
- **Cinco efeitos** no bloco "Por que Zênite" da aba do troféu, com seletor (cada um toca uma vez; tocar na cena repete; com "reduzir movimento" aparece só o quadro final):
  - A · O sol sobe: a luz sobe em arco do horizonte até 90°, com a marcação dos graus;
  - B · Reto para cima: do ponto "você", a luz sobe em linha reta contando os graus até 90°;
  - C · Coluna de luz: um feixe com faíscas sobe do chão até o topo;
  - D · Olhando para o alto: rastros de estrelas girando em volta de um ponto fixo, o zênite;
  - E · Só um chega lá: nove luzes sobem, só uma alcança a linha do zênite (sem nomes, não revela nada).
- Em todos, a chegada ao zênite acende o mesmo risco de luz da votação.
- Aguardando o dono escolher o efeito. Nada aplicado no site ainda.

## 11/11/2026 (15h): Lobby dos Bugs — perspectiva dos objetos e ilhas no meio da sala
- Regra nova do dono: objeto de pé, com o pé no chão (base reta, sombra colada).
- Passo 2 feito: 5 objetos grandes no meio das salas do salão (sinuca, hóquei de ar, ilha de PCs, pódio, mesa de tabuleiro). Próximo: paredes com níveis de arredondamento.

## 11/11/2026 — Awards: bandeira solta da figura e logo nítido dentro da base (prévia)

- Pedidos do dono: tirar a parte da bandeira que estava grudada na figura; diminuir o desvio da luz só na região do logo da base.
- **Bandeira:** no modelo original a bandeira era colada nas costas da figura por um ponto pequeno (uns 2 cm na escala do modelo). Na versão preparada para a web esse ponto foi cortado e os dois furos foram fechados. Agora a bandeira só se prende no mastro e balança inteira, cada vez mais forte em direção às pontas. O arquivo `.glb` original do dono não foi alterado.
  - Como é feito: o programa acha o caminho mais estreito que liga a bandeira ao corpo sem passar pelo mastro e corta ali (`prototipos/awards-cena/preparo/cut2.py`).
  - Cuidado para o futuro: o modelo original já tem bordas abertas (2.536 arestas); só os furos criados pelo corte devem ser fechados. Fechar os outros estraga a bandeira.
- **Logo:** o desvio e os brilhos das facetas diminuem perto do logo, que agora aparece nítido através do diamante.
- Segue pendente: deixar o arquivo do modelo mais leve antes de ir para o site. Nada aplicado no site ainda.

## 11/11/2026 (14h30): Lobby dos Bugs — passo 1 dos objetos maiores e diretriz das sombras
- Lixeiras, caixas, pilhas, pufes e mesinha maiores e com volume (commit 91b6e8f em `winnerzbr/lobby-dos-bugs`).
- Diretriz geral nova do dono: caprichar nas sombras de tudo no jogo (em `CLAUDE.md` do jogo). Para depois: variedade de tamanho nos inimigos.

## 11/11/2026 — Awards: base de diamante transparente e mais vento na bandeira (prévia)

- Pedido do dono: melhorar a base de diamante (principalmente transparência e refração da luz) e dar mais movimento à bandeira.
- **Base:** agora é transparente de verdade. O que está atrás ou dentro dela (pés da figura, logo) aparece através do diamante, deslocado e com as bordas coloridas (a luz se separa em cores, como num prisma). As facetas acendem e apagam conforme a câmera gira. Onde não há nada atrás, a base deixa ver o fundo da página.
  - Como é feito: o ouro é desenhado primeiro numa imagem guardada; o diamante é desenhado por cima, lendo essa imagem com desvio por faceta.
- **Bandeira:** onda maior e mais rápida, com uma tremida fina nas pontas; a área que se mexe ficou maior (o movimento chega ao máximo mais perto do mastro).
- **Abertura:** o enquadramento desceu um pouco para a base aparecer inteira.
- Segue pendente: deixar o arquivo do modelo mais leve antes de ir para o site. Nada aplicado no site ainda.

## 11/11/2026 — Awards: o troféu Zênite de verdade entrou na prévia, com a bandeira em movimento

- O dono mandou o modelo 3D atual do troféu (`WinnerZ_Awards_Novo_Trofeu_Materiais.glb`, 10,5 MB) e perguntou se dá para fazer, por código, um modelo mais detalhado e com movimento na bandeira.
- **Como o troféu é de verdade** (corrige descrições antigas de "figura lapidada, mastro de cobre e mármore negro"):
  - figura esculpida em ouro, de braço erguido, com manto ao vento, segurando o mastro com a bandeira (tudo em ouro, numa peça só);
  - na bandeira, o símbolo da Jornada em prata polida, dos dois lados;
  - base de diamante transparente;
  - logo WinnerZ em ouro, em relevo na frente da base.
- **Resposta dada:** esculpir por código uma figura mais detalhada que essa não dá; o modelo dele já é muito mais detalhado do que qualquer coisa montada em código. O que o código faz bem: usar o modelo dele, dar movimento ao pano, cuidar de luz e reflexos, e refazer peças geométricas (base, mastro, logo).
- **Feito na prévia** (`prototipos/awards-cena/`): a abertura e a aba Troféu Zênite usam o modelo real.
  - A bandeira e as pontas do manto balançam ao vento. O corpo, o mastro e as mãos ficam parados. Com "reduzir movimento" ligado, tudo fica parado.
  - Como o modelo é uma peça só, o pano foi separado por código: marca-se o que é fino (pano) e o movimento cresce conforme a distância de onde o pano encosta no corpo ou no mastro. Scripts em `prototipos/awards-cena/preparo/`.
  - O modelo vai num arquivo próprio (`zenite.bin`, 8 MB), carregado pela página.
  - As quatro partes da aba passaram a ser as reais: A figura, O símbolo, A base, O logo.
- **Pendente antes de ir para o site:** deixar o arquivo do modelo mais leve (meta: 2 a 3 MB) para não pesar no celular nem no limite do Vercel; melhorar o brilho da base de diamante, que na prévia ainda parece vidro escuro; os textos das partes são sugestões e o dono pode trocar.
- Nada disso foi aplicado no site ainda.

## 11/11/2026 — Awards: abertura escolhida (F · Uma imagem) com o troféu Zênite

- O dono escolheu a abertura **F · Uma imagem**: uma imagem só, em tela cheia, com o título por cima. As outras cinco opções saíram da prévia.
- Decisão: a imagem de fundo da abertura é o **troféu Zênite**, numa imagem bonita e estilosa.
- Na prévia (`prototipos/awards-cena/index.html`) o fundo já mostra o troféu: enquadramento de baixo para cima, dos joelhos até a bandeira, à direita do título (no celular fica em cima e o título embaixo), com luz dourada atrás. A bandeira balança e a câmera se move devagar; com "reduzir movimento" ligado, fica parado.
- O troféu da prévia é o modelo 3D simplificado feito em código, não a arte oficial. Falta a imagem ou o modelo oficial do Zênite para a versão final.
- Nada disso foi aplicado no site ainda.

## 11/11/2026 — Awards: seis opções de abertura na prévia

- Pedido do dono: mais exemplos de abertura para a página do Awards.
- A prévia (`prototipos/awards-cena/index.html`) ganhou um seletor acima da abertura com seis opções, todas na linguagem da cena de votação e sem "fantasia" temática:
  - A · Cena (a atual: faixas, a do meio abre com o título);
  - B · Título gigante (nome em contorno que se enche de luz);
  - C · Dividida (texto de um lado, imagem do outro, risco de luz vertical no meio);
  - D · Contagem (contagem regressiva enorme como protagonista);
  - E · Três linhas (três frases que entram uma por vez);
  - F · Uma imagem (uma imagem só, tela cheia, com o título).
- Aguardando o dono escolher a abertura. Nada disso foi aplicado no site ainda.

## 11/11/2026: Awards, categorias: escolhida a "Lista grande" (B), com os indicados abrindo embaixo
- O dono **escolheu a B · Lista grande** para as categorias do Awards: os 19 nomes empilhados, enormes, em contorno; no mouse (e depois de votar) o nome se enche de branco.
- Pedido junto: ao clicar numa categoria, os indicados devem **abrir logo abaixo dela**, expandindo a página ali (não no topo).
- Prévia atualizada (`prototipos/awards-cena/index.html`, republicada): só a Lista grande, sem seletor; a cena de votação abre embaixo da categoria tocada, com a página se expandindo; tocar de novo fecha; abrir outra fecha a anterior; "próxima categoria →" abre a seguinte.
- **Ainda não aplicado no site.** Falta ele confirmar o conjunto (abertura, lista, aba Zênite, Como funciona) e mandar o modelo ou a imagem oficial do troféu.

## 11/11/2026: Awards, categorias: saem as opções temáticas, entram formas sem tema (prévia)
- O dono mandou tirar todas as opções menos a A (Cartelas) e criar novas **sem tema** (nada de rolo de película, claquete, ingresso etc.): quer só formas bonitas e estilosas.
- Regra: no Awards, não dar "fantasia" temática aos elementos; o estilo vem de tipografia, proporção e movimento.
- Prévia (`prototipos/awards-cena/index.html`, republicada) com seis opções: A Cartelas; B Lista grande (nomes enormes em contorno que se enchem); C Mosaico (blocos de tamanhos diferentes, Jogo do Ano maior); D Índice com destaque (lista de um lado; do outro, a categoria em foco com número gigante); E Degraus (barras inclinadas em escada, que invertem para branco); F Números (grade de números grandes). Falta ele escolher.

## 11/11/2026: Awards, seis jeitos de mostrar as categorias (prévia, aguardando escolha)
- O dono gostou das cartelas ("Bacana") e pediu mais sugestões de apresentação das categorias.
- A prévia (`prototipos/awards-cena/index.html`, republicada) ganhou um seletor acima da lista, com seis opções que trocam na hora: A Cartelas; B Créditos de filme (lista centrada, nome grande); C Rolo de película (faixa de lado, com os furos do filme); D Claquete (tabela "Cena 01 · categoria · situação"); E Ingressos (canhoto com número e carimbo "VOTADO"); F Uma por vez (uma categoria grande por tela, com número gigante).
- Em todas, tocar abre a cena de votação no palco único. Falta ele escolher.

## 11/11/2026: Awards, categorias viram cartelas (prévia)
- O dono viu a prévia no estilo da votação e pediu: as categorias devem ser apresentadas de **forma diferente da cena de voto**, porque com o mesmo efeito (tiras de arte que abrem) confunde.
- Na prévia (`prototipos/awards-cena/index.html`, republicada): a lista virou uma grade de **cartelas de título** só com número, nome e situação ("Votar →" ou "Seu voto: …"), sem tiras de arte. No mouse, só um fio de luz no alto da cartela. Tocar abre a cena de votação num palco único acima da grade. Cartela votada ganha o fundo da arte escolhida, escurecido, e fica em âmbar.
- Regra: o efeito de tiras que abrem em tela larga fica reservado para o voto (e para a abertura e o troféu); listas e menus do Awards usam cartelas.

## 11/11/2026: Awards, nova direção: a página inteira no estilo da cena de votação
- O dono **não gostou de nenhuma** das cinco direções com VFX (Cerimônia, Ascensão, Forja, Constelação, Contagem). Quer efeitos **parecidos com os de quando se vota num candidato**.
- Regra para o Awards daqui em diante: usar a linguagem da cena de votação (tiras de arte em preto e branco, a escolhida abre em tela larga e ganha cor, zoom lento, risco de lente azul/branco/âmbar, luz âmbar vazando, granulado, faixas pretas, clarão, título que chega com as letras se juntando, rótulos em mono). Nada de partículas, fumaça ou fundos de outro estilo.
- Prévia nova: "WinnerZ Awards · página no estilo da votação", https://claude.ai/artifact/V9Vfrk9tXUxLtKqWCYh1TN. Fonte em `prototipos/awards-cena/index.html`. O CSS da cena foi copiado de `src/styles/etapa2.css` (`.scene…`).
  - Abertura: a mesma cena, com o título "WinnerZ Awards" e a contagem no lugar do voto; "Rever a abertura".
  - Seus votos: 19 quadros de filme que acendem com o clarão.
  - Categorias: cada linha é uma tira que abre no mouse (faixas pretas, cor, risco de lente); tocar abre embaixo a cena de votação de hoje, sem mudança.
  - Aba Troféu Zênite: a mesma cena com o troféu 3D no painel aberto e as quatro partes como tiras; "Por que Zênite" com o risco de lente subindo; pedestais lacrados.
  - Aba Como funciona: três tiras.
- Não testado em navegador. Aguardando a opinião dele.

## 11/11/2026 (tarde): Lobby dos Bugs, coesão e móveis sorteados
- Regras do dono: coesão das paredes dentro da sala e tudo o que for criado entra no sistema de variedade. Feito: neons em 9 formas, 17 móveis sorteados encostados na parede e 4 tapetes. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 11/11/2026: prévias do Awards com VFX, ajuste de tela
- O dono mandou uma captura: os fundos em WebGL funcionam, mas o título saía cortado (grande demais, quebrando em várias linhas e passando por baixo do menu).
- Corrigido em `prototipos/awards-vfx/index.html` e republicado: título menor, cada linha sem quebra, e um ajuste automático que encolhe o título até caber na largura e abaixo do menu, em qualquer tamanho de janela.

## 11/11/2026: prévias do Awards refeitas com VFX sofisticado (aguardando escolha)
- O dono achou os efeitos das primeiras prévias (canvas) **simples demais**; quer VFX bem sofisticado.
- Página nova em tela cheia, "WinnerZ Awards · prévias com VFX": https://claude.ai/artifact/42BioQTPUvhkTzz6Rcndrr. Fonte em `prototipos/awards-vfx/index.html`. Usa WebGL (fundos calculados na placa de vídeo) e partículas com física:
  - 1 Cerimônia: holofotes volumétricos na fumaça (um segue o mouse), poeira com profundidade, chuva de brilho ao clicar, troféu 3D no palco;
  - 2 Ascensão: subida contínua (rolar ou "Subir") por nuvens e raios de luz, com riscos de velocidade; o troféu 3D desce no topo;
  - 3 Forja: metal derretido que escorre e reage ao mouse; o título é uma janela para o metal; clicar bate o martelo (onda de choque, faíscas que quicam, clarão, tremor);
  - 4 Constelação: nebulosa, estrelas com brilho em oito pontas, pulsos de pixel nas linhas, rastro de poeira no mouse, estrelas cadentes;
  - 5 Contagem: relógio feito de milhares de partículas; só o número que muda se desfaz e se refaz; o mouse espalha;
  - Troféu Zênite: troféu **em 3D de verdade** (malha low-poly com reflexos de ouro e cobre, bandeira ao vento, mármore com veios), arrastar para girar, partes com destaque e aproximação, rastro de pixels saindo da bandeira.
- O troféu 3D é uma malha simples feita por mim a partir da descrição; no site entra o modelo ou a imagem oficial.
- **Não foi testado num navegador** (só a lógica, fora dele). Se algum fundo não aparecer, a página mostra o erro em vermelho no canto.
- O canvas anterior (https://claude.ai/artifact/RHdw18im8BZR5nHSacDJQb) fica como registro das versões simples.

## 11/11/2026 (tarde): Lobby dos Bugs, variedade por partida no salão
- Paredes, móveis e bug do salão aprovados pelo dono, com ajustes. Novo pedido: muita variedade para a mesma sala a cada partida. Feito no salão: temas sorteados (10 estilos de parede, 7 neons, 46 coisas penduradas, carpetes, mesas e cadeiras em várias cores). Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 11/11/2026: prévias interativas da página do Awards no canvas (aguardando escolha)
- Canvas novo "WinnerZ Awards · página da estreia (prévias)": https://claude.ai/artifact/RHdw18im8BZR5nHSacDJQb. Seis quadros que funcionam no Play:
  - 1 Cerimônia (holofotes, poeira, título que acende, categoria entra com o corte em lâmina);
  - 2 Ascensão (botão "Subir" leva a página até o troféu no alto);
  - 3 Forja (faíscas, ouro derretido, veios de cobre, categoria "cunhada");
  - 4 Constelação (19 estrelas de oito pontas, céu que se move com o mouse);
  - 5 Contagem (relógio que anda, barra de votos);
  - Aba Troféu Zênite (troféu que gira com o mouse, as quatro partes explicadas, "Ver de perto", o significado do nome, pedestais lacrados até a revelação).
- O troféu nos quadros é um desenho simplificado; no site entra a imagem ou o modelo 3D de verdade. A apresentação dos indicados não muda. Datas e relógio são de exemplo.
- Gerador: `prototipos/redesign-elementos/awards.py`.
- Falta o dono escolher a direção (ou mistura) e confirmar a exceção de movimento contínuo no Awards. Nada mudou no site.

## 11/11/2026: página do Awards para a estreia (só sugestões, nada mudou)
- Pedido do dono: para a estreia do site, uma página do Awards bem bonita, com partículas, movimento e VFX. **Mantém igual** o efeito visual da apresentação dos candidatos (votação); remodelar só o restante. Quer também uma **aba dedicada ao troféu Zênite**.
- Sugestões entregues na conversa (aguardando ele escolher; depois, modelo no canvas antes de aplicar):
  - páginas: 1 Cerimônia (palco com holofotes), 2 Ascensão (subida até o zênite), 3 Forja (o troféu sendo feito, faíscas de cobre e ouro), 4 Constelação (19 categorias como estrelas de 8 pontas), 5 Contagem (o tempo como protagonista);
  - aba Zênite: troféu em destaque girando com o ponteiro, "anatomia" com as partes explicadas, o significado do nome, a bandeira ao vento com rastro de pixels, galeria de vencedores (vazia até a revelação), modo "ver de perto".
- Cuidados: nada de resultado antes da data de revelação; efeitos da votação intocados; dourado com parcimônia; animação contínua só onde ele abrir exceção (regra geral: só em hover/foco).

## 11/11/2026 (tarde, 2ª rodada): Lobby dos Bugs, sala vitrine com paredes grossas
- O dono achou a 1ª versão ainda aquém (paredes "de papel"). 2ª rodada: paredes com grossura e volume no jogo todo, chão com placas de tamanhos diferentes, detalhes e uma sala de formato único. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 11/11/2026 (tarde): Lobby dos Bugs, sala vitrine
- O dono achou o visual básico perto do Enter the Gungeon. Os lotes pararam; o salão foi refeito como sala vitrine (luz, paredes, chão, bug). Se ele aprovar, vira a régua do resto. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 11/11/2026 (manhã): Lobby dos Bugs, lotes de 32 pontos e a regra "pintar do zero"
- No repositório `winnerzbr/lobby-dos-bugs`: o cenário do andar 1 está todo em 32 pontos (lotes 1 a 4) e o jogo ocupa a janela inteira em qualquer resolução, incluindo ultrawide.
- Decisão do dono: os desenhos que eram só "refinados" do de 16 pontos foram refeitos do zero (94). Daqui em diante, todo desenho de 32 pontos é pintado do zero.
- Falta: bugs, chefões, armas, itens, peças da tela e efeitos. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 10/11/2026 (22h50): Lobby dos Bugs, o dono escolheu o estilo de 32 pontos
- Decisão: o jogo é em pixel art de 32 pontos. No repositório `winnerzbr/lobby-dos-bugs`, virou o padrão do jogo e do Ateliê. Próximo: refazer os desenhos por lotes. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 10/11/2026 (noite): Lobby dos Bugs, os 4 estilos gráficos no jogo inteiro
- No repositório `winnerzbr/lobby-dos-bugs`: os 4 estilos (hoje, 16 caprichado, 32 pontos, 3D estilo PS2) valem no andar inteiro (menu → "Estilo", ou F2). A pedido do dono, o 3D não tem mais desenho chapado (tudo o que não tem modelo vira peça com volume) e o vírus foi refeito em 32 pontos.
- Em aberto: a escolha do estilo. Resumo em `docs/memoria/lobby-dos-bugs.md`.

## 10/11/2026: "Por região" no site com o Trilho lateral (proposta S aprovada)
- O dono aprovou a proposta **S · Trilho lateral** do canvas. Aplicado no `RegionView` (aparece em "Por região" na página da linha do tempo dos jogos de mundo aberto, como o Elden Ring).
- Lista de regiões à esquerda: marcador inclinado (cheio quando já tem algo feito, âmbar na região atual), selecionada com contorno branco, atual com contorno âmbar, coberta (spoiler) tracejada. Setas ↑/↓ no teclado trocam de região.
- A região escolhida entra à direita com o **corte em lâmina**: a anterior fica por baixo e escurece, o fio aceso atravessa, fecham as faixas pretas, a foto aproxima devagar e o texto chega com as cores separadas. Barra de andamento da região sob o nome. Com "reduzir movimento", sem animação.
- Com isso, **a lista aprovada da linha do tempo está completa**.
- Arquivos: `src/components/RegionView.tsx`, fim de `src/styles/jornada.css`.

## 10/11/2026: "Por região", quatro propostas no canvas (aguardando escolha)
- Página nova "Por região" no canvas da linha do tempo (https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM), quatro quadros que funcionam no Play, com as regiões do Elden Ring:
  - R · Em cenas, com o corte em lâmina (igual à linha do tempo aprovada);
  - Q · Rota: regiões como paradas num caminho, a câmera viaja e a linha acende;
  - S · Trilho lateral: lista de regiões à esquerda e a cena à direita;
  - T · Mosaico: todas as regiões de uma vez; tocar abre em tela inteira.
- Em todas: item com spoiler coberto, região atual em âmbar, regiões à frente escondidas.
- Falta o dono escolher; só então aplicar no site (`RegionView`).
- Cuidado para a próxima vez: ler o `canvas.json` do canvas antes de publicar; nesta publicação havia uma versão salva que não era minha e o índice foi regravado.

## 10/11/2026: linha do tempo, rodada 3 (antes e depois, selos, capa do capítulo, legenda depois, compartilhar capítulo)
- **Antes e depois:** cena nova, logo antes do "Hoje", com a primeira e a última foto lado a lado (precisa de 2 fotos em dias diferentes; só na linha por data).
- **Selos automáticos** nas cenas: "Sua maior sessão" ou "O dia em que você mais jogou", "Voltou depois de N dias" (depois de 7 dias ou mais sem jogar) e "Sua primeira foto".
- **Capa do capítulo:** na cartela do capítulo, "Trocar a capa" mostra as fotos daquele capítulo para escolher; dá para voltar à automática. A escolha fica guardada junto das narrações do capítulo (chave `capa:<capítulo>` em `histories.narrations`), sem coluna nova no banco.
- **Legenda depois:** foto sem legenda mostra "O que estava acontecendo aqui? Escrever a legenda", com campo na própria cena.
- **Compartilhar o capítulo:** botão na cartela do capítulo; gera uma imagem com o nome, as datas, o resumo e a capa (pode tirar a foto ou o resumo). Só a imagem sai do site.
- Arquivos: `src/components/Faixa.tsx`, `src/components/SnipShare.tsx` (`ChapterShareSheet`), `src/data/store.ts` (`setChapterCover`), `src/pages/Journey.tsx`, fim de `src/styles/jornada.css`.
- **Da lista aprovada falta só** o redesign de "Por região" (sugestões no canvas primeiro).

## 10/11/2026: Lobby dos Bugs, estudo do estilo gráfico (no repositório do jogo)
- O dono pediu gráficos mais definidos e exemplos de vários estilos. No repositório `winnerzbr/lobby-dos-bugs` há agora a "Prévia: estilos" (menu de teste): hoje (16 pontos), 16 caprichado, 32 pontos e 3D estilo PS2, na mesma sala e câmera. Decisão do estilo: EM ABERTO (aguarda o dono jogar).
- Resumo atualizado em `docs/memoria/lobby-dos-bugs.md`.

## 10/11/2026: linha do tempo, rodada 2 (linha geral, lembranças, sessões do dia, nomes dos capítulos)
Itens 1, 2, 6 e 7 da lista aprovada:
- **Linha geral** (Jornada → Linha do tempo) agrupada por mês e, dentro do mês, por jogo: capa, dias de jogo, momentos, a frase mais recente, até 4 fotos (cada uma abre a cena certa) e "Ver os registros". "Zerou" ganha cartão grande. O que chegou à coleção fica em linhas discretas. Filtro novo **"Só momentos"**.
- **"Neste dia"**: cartão que só aparece quando há um momento ou foto neste mesmo dia há 1, 2, 3 ou 6 meses, ou há anos. Fica no Início (abaixo do horizonte), na Jornada, na linha geral e na linha do jogo.
- **"Lembra disso?"**: uma foto com mais de 14 dias, trocada uma vez por dia, na lateral da Jornada.
- Os dois abrem a linha do jogo já na cena certa (`?cena=<id do registro>`).
- **Sessões do mesmo dia viram uma cena só** na linha em cenas (o tempo soma, os recados se juntam).
- **Nomes dos capítulos:** não usam mais títulos automáticos ("Momento guardado", "Sessão 25", "Teste"); tiram o "Fez:" e o "Hoje:"; sem nome bom, o capítulo se chama pela época ("Fim de outubro").
- Arquivos: `src/pages/Memory.tsx`, `src/lib/memory.ts` (`nesteDia`, `lembraDisso`), `src/components/Lembrancas.tsx`, `src/lib/chapters.ts` (`epoca`), `src/components/Faixa.tsx` (`juntarDias`, `startId`), `src/pages/Home.tsx`, `src/pages/JourneyIndex.tsx`, fim de `src/styles/jornada.css`.
- **Falta:** antes e depois e mais selos; capa do capítulo e legenda depois; compartilhar um capítulo inteiro; redesign de "Por região" (sugestões no canvas primeiro).

## 10/11/2026: lista aprovada da linha do tempo, dois itens novos
O dono pediu para acrescentar à lista de tarefas aprovadas da linha do tempo:
- **Redesign da parte "Por região"** (a tela dos jogos de mundo aberto, `RegionView`, que ficou com o visual antigo). Fazer **do mesmo jeito da linha em carrossel**: primeiro várias sugestões num artefato (canvas), ele escolhe, só então aplicar no site.
- **Corrigir os nomes fracos dos capítulos** criados automaticamente (ex.: "Momento guardado", "Sessão 25"), usando o nome da região quando houver.

**Lista aprovada, o que falta (nesta ordem, salvo ele mudar):**
1. Linha geral por mês e por jogo, com "Só momentos".
2. "Neste dia" e "Lembra disso?".
3. Antes e depois, e mais selos.
4. Capa do capítulo escolhida pela pessoa e legenda em foto antiga.
5. Compartilhar um capítulo inteiro como imagem.
6. Juntar numa cena só as sessões do mesmo dia.
7. Nomes dos capítulos (corrigir os fracos; usar o nome da região).
8. "Por região": sugestões de redesign no canvas → escolha dele → aplicar.

## 10/11/2026: linha do tempo nova no site, rodada 1 (página própria em cenas, corte em lâmina)
- O dono **aprovou o carrossel "H · Corte em lâmina"** do canvas. Aplicado no site.
- **Página própria:** `/jornada/<jogo>/linha-do-tempo` (a mesma tela da Jornada do jogo, com `view="linha"`). Tem título, resumo (dias de jogo, tempo, momentos, capítulos), botões "Rever a jornada", "Tela cheia" e "Capturas de tela", os filtros e a chave "Por data / Por região".
- **Entrada em destaque na página do jogo:** botão "Linha do tempo" no topo, ao lado de "Começar sessão", e um cartão grande com as últimas fotos, logo abaixo da trilha. As abas da página do jogo ficaram só com **Diário** e **Detalhes**; a trilha de progresso agora abre a página da linha.
- **Linha em cenas** (`Faixa` com a opção `blade`): uma cena por vez no centro. Na troca, a cena nova entra cortando na diagonal de 22° com o fio aceso; fecham as faixas pretas, a foto aproxima devagar e o texto chega com as cores separadas. Tudo toca uma vez por cena; com "reduzir movimento" não toca.
  - navegação: setas na tela, teclado, roda do mouse (uma cena por vez), arrastar, deslizar o dedo, clicar na régua, "Passeio" e "Hoje";
  - sessão sem nada escrito nem foto não vira cena (a maior sessão fica sempre e ganha o selo "Sua maior sessão");
  - na cena de sessão, a frente é o recado (ou onde parou), não a duração;
  - o nome do capítulo perde o "Fez:" do começo.
- "Rever a jornada" abre em tela cheia, volta ao começo e liga o Passeio (também pelo cartão da página do jogo, com `?rever=1`).
- Arquivos: `src/components/Faixa.tsx`, `src/pages/Journey.tsx`, `src/App.tsx` (rota), fim de `src/styles/jornada.css`.
- **Falta da lista aprovada:** linha geral por mês e por jogo com "Só momentos"; "Neste dia"; "Lembra disso?"; antes e depois; capa do capítulo escolhida pela pessoa; legendar foto depois; mais selos; compartilhar um capítulo inteiro; juntar em uma cena as sessões do mesmo dia; conferir o nome com spoiler em "O próximo instante".

## 10/11/2026: segunda leva de carrosséis da linha do tempo (mais seis)
- O dono pediu mais sugestões. Página nova "Carrosséis 2" no mesmo canvas (https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM), seis quadros que funcionam no Play:
  - K · Fita VHS: a cena liga como TV antiga, com linhas, faixa de rastreio e "PLAY" na tela;
  - L · Persiana 22°: a cena abre em tiras diagonais com os fios acesos;
  - M · Íris: abre num círculo a partir do centro, com anel de luz;
  - N · Virar a página: cada cena é uma página de livro que vira;
  - O · Mosaico: ladrilhos acendem e somem em ordem sorteada;
  - P · Mapa da jornada: as cenas são paradas num caminho, a câmera viaja e a linha vai acendendo.
- Com o E e os cinco da primeira leva (F a J), são doze opções de carrossel. Falta ele escolher. Nada mudou no site.

## 10/11/2026: mais cinco carrosséis de linha do tempo no canvas
- O dono achou "sensacional" a linha do tempo em **carrossel** (quadro E) e pediu mais sugestões em carrossel, com outros efeitos.
- No mesmo canvas, página nova "Carrosséis" (https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM), cinco quadros que funcionam no Play:
  - F · Rolo de filme: tira de película, o quadro treme e assenta, vazamento de luz, a cor sai do sépia;
  - G · Profundidade: cenas em arco 3D, reflexo no chão, facho de luz na cena do centro;
  - H · Corte em lâmina: a cena entra cortando na diagonal de 22° com o fio aceso; o texto chega com as cores separadas;
  - I · Câmara escura: fotos em papel, imagem que se revela sob luz vermelha, legenda escrita à mão;
  - J · Mergulho: a cena atual passa pela câmera e a próxima vem do fundo, com riscos de velocidade.
- Todos tocam o efeito uma vez por cena. Gerador: `prototipos/redesign-elementos/tl.py`.
- Falta ele escolher o efeito (ou combinação). Nada mudou no site.

## 10/11/2026: modelo da linha do tempo, versão cinematográfica e carrossel
- Pedido do dono: a linha do tempo deve ser **cinematográfica, com efeitos especiais**, e ele quer ver também um exemplo **em carrossel**, como a de hoje.
- No mesmo canvas (https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM):
  - quadro B refeito: abertura como título de filme, cartela de título por capítulo, faixas pretas, grão de filme e vinheta nas fotos; ao passar o mouse, zoom lento e um risco de luz;
  - quadro E novo, que funciona no Play: carrossel com setas, régua clicável e "Passeio"; a cena do centro ganha faixas pretas, zoom lento, risco de luz e texto subindo.
- Os efeitos tocam uma vez por cena ou no mouse, sem repetição infinita (regra do dono).
- Falta ele escolher entre a página que rola para baixo (B) e o carrossel (E), ou os dois (B como página, E como "Rever a jornada"). Nada mudou no site.

## 10/11/2026: linha do tempo nova, modelo no canvas (aguardando aprovação)
- O dono aprovou **todas** as sugestões da revisão da linha do tempo, mas quer **ver antes num artefato**.
- **Decisão dele:** a linha do tempo perdeu destaque nas reorganizações; ela ganha **página própria dentro da Jornada do jogo**, com **botão em destaque** no topo.
- Modelo publicado: canvas "WinnerZ · Linha do tempo nova (modelo)", https://claude.ai/artifact/AXzLN4kvBJx6fkeSaomofM, com 4 quadros no visual Carga escuro:
  - A: página do jogo com o botão "Linha do tempo" no topo e um cartão grande de entrada;
  - B: a página própria (um cartão por dia, três tamanhos, capítulos com nome da região, selos, legenda depois, antes e depois, "Neste dia", "Rever a jornada");
  - C: a linha geral por mês e por jogo, com "Zerou" em cartão grande e filtro "Só momentos";
  - D: a página própria no celular.
- Gerador: `prototipos/redesign-elementos/tl.py` (usa o `gen.py` e os temas do canvas anterior).
- **Nada mudou no site ainda.** Só aplicar depois de ele aprovar o modelo.

## 10/11/2026: revisão da linha do tempo (só sugestões, nada mudou)
O dono pediu uma revisão da linha do tempo (a geral, em Jornada → Linha do tempo, e a do jogo). Aguardando ele escolher.
- **O que foi visto:** a geral é uma lista de quase 10 mil px em que quase tudo é "Sessão N · jogo · Sessão", sem foto e com o mesmo peso para sessão vazia e para "Zerou". A do jogo tem base bonita (fundo, capítulos com resumo, Passeio, régua), mas 45 painéis altos e quase vazios com "1 min" como título.
- **Layout e organização:** um cartão por dia (mesma regra do Diário); três tamanhos de cartão (grande: zerou, começou, momento com foto; médio: dia com recado; pequeno: só um traço na régua); foto ocupando o painel inteiro; sem foto, a frase do recado em letra grande no lugar da duração; na geral, agrupar por jogo dentro do mês, com capa grande; filtro "Só momentos"; nome da região como título do capítulo.
- **Ideias para trazer a pessoa de volta:** "Neste dia" (há 1 mês, há 1 ano) no Início e no topo da linha; "Lembra disso?" com uma foto antiga na Jornada; botão "Rever a jornada" (o Passeio) em destaque e ao zerar; antes e depois (primeira e última foto); a pessoa escolher a foto de capa de cada capítulo; convite para legendar uma foto sem legenda por visita; selos automáticos ("sua maior sessão", "voltou depois de 20 dias"); compartilhar um capítulo inteiro como imagem.
- **Para conferir:** o painel "O próximo instante" mostra "Etapa 23 de 23 · Fera Elden" (nome de item que pode ser spoiler); o cabeçalho da linha do jogo ainda diz "30 sessões".

## 10/11/2026: Jornada, rodada 3 (lives da Twitch e do YouTube viram sessão)
- **Frases iguais:** em Detalhes a frase agora conta dias, como o topo ("Você jogou 8 dias (4 h 05)").
- **Duas pontes novas** em Preferências → Pontes, ao lado da Steam, RetroAchievements e Playnite:
  - **Lives da Twitch:** usa a conta da Twitch já ligada. A Twitch avisa o começo, o fim e a troca de categoria; cada jogo da live vira uma sessão com início e fim exatos. Categoria que não é jogo não conta. Live com menos de 5 min não conta.
  - **Lives do YouTube:** a pessoa cola o link do canal. A busca (ao abrir o site e uma vez por dia) lê as lives encerradas. O YouTube não informa o jogo: o servidor procura o nome de um jogo da Jornada da pessoa no título da live; sem achar, o item fica em "Vindo das pontes" só com a opção de ignorar. A live precisa ficar pública no canal.
  - As duas entram pelo caminho das outras pontes (`inferred_sessions`), com o botão "Registrar sozinho" e a caixa "Vindo das pontes".
- **Para funcionar falta o dono:**
  1. rodar a migração `supabase/migrations/0098_lives_viram_sessao.sql` no Supabase;
  2. YouTube: o canal do site precisa estar ligado na Central da live (já usado para o chat) **ou** haver uma `YOUTUBE_API_KEY` na Vercel (cadastrada direto no painel, nunca na conversa);
  3. testar com uma live curta (mais de 5 min) em cada serviço. **Ainda não foi testado com live de verdade.**
- **Não entrou:** clipes da live virarem momentos.
- Arquivos: `api/pontes.ts` (bloco "Lives viram sessão"), `src/components/Bridges.tsx` (`LiveTwitchRow`), `src/data/bridgeApi.ts`, teste em `src/lib/pontes.test.ts`.

## 10/11/2026: Jornada, rodada 2 (curva de emoções e previsão no seu ritmo)
- **Curva "Como foi, dia a dia"** na aba Detalhes da página do jogo: uma linha com o "como foi a jogatina?" de cada dia de jogo (Adorei, Quero continuar, Foi suficiente, Não encaixou) e uma frase de resumo. Só aparece com 3 dias ou mais respondidos.
- **Previsão "no seu ritmo"**, opcional, embaixo do progresso em Detalhes: começa desligada ("Mostrar uma previsão no seu ritmo"). Conta com o tempo que cada 1% levou e com o que se jogou nas últimas 4 semanas. Precisa de 1 hora registrada e 10% de progresso; sem isso, avisa que ainda não dá. A escolha fica guardada no aparelho.
- **Já existiam (a revisão errou ao tratar como novidade):**
  - "Anteriormente na sua Jornada…" já aparece sozinho na tela da sessão e, depois de 7 dias longe, o bloco "Voltar a um jogo" entra na página do jogo;
  - os **ecos das amizades** já mostram, na linha do tempo, os momentos de quem joga o mesmo jogo, só até o ponto em que você está (sem spoiler).
- **Falta:** live da Twitch virando sessão sozinha. É a maior: precisa de uma migração nova no Supabase e de um teste com live de verdade. A ligação da conta da Twitch já existe (pontes).
- Arquivos: `src/components/JornadaPartes.tsx` (`Previsao`, `previsaoRitmo`, `CurvaEmocoes`), `src/pages/Journey.tsx`, fim de `src/styles/jornada.css`.

## 10/11/2026: Jornada, rodada 1 da revisão (simplificar e organizar)
O dono aprovou todas as sugestões da revisão, **menos** os palpites lacrados e a figurinha por região.
**Decisão:** o álbum de figurinhas fica em espera e só será lançado um tempo depois da estreia do site.
Feito nesta rodada:
- **Lista da Jornada:** "Em andamento" só com jogos que já tiveram sessão; os outros vão para **"Na fila"**. As linhas mostram onde parou (sem "Sem recado"), a porcentagem e uma barra fina de progresso. Na lateral saíram os cartões de registro automático e de lembrete (ficam nas Preferências, com um atalho).
- **Página do jogo:**
  - topo com **dois botões** (Começar sessão e Ações); "Sessão passada", "Resumo para voltar" e "Traduzir a tela" foram para Ações;
  - o topo conta **dias de jogo** (várias sessões no mesmo dia valem uma) em vez de sessões;
  - **trilha** nova logo abaixo do topo: "Você está em…", parte X de Y (ou feitos, em jogo aberto), a porcentagem e uma barra com uma marca por parte; tocar abre a História por partes;
  - **duas abas:** História e Detalhes. A História tem uma chave: Diário, Por região/capítulo e Linha do tempo;
  - **Diário com um bloco por dia**; dias seguidos sem anotação viram uma linha só; sessão de 1 ou 2 min sem nada escrito não vira linha nem conta como dia;
  - saiu da lateral o aviso repetido de registro automático;
  - defeito corrigido: em tela média os botões descem de linha em vez de espremer o nome do jogo.
- **Nomes:** "Marco" passou a aparecer como "Momento" (um filtro só).
- **Fim de sessão:** já era uma pergunta só, com "Mais detalhes" fechado (a sugestão da revisão estava errada nesse ponto). Novo: em sessão de menos de 3 min sem nada escrito aparece "Abri sem querer: não registrar".
- Arquivos: `src/pages/JourneyIndex.tsx`, `src/pages/Journey.tsx`, `src/components/JornadaPartes.tsx` (Registros, Trilha, `diasDeJogo`), `src/pages/SessionFinish.tsx`, fim de `src/styles/jornada.css`.
**Falta (próximas rodadas):** "Anteriormente em…" automático; curva de emoções; recados de amizades por região; live da Twitch virando sessão; previsão "no seu ritmo".

## 10/11/2026: revisão da Jornada (só sugestões, nada mudou no site)
O dono pediu uma revisão da Jornada. Sugestões entregues na conversa, aguardando ele escolher:
- **Simplificar:** separar "Na fila" (começou, sem sessão) de "Em andamento"; linhas da lista mostrarem onde parou e o progresso em vez de "Sem recado"; juntar sessões do mesmo dia e não contar sessões de 1 ou 2 min; fim de sessão com uma pergunta só (onde parou) e o resto em "contar mais"; um botão principal na página do jogo; ajustes de pontes e lembrete saírem da lateral depois de vistos; menos nomes (juntar Momento e Marco).
- **Ideias novas:** "Anteriormente em…" automático ao voltar depois de dias; palpites lacrados que abrem no fim; curva de emoções da campanha; recados de amizades que destravam por região; previsão "no seu ritmo" (opcional); live da Twitch virar sessão sozinha, com clipes como momentos; figurinha por região concluída.
- **Organização e progressão:** trilha de regiões e o progresso no topo da página do jogo; juntar as abas Registros e Regiões numa só "História"; um bloco por dia nos registros; barra fina de progresso em cada linha do índice; tirar o aviso repetido de registro automático.
- **Defeito visto:** em tela de largura média (uns 800 px), o topo da página do jogo espreme o título e os dados numa coluna estreita. Ainda não corrigido.

## 10/11/2026: tela Escrever da comunidade reorganizada
- Caixa "Onde": só uma setinha (a do navegador saiu) e a lista aberta agora usa as cores do site (antes ficava texto claro em fundo claro). Vale para todas as listas de escolha.
- "Que tipo de postagem?": só o nome do tipo, sem explicação, em botões numa fileira (no celular, dois por linha).
- A tela virou uma coluna só: tipo → "Sobre algum jogo?/Que jogo chegou?" (e o spoiler) → título → texto → imagens → Publicar e o aviso das regras. A coluna da direita saiu.
- Arquivos: `src/pages/Post.tsx`, fim de `src/styles/fresta.css`, `select.field` em `src/styles/carga.css`.

## 10/11/2026: Lobby dos Bugs, caderno de ideias
- O dono trouxe 15 ideias depois de jogar; ficaram anotadas com sugestões em `docs/memoria/ideias.md` do repositório do jogo e na página "Lobby dos Bugs: caderno de ideias" no Claude. Nada mudou no jogo. Detalhes em `lobby-dos-bugs.md`.

## 09/11/2026: aviso de pacotes do Álbum
- **O dono apontou:** o aviso "Você tem N pacotes para abrir" (`alb-note`) estava no layout antigo (fio âmbar em cima).
- **Feito (`carga.css`):** os avisos do Álbum têm o contorno com vão dos cards; o do agora (pacotes para abrir) tem o contorno âmbar. Folga de 32 px à direita para a ponta inclinada do botão "Abrir" não passar do card.

---

## 09/11/2026: linha do tempo do Início sem a data de hoje no alto
- **O dono pediu:** tirar o "Hoje · seg, 09 de nov" do alto da linha do tempo, porque a página já mostra "Hoje" em outros dois lugares.
- **Feito:** a legenda ficou só com "← Passado" e "Próximo →" (`Home.tsx`, `pages.css`); no celular, onde só a data aparecia, a legenda some.

---

## 09/11/2026: guias da comunidade e do perfil; nome do perfil
- **O dono apontou:** nas guias de uma comunidade (Conversas, Destacadas…) o marcador âmbar era de um layout antigo; no perfil, o nome estava grande demais e quebrava no meio da palavra.
- **Feito:**
  - guias com traço embaixo (comunidade `club2-tabs` e Jornada `jtabs__tab`): caixa alta larga e, no escolhido, a barra platina inclinada como no menu (`impacto.css`, parte `abas`);
  - guias do perfil (`pd-tab`: Visão geral, Jornadas…): também estavam no bloco branco antigo; agora são as abas da Carga (blocos inclinados com borda e vão);
  - nome do perfil (`.pd-name`, `etapa2.css`): de até 104 px para até 72 px, e só quebra se a palavra sozinha não couber na tela.

---

## 09/11/2026: campo de Dificuldade e foco dos campos
- **O dono pediu:** padronizar a caixa de Dificuldade (Jornada) e tirar a luz que corria ao clicar nela.
- **Feito (`carga.css`):**
  - Dificuldade: com o visual Carga ela ganhou a moldura, mas manteve a altura do sublinhado antigo e ficou espremida; agora tem o tamanho dos outros campos;
  - foco de todos os campos: saiu a luz que dava uma volta; a borda acende e o vão fica aceso na hora.
- **Limite:** a lista de sugestões (Normal, Difícil, Muito difícil, Máximo) é desenhada pelo navegador e não aceita o visual do site. Para ter o visual do site, seria preciso trocar por uma lista feita pelo site.

---

## 09/11/2026: pontas cortadas nos grupos de opções
- **O dono apontou:** "Mais úteis" (ordem das respostas numa conversa) com a ponta cortada, como o "Claro" do painel de Aparência.
- **Causa:** os grupos de opções (`.seg`, `.subnav`, `.what__paths`) podem rolar para o lado no celular e, por isso, cortam o que passa da borda; a ponta inclinada do último botão ficava de fora.
- **Feito (`impacto.css`, regra geral):** folga de 10 px à direita em todos esses grupos (à esquerda já havia 8 px).

---

## 09/11/2026: card dentro de card
- **O dono apontou:** na página de uma conversa, o card "Na Praça" (`cm-mini`) fica dentro do quadro "Onde está" (`cm-side`), e os dois ganhavam contorno e brilho.
- **Feito (`impacto.css`, regra geral):** um card dentro de outro card fica sem contorno e sem brilho próprios; só o de fora acende.

---

## 09/11/2026: painel de Aparência
- **O dono apontou:** o painel de Aparência (ícone de tema no menu) aparecia atrás da linha de baixo do menu, e a ponta do botão "Claro" ficava cortada.
- **Feito (`impacto.css`):** o painel ganhou prioridade de camada (`z-index`) acima da linha do menu; a caixa de Escuro/Claro deixou de cortar o que passa da borda e ganhou folga à direita. Conferido no site no ar.

---

## 09/11/2026: Coleção arrumada e borda dos cards mais discreta
- **O dono apontou:** Formato (Tudo, Físico, Digital) ainda cortava nos filtros; os botões do topo da Coleção estavam desalinhados; a borda acesa dos cards chamava atenção demais.
- **Feito (`carga.css`):**
  - Formato: as três opções dividem a largura da coluna, com letra um pouco mais estreita;
  - botões do topo (computador): grade de duas colunas iguais (Importar e Exportar planilha; Pela câmera e Selecionar) e "Adicionar jogo" embaixo, na largura toda; no celular continua como estava;
  - campo "Ordem": tinha perdido a setinha de lista com o visual Carga; voltou;
  - interruptor "Separar por plataforma": não passa mais 2 px da coluna;
  - borda dos cards no hover: cor a 55% e brilho menor.

---

## 09/11/2026: nota do modelo, borda dos cards, capas inclinando e filtros da Coleção
- **O dono pediu, e foi feito:**
  - nota com a animação de aplicar definida no quadro "Nota em barras" do canvas (`impacto.css`, parte `nota`): cor da nota nas barras e no número, pulo da barra onde parou, pulso na mesma cor (dois no máximo), pulinho do número, onda e faíscas quadradas no máximo. As faíscas (`Burst`) não estavam em uso no site; agora saem da última barra em `StarInput` e `ScoreSlider`. As barras deixaram de ser âmbar: seguem a cor da nota, como no modelo;
  - cards (Carga): saiu a luz que percorria o vão; no hover, só a borda de fora acende;
  - capas (Carga): voltou a inclinação que segue o ponteiro, com o ponto de luz (a da Fresta). A animação de favoritar no Explorar também voltou a funcionar (a Impacto a bloqueava sem querer);
  - Coleção: os filtros ficavam numa caixa com rolagem na vertical e na horizontal; agora aparecem inteiros, sem rolagem.
- **Conferido no site no ar:** inclinação da capa com o ponteiro (Coleção), borda do card no hover (Início), nota aplicada em 7 e em 10 com a animação congelada no meio (página de jogo, editor de análise, sem salvar), filtros sem rolagem.

---

## 09/11/2026: ajustes da Carga depois de ir ao ar
- **O dono pediu, e foi feito (tudo em `carga.css`, salvo onde indicado):**
  - botão de favoritar e outros só de ícone: no hover a emenda branca cortava o ícone. Agora é uma peça só dentro da moldura;
  - faixas de luz do fundo: retiradas;
  - botões: saiu a luz correndo no vão. Ficou só o impacto, com separação maior (11 px para cada lado) e o texto acompanhando a peça; depois do impacto o vão preenche;
  - nada animado sem hover: o botão âmbar do "agora" (Álbum, "Finalizar sessão") tinha a luz sempre girando; agora fica parado;
  - cards da sessão aberta (`goalcard`, `stopcard`): entraram na lista de cards com contorno (`impacto.css`);
  - "Preparar um resumo para voltar": espaço em cima e embaixo do texto e letra mais estreita na coluna de "Onde você parou", para caber em duas linhas;
  - logo do menu: sem o pulso sozinho.
- **Regra que fica:** no site, animação só com o mouse em cima (ou no foco). Nada de laço infinito em botão, logo ou fundo.
- **Conferido no site no ar:** nenhum botão com animação parada no Álbum, na página de jogo e na sessão; hover do favorito; separação no meio da animação; fundo e logo. Os dois cards da sessão foram conferidos com uma cópia montada na página, porque não havia sessão aberta.

---

## 09/11/2026: visual Carga aplicado no site
- **O dono pediu:** implantar a Carga em todas as páginas, com a luz do vão dando só uma volta antes de a peça ficar carregada, e as faixas do fundo mais lentas. Com a garantia de voltar atrás ou usar partes avulsas da Fresta ou da Impacto + Ímã anterior.
- **Feito:**
  - `src/styles/carga.css`: terceira camada, por cima da `impacto.css`; mexe em fundo, botões, abas, filtros, cards, capas e campos;
  - `src/lib/visual.ts`: três níveis por parte (`carga`, `impacto`, `fresta`), com `IMPACTO_PARTES` e `FRESTA_PARTES`, e os testes por `?visual=`, `?impacto=` e `?fresta=`;
  - `impacto.css`: o número de voltas da luz dos cards virou ajustável (a Carga usa 1; a Impacto + Ímã continua com 2);
  - faixas do fundo: de 18 s para 54 s por ciclo.
- **Como foi lançado:** primeiro publicado desligado; conferido no site no ar com `?visual=carga`; só depois virou o padrão.
- **Conferido no site no ar:** levantamento de botões, abas, filtros e cards com nome próprio em 22 páginas (as páginas usam as mesmas peças); varredura de texto cortado e conteúdo fora da tela em 21 páginas, no celular (375 px) e no computador (1360 px), sem nenhum problema; hover do botão e da capa; Coleção, página de jogo, Preferências e Comunidade olhadas de perto.
- **Ficaram como estavam (têm desenho próprio):** a cena de votação do Awards, a visita guiada do Museu, as reações da Comunidade, as regiões da Jornada e o menu lateral das Preferências.

---

## 09/11/2026: cinco variações da Impacto + Ímã no canvas
- **O dono disse:** das 5 direções novas (Pincel, Figurinha, Estojo, Quadrinho, Zênite), prefere algo mais no estilo Impacto e Ímã. Ele apagou essas 5 páginas do canvas.
- **Feito:** 5 páginas novas, todas partindo da Impacto + Ímã com contorno (o visual no ar): Engate, Lâmina, Rastro, Forja e Carga (90 quadros). Descrição em `site.md`.
- **Atenção para a próxima vez:** quando o índice do canvas (`canvas.json`) voltar menor do que foi publicado, conferir a lista de arquivos antes de recolocar páginas: o dono pode ter apagado de propósito. Aqui as páginas apagadas chegaram a ser recolocadas no índice por engano e foram retiradas em seguida.
- **Nada mudou no site.** Aguardando a escolha do dono.

---

## 09/11/2026: cinco direções novas de redesign no canvas
- **O dono pediu:** 5 novas sugestões de redesign.
- **Feito:** 5 páginas novas no canvas "WinnerZ — revisão de design dos elementos": Pincel, Figurinha, Estojo, Quadrinho e Zênite. Cada uma com o quadro de todos os elementos e 8 páginas do site, nos modos escuro e claro (90 quadros). Descrição de cada uma em `site.md`.
- **De onde vieram as ideias:** do próprio WinnerZ: a pintura do dono (Pincel), o Álbum (Figurinha), a coleção física (Estojo), a linha ousada da Impacto (Quadrinho) e o troféu Zênite (Zênite).
- **Gerador:** temas `P`, `S`, `E`, `Q`, `Z` em `prototipos/redesign-elementos/` (ver o README de lá).
- **Conferido:** quadro de elementos de cada direção nos dois modos, com e sem hover, e a página Início, em Chrome sem tela. As fontes do Google não carregam nesse teste; no canvas carregam.
- **Nada mudou no site.** Aguardando a escolha do dono.

---

## 09/11/2026: revisão do celular (textos cortados e conteúdo pela metade)
- **O dono apontou:** no celular, vários botões com texto cortado e conteúdos pela metade (visita guiada do Museu, botões da Coleção).
- **Como foi revisado:** navegador do app em tamanho de celular (375 px), passando por 21 páginas; um script mede cada botão cujo texto não cabe e cada elemento que passa da borda. A mesma varredura com `?visual=fresta` separou o que veio da Impacto do que já existia.
- **Corrigido:**
  - botões no celular (`impacto.css`, até 600 px): peça da seta menor, letra um pouco mais estreita, e o texto quebra em duas linhas em vez de ser cortado ou passar por cima da seta (Coleção, Jornada, Preferências);
  - fichas de filtro mais estreitas no celular; as fichas pequenas (Prioridade, na página do jogo) ficam ainda menores e podem quebrar linha, porque empurravam o card "Sua relação com este jogo" para fora da tela;
  - a luz do vão dos cards só existe em aparelhos com mouse (`@media (hover: hover)`): no celular ela empurrava a página 5 px (Mensagens);
  - visita guiada do Museu (já acontecia na Fresta): a grade tinha a largura da palavra mais longa do título e a tela ficava com 634 px. Agora tem a largura da tela, e o título é menor no celular (`etapa2.css`);
  - Preferências (já acontecia na Fresta): a etapa passava da tela; mesma correção.
- **Ficou de fora:** a nota de 0 a 10 com estrelas, na Fresta, passava um pouco da tela no celular; nas barras da Impacto, não.

---

## 09/11/2026: luz dos cards para depois de duas voltas
- **O dono pediu:** a luz que gira no vão dos cards não deve ficar em looping (tira muito a atenção). Depois de duas voltas, ela vira um preenchimento completo do vão enquanto o mouse estiver em cima.
- **Feito:** em `impacto.css`, a volta roda 2 vezes (1,4 s cada) e em seguida o vão acende por inteiro em meio segundo, na cor da luz (platina no escuro, grafite no claro). Ao tirar o mouse, apaga. Conferido no site no ar.
- **Canvas:** o quadro "Impacto + Ímã · cards com contorno" continua com a volta sem fim; só o site mudou.

---

## 09/11/2026: linha do tempo do Início no visual Impacto
- **O dono apontou:** a linha do tempo do Início não tinha mudado (ela tem estilo próprio e não estava em nenhuma parte).
- **Feito:** parte nova `linha` em `impacto.css` e em `PARTES` (`src/lib/visual.ts`), seguindo o quadro "Impacto + Ímã · cards com contorno" do canvas:
  - linha de 3px, trecho âmbar com brilho chegando ao Hoje;
  - marcadores em barras inclinadas: passado cinza, último registro claro, próximo com contorno âmbar, marco dourado; no hover, a barra estica;
  - o Hoje é uma barra maior que pulsa;
  - legenda e datas em caixa alta.
- **Conferido no site no ar** antes de publicar, na largura da tela do dono (1360 px). Em telas estreitas as datas longas cortam com reticências, como antes.
- **Pendente:** o dono avisou que há vários ajustes; seguir um de cada vez.

---

## 09/11/2026: visual Impacto + Ímã · cards com contorno aplicado no site
- **O dono pediu:** aplicar no site o visual "Impacto + Ímã · cards com contorno", com a garantia de poder reaplicar partes da Fresta ou voltar com ela toda.
- **Feito:**
  - `src/styles/impacto.css`: uma camada por cima da Fresta, dividida em 11 partes (fundo, menu, botões, abas, filtros, etiquetas, cards, capas, campos, nota, avisos);
  - `src/lib/visual.ts`: a chave geral e a lista de partes que ficam na Fresta;
  - nota em barras no `StarInput` e no `ScoreSlider`, com a leitura do ponteiro pela altura e o pulso a cada nota aplicada;
  - a votação do Awards não mudou.
- **Conferido:** página de teste com todas as folhas de estilo do site, nos modos escuro e claro e com a Fresta; a versão de teste do Vercel compilou.
- **Como voltar:** ver "Como a Impacto foi montada" em `site.md`.
- **Publicação travada e destravada:** desde 05/11 nenhuma versão ia ao ar. O atalho `scripts/vercel-pular.sh` comparava com a versão de 05/11, que o Vercel já não baixa (ele baixa só os envios recentes). O git dava erro (código 128), e o Vercel trata qualquer resposta diferente de 0 ou 1 como falha. O dono mandou a tela do erro; o atalho agora manda montar quando a versão anterior não está na cópia.
- **No ar e conferido no site de verdade (09/11, navegador do app):** Início, Coleção, página de jogo (nota de 0 a 10: metade de cima = ponto inteiro, metade de baixo = meio ponto, pulso ao aplicar), Eventos, Awards (cena de votação intacta, rótulos mono) e Comunidade. Corrigido depois de ver no ar:
  - botão com ícone e texto (o "Continuar") era tratado como botão só de ícone. Agora "só ícone" = classe `icon`, ou `aria-label` com um ícone sozinho;
  - os botões mais largos espremiam o texto do cabeçalho das páginas (Coleção): a coluna dos botões tem limite e eles quebram linha;
  - no campo com lupa (busca), o traço inclinado ficava em cima do ícone: nesses campos, o ícone ocupa o lugar do traço.

---

## 09/11/2026: nota em barras, meio ponto pela altura do ponteiro
- **O dono pediu:** ao pôr o ponteiro direto na metade de cima da barra, ela deve ficar cheia (antes ficava pela metade até mexer o mouse).
- **Feito:**
  - a barra é escolhida pela posição de lado a lado, corrigida pela inclinação;
  - o meio ponto ou o inteiro é decidido pela altura, como o preenchimento: metade de cima = ponto inteiro, metade de baixo = meio ponto;
  - o vão entre barras vai para a barra mais próxima.

  Isso substitui a regra anterior (metade esquerda = meio ponto).
- **Regra para quando aplicar no site:** a mesma leitura no `StarInput` e no `ScoreSlider`.

---

## 09/11/2026: nota em barras, pulso de volta
- **O dono comentou no canvas:** recolocar o efeito de pulso ao aplicar a nota.
- **Feito:**
  - o pulso sai a cada nota aplicada (clique, toque, teclado), no mesmo instante;
  - arrastando, sai uma vez, na barra onde solta;
  - contorno mais grosso, com brilho na cor da nota;
  - na nota máxima, dois pulsos.
- **Regra para quando aplicar no site:** o pulso não pode depender de soltar o botão.

---

## 09/11/2026: nota em barras, ponteiro acompanhando a inclinação
- **O dono comentou no canvas:** na metade de cima da barra, o ponteiro um pouco à direita acionava a barra seguinte.
- **Causa:** a leitura usava só a posição horizontal, como se as barras fossem retas.
- **Feito:** a posição do ponteiro é corrigida pela altura (22°), e vale a barra desenhada sob a ponta. Metade esquerda = meio ponto, metade direita = ponto inteiro, e o vão entre barras é dividido ao meio. Vale para as escalas de 0 a 5 e de 0 a 10.
- **Regra para quando aplicar no site:** usar a mesma correção pela inclinação no `StarInput` e no `ScoreSlider`.

---

## 09/11/2026: nota em barras, número fixo e escala de 0 a 10
- **O dono comentou no canvas:** o número da nota empurrava as barras para o lado ao mudar; lembrou que o site também tem a escala até 10.
- **Feito no quadro "Nota: barras com os efeitos de hoje":**
  - o número fica numa caixa de largura fixa, alinhado à direita, e as barras não andam mais;
  - entrou a escala de 0 a 10 (10 barras finas, meio em meio ponto, mesmos efeitos, onda no 10, meio ponto cortado na horizontal), nos dois modos.
- **Regra para quando aplicar no site:** o número da nota nunca pode mudar a posição das barras. A caixa do número tem largura fixa.

---

## 09/11/2026: redesign, o que não muda (Awards) e a nota em barras
- **O dono decidiu:**
  - **WinnerZ Awards:** os efeitos especiais da votação de hoje não podem ser trocados. Ficam:
    - a arte escolhida abrindo em tela larga com zoom lento;
    - o reflexo de lente, a luz vazando, o granulado, as faixas pretas e o clarão;
    - o título que entra espaçado.

    O redesign mexe só nos elementos em volta.
  - **Nota:** ele gostou das barras da Impacto. A nota passa a ser em barras inclinadas, com os mesmos efeitos de hoje:
    - prévia ao passar o mouse e arrastar;
    - cor do vermelho ao verde;
    - barras enchendo uma a uma;
    - pulo e pulso na barra onde a nota para;
    - número contando até o valor novo;
    - onda no 5.

    O meio ponto passa a cortar a barra na horizontal (enche a metade de baixo), e não mais no meio na vertical.
- **Feito:** o quadro jogável "Nota: barras com os efeitos de hoje", na página "Impacto + Ímã · cards com contorno" do canvas, nos modos escuro e claro. Uma cópia fica em `prototipos/redesign-elementos/NotaBarras.dc.html`. O código de hoje está em `src/components/Stars.tsx` e `ScoreInput.tsx`.
- **Pendente:** o dono testar as barras; definir a direção final do redesign.

---

## 09/11/2026: cards com contorno, borda discreta, vão vazado e luz que dá a volta
- **O dono comentou no canvas:** borda levemente escura no modo escuro e levemente cinza no claro, ainda visível; um espaço vazado entre o card e a borda; no hover, uma luz percorrendo toda a volta do card dentro desse vão.
- **Feito (página "Impacto + Ímã · cards com contorno"):**
  - borda de 2 px discreta (âmbar escuro no agora, dourado escuro no Awards);
  - vão de 5 px;
  - luz com rastro girando no vão: platina, ou escura no modo claro; âmbar no agora, onde corre sempre; dourada no Awards.
  - Saíram o pontilhado e o pulso.
- **Código:** `themes/Y.css` (usa `@property --ya` para girar a luz).

---

## 09/11/2026: cards com contorno, contorno mais grosso e pontilhado só no hover
- **O dono comentou no canvas:** contorno um pouco mais grosso, e os pontilhados só no hover, com o próprio contorno do lado esquerdo virando o pontilhado, na mesma grossura.
- **Feito (página "Impacto + Ímã · cards com contorno"):**
  - contorno de 4 px;
  - o lado esquerdo é liso quando o card está parado;
  - no hover, o lado esquerdo vira pontilhado de 4 px correndo para baixo, junto com o pulso.
- **Detalhe:** o quadro de elementos no modo escuro tinha uma edição salva pela página. A troca foi feita só no estilo, sem desfazer essa edição.

---

## 09/11/2026: teste de cards com contorno na Impacto + Ímã
- **O dono comentou no canvas:** testar uma versão de cards com contorno sólido em volta do card inteiro, platina ou âmbar conforme o card, com pulso ao passar o mouse.
- **Feito:** a página "Impacto + Ímã · cards com contorno" no canvas da revisão, com elementos e as 8 páginas nos dois modos. A original ficou como estava.
  - Contorno platina nos cards comuns (preto no modo claro).
  - Âmbar no card do agora, que pulsa sozinho.
  - Ouro no card do Awards.
  - Pulso para fora no hover.
  - O canto cortado saiu, para o contorno fechar a peça.
- **Código:** `themes/Y.css`, que entra depois do `I.css` e do `X.css`.
- **Pendente:** o dono comparar com a original; se quiser o Awards também em platina, trocar.

---

## 09/11/2026: direção 9, Impacto + Ímã
- **O dono pediu:** mais um exemplo misturando a Impacto com os efeitos dos botões da Ímã.
- **Feito:** a direção "Impacto + Ímã" no canvas da revisão, com página própria, o quadro com todos os elementos e as 8 páginas do site nos dois modos.
  - Fica tudo da Impacto: peças a 22°, luz diagonal, fita de LEDs, partículas e títulos que se cravam.
  - Os botões são os da Ímã, inclinados: duas peças (texto e seta) que se afastam e se cravam. No impacto, a costura acende, faíscas saem da emenda e o botão treme. O botão do "agora" repete o impacto sozinho.
- **Código:** `themes/X.css` no gerador, que entra depois do `I.css`.
- **Pendente:** o dono escolher a direção. Nada mudou no site.

---

## 09/11/2026: Ímã, luz dos cards
- **O dono comentou no canvas:** o feixe de luz que aparecia no meio dos cards da Ímã ficava estranho.
- **Feito:** o feixe saiu. Agora acendem as emendas entre as partes do card (topo, conteúdo e rodapé) no momento em que elas se cravam, com um brilho rápido em volta. Os 18 quadros da Ímã foram republicados.

---

## 09/11/2026: mais 3 direções na linha da Impacto (Ímã, Transmissão e Cromo)
- **O dono disse:** gostou das ideias mais ousadas da Impacto e pediu mais 3 direções na mesma linha de efeitos e inovação.
- **Feito:** três direções novas no canvas da revisão (artefato 3c961142-dafa-4536-8fab-836d3f514cdb). Cada uma tem página própria no canvas, o quadro com todos os elementos e as 8 páginas do site nos modos escuro e claro:
  - **Ímã:** tudo é feito de duas metades, o W e o Z, que se afastam e se cravam, e a costura acende no impacto:
    - botões, cards (topo e rodapé), abas, filtros e campos;
    - capas que saltam;
    - o logo, que se estica e se junta;
  - **Transmissão:** o site como o pacote gráfico de uma live:
    - letreiro de LED correndo embaixo do menu;
    - tarjas de TV;
    - cortina que passa nos botões e nas abas;
    - nota em pontos de LED, medidores de som e linhas de tela;
    - varredura nas capas;
  - **Cromo:** metal espelhado e laca negra:
    - reflexos que correm e brilho de quina;
    - títulos e números cromados;
    - cards de laca com moldura de cromo;
    - "agora" em cromo âmbar;
    - ouro espelhado só no Awards.
- **Corrigido em todas as direções:**
  - no modo claro, o título e o botão secundário sobre a foto do topo ficavam escuros;
  - acentos sumiam nos títulos em ouro e cromo;
  - a parte de baixo dos quadros "Todos os elementos" ficava cortada.
- **Conferência:** amostras renderizadas no Chrome sem tela (o jeito está no `README.md` do gerador).
- **Pendente:** o dono escolher entre as 8 direções, ou misturar partes. Nada mudou no site.

---

## 09/11/2026: canvas do redesign, abas cortadas na Impacto
- **O dono comentou no canvas:** os textos dos botões de filtro (as abas) apareciam cortados na Impacto.
- **Causa:** as abas encolhiam para caber na coluna, e os números de índice (01, 02...) apareciam na Impacto.
- **Feito:**
  - as abas não encolhem mais e passam para a linha de baixo quando falta espaço;
  - o índice voltou a ficar escondido;
  - o contador da aba "Galera" ficou centralizado.
  - A correção vale para as 5 direções, e os 81 quadros foram republicados.

---

## 09/11/2026: duas direções cinematográficas e todas as páginas do site, no escuro e no claro
- **O dono pediu:** mais 2 sugestões, bem cinematográficas, com designs e efeitos especiais elaborados. Também pediu para mostrar todas as direções em mais páginas do site, no modo escuro e no claro.
- **Feito:** no canvas da revisão (artefato 3c961142-dafa-4536-8fab-836d3f514cdb), agora com uma página do canvas para cada direção:
  - **Direção 4, Anamórfico (luz de cinema):**
    - luz de cena que se move;
    - reflexo de lente anamórfica (linha de luz) nos botões, abas e campos;
    - granulado de filme e cantos escurecidos;
    - faixas pretas de cinema e zoom lento na foto do topo;
    - foco que muda nas capas (as outras saem de foco);
    - cards de vidro iluminados de cima;
  - **Direção 5, Impacto (a vinheta como interface):**
    - peças inclinadas a 22°;
    - luz diagonal, pulso e faíscas no botão principal;
    - cor que invade na diagonal no secundário;
    - fita de LEDs nos cards;
    - títulos que entram se cravando;
    - partículas e feixes de luz no fundo;
    - logo que pulsa;
  - **As 5 direções** (Fresta 2, Monolito, Letreiro, Anamórfico e Impacto) aparecem em 8 páginas, nos modos escuro e claro: Início, Coleção, Jornada, Comunidade, WinnerZ Awards, Perfil, Preferências e página do jogo. As direções 4 e 5 também têm o quadro com todos os elementos. São 81 quadros novos.
- **Como foi feito:** um gerador em `prototipos/redesign-elementos/`, com as peças comuns e um arquivo de visual por direção. Dá para refazer ou ajustar tudo de uma vez.
- **Observação:** no WinnerZ Awards, a cena dos indicados continua a de hoje (decisão anterior); os quadros mostram só os elementos em volta.
- **Pendente:** o dono escolher a direção, ou misturar partes; a proposta do ChatGPT; nada mudou no site.

---

## 09/11/2026: mais duas direções de design no canvas (Monolito e Letreiro) e o mesmo pedido ao ChatGPT
- **O dono pediu:** mais 2 sugestões diferentes, redesenhando tudo, e ajuda para pedir a mesma tarefa ao ChatGPT.
- **Feito:** no mesmo canvas da revisão (artefato 3c961142-dafa-4536-8fab-836d3f514cdb), duas direções novas. Cada uma tem um quadro com todos os elementos e outro aplicado no topo da página de um jogo:
  - **Direção 2, Monolito (hardware de luxo):**
    - peças maciças com espessura;
    - botões que são teclas e afundam quando apertados;
    - filtro ligado afunda e acende um LED platina;
    - no "agora", a luz âmbar vaza por baixo da peça;
    - desativado fica afundado na superfície;
    - cantos retos;
    - lendário em mármore negro com ouro, como a base do Zênite;
  - **Direção 3, Letreiro (créditos de cinema):**
    - quase sem caixas: a letra larga dos títulos contra uma letra estreita em maiúsculas nos rótulos;
    - botões são palavras com uma seta longa que cresce, e o texto rola ao passar o mouse;
    - cards são fichas técnicas com número de índice;
    - números enormes;
    - campos em linha, como uma ficha de créditos.
- **ChatGPT:** o dono recebeu o arquivo `winnerz-estilos-atuais.css` (o `global.css` e o `fresta.css` juntos) e um pedido pronto para colar no ChatGPT, com as regras do site. A orientação é não mostrar o canvas do Claude, para as ideias saírem independentes. O ChatGPT entrega uma página HTML, e o dono pode trazer essa página para cá, para entrar no canvas e ser comparada.
- **Pendente:** o dono escolher entre Fresta 2, Monolito, Letreiro e o que vier do ChatGPT, ou misturar partes. Nada mudou no site.

---

## 09/11/2026: revisão de design dos elementos (proposta "Fresta 2")
- **O dono pediu:** uma revisão de design dos elementos do site (botões, cards e o resto), com sugestões de redesign num canvas, para deixar tudo mais exclusivo, estilizado e bonito.
- **Feito:** o canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb), com 6 quadros:
  - **00 Hoje:** os elementos como estão, copiados do código, com 7 pontos fracos numerados. Por exemplo: a mesma peça cinza para quase tudo, filtro ligado branco como o botão principal, card liso, capa que inclina, campo só com a linha embaixo e foco em âmbar;
  - **01 Botões "Forja":** platina escovada, a lasca que crava na peça como o W e o Z da vinheta, secundário "Aresta" (o fio corre e acende o canto), botões lado a lado que se encaixam, lendário em ouro só no Awards, desativado com hachura e foco com fio platina;
  - **02 Cards "Placa":** canto cortado a 22°, fio de luz no topo, partes separadas por frestas e progresso em traços; variações Agora, Lendário, Vazio, Número, Postagem e Lista; capas "Vitrine", com o canto cortado e o estado numa lasca;
  - **03 Régua e lascas:** abas com o traço platina embaixo, alternador em trilho, fichas de filtro que acendem o traço, etiquetas de estado, nota com a média da Galera e medidores de LEDs;
  - **04 Fenda:** campos escavados com o canto cortado, interruptor com lasca no trilho, caixas de marcar, escolha única em traço, controle deslizante, aviso com contagem em LEDs, dica e menu;
  - **05 Aplicado:** o topo da página de um jogo com tudo junto (dados de exemplo).
- **Nada mudou no site ainda.** É só a proposta para o dono ver antes de qualquer etapa.
- **Pendente:** o dono olhar o canvas e dizer o que aprova, o que muda e o que descarta. Depois disso, aplicar em etapas.

---

## 09/11/2026: o site ganha uma conversa só dele
- **O dono decidiu:** a conversa em que o Claude cuidava do site e do jogo IAmiguinho: Jogos de Verão (repositório
  `winnerzbr/iamiguinho-jogos-de-verao`) vira só do jogo. O site passa para uma conversa nova, com este repositório.
- **Ponto de partida da conversa nova:** tudo do site está nesta memória (`site.md`, este histórico, `ideias.md`,
  `lives.md`) e no `CLAUDE.md`. As entradas mais novas abaixo vêm de outras conversas (o Arcade do IAmiguinho com 23
  jogos e o Lobby dos Bugs); a última mudança do site feita na conversa do jogo foi a de 06/11 (o ChatGPT no site).
- **Pendente do site, de antes:** o dono ligar o "Keep my email addresses private" no GitHub antes do primeiro pull
  request do ChatGPT, e conectar o Codex (entrada de 06/11).

## 08/11/2026: Lobby dos Bugs: IAmiguinho do ChatGPT e fim das duas direções
- **O dono decidiu:** visual em pixel art estilo Enter the Gungeon e combate com mira; da outra conversa, fica só o IAmiguinho feito pelo ChatGPT.
- **Feito (no repositório do jogo):** o modelo do ChatGPT virou os quadros do jogo (ferramenta `ferramentas/ia_gpt.py`); artes 4× e trecho 2.5D arquivados; testes passando. Detalhes em `docs/memoria/historico.md` do repositório `winnerzbr/lobby-dos-bugs`.

## 07/11/2026: Lobby dos Bugs: começo do desenvolvimento (Godot)
- **O dono pediu:** "pode começar o desenvolvimento do jogo"; criou o repositório `winnerzbr/lobby-dos-bugs`.
- **Feito:** projeto Godot 4.7.2 com a fase 1 jogável do começo ao ponto seguro (horda, Diretor, eventos de horda, subchefe, chefão, cartas de melhoria, troca no ponto seguro), piloto automático de testes e memória própria em `docs/memoria/` do repositório do jogo.
- **Decidido (técnico):** tela de 640 × 360 pixels; IAmiguinho do Arcade.
- **Feito depois, na mesma noite:** 15 armas, 15 acessórios, 6 bugs, subchefe e chefão da fase 1, mapa de verdade da Lan house, Ateliê, músicas e sons, e os 13 chefões da comunidade gamer (ver `lobby-dos-bugs.md`). O dono jogou a fase 1 e achou um defeito (preso na porta da arena), corrigido. O histórico detalhado do jogo fica no repositório dele.

---

## 07/11/2026: Lobby dos Bugs vira projeto de jogo para o Steam (documento do jogo)
- **O dono pediu:** transformar o Lobby dos Bugs em jogo próprio para vender no Steam, misturando Vampire Survivors com Left 4 Dead. A proposta inclui fases fixas, ponto seguro com troca de itens, chefões e subchefes, e centenas de itens e inimigos.
- **Visual:** 8 bits, com gráficos gerados por código que o dono ajusta. O dono também quer um editor de sprites com o botão "Trocar no jogo".
- **Feito:** documento do jogo publicado ("Lobby dos Bugs: documento do jogo", artefato a59fb9dc-3875-42a6-a7c6-d1b4aab39290), com:
  - visão geral e jeito de jogar;
  - ponto seguro e troca;
  - itens com nota de poder;
  - inimigos;
  - fases e o "Diretor";
  - progresso;
  - visual e Ateliê;
  - som;
  - tecnologia (Godot);
  - Steam e mercado;
  - plano em etapas;
  - decisões em aberto.
- **Resposta sobre o editor no Godot:** é possível. A proposta é o Ateliê ficar dentro do próprio jogo, que lê os desenhos de uma pasta e troca na hora.
- **Recomendado:** nada de arte gerada por IA dentro do jogo (aviso obrigatório no Steam e rejeição do público).
- **Pendente:**
  - o dono ler o documento e responder às decisões em aberto;
  - depois disso, o protótipo de uma fase completa.
- **Memória:** novo arquivo `lobby-dos-bugs.md`.

---

## 07/11/2026: Arcade do IAmiguinho com 10 jogos novos (23 no total)
- **O dono pediu:** sugestões de jogos originais baseados em mecânicas consagradas de celular, no estilo do Arcade e com o IAmiguinho do Arcade. Escolheu **todas** as 10.
- **Feito:** os 10 jogos entraram no Arcade (tela de pixel 320×360, IAmiguinho de 14×16 com hélice, trilha chiptune própria, ranking da semana de exemplo):
  - **Jato de Refri** (mochila a jato): segurar para voar pelo depósito de uma loja de games;
  - **Ladeira do Rolimã** (subida de morro com física): a bateria é a gasolina;
  - **Fuga do Spoiler** (corrida em 3 faixas, vista de trás): o Amiguinho do megafone persegue;
  - **Rumo à Loja** (travessia de ruas, trilhos e canal): madrugada de lançamento;
  - **Torre do Backlog** (pulo infinito para cima): pilha de jogos não zerados;
  - **Queda do Disco** (torre que gira): torre de discos com partes arranhadas;
  - **Gancho do Cabo** (balanço com gancho): 5 fases, um botão;
  - **Lobby dos Bugs** (sobrevivência contra hordas): sobreviver 5 minutos escolhendo poderes;
  - **Defesa da Live** (defesa em faixas): trolls invadindo o chat;
  - **Derruba o Backlog** (estilingue e torres): 10 fases e depois fases sorteadas.
- **Publicação:** este ambiente não consegue alterar o artefato antigo do Arcade (de outra conversa). O Arcade completo, com os 23 jogos, foi publicado como **nova página "Arcade do IAmiguinho"** (artefato a7133e84-99f5-4677-b39d-4b4b8fce46f9). A antiga, com 13 jogos, ficou como estava.
- **Código no repositório:** `jogos/arcade/`
  - `index.html`: o Arcade de 13 jogos, como veio;
  - `novos/<id>.js`: um arquivo por jogo novo;
  - `montar.py`: junta tudo em `build/index.html`;
  - `teste.cjs`: testa cada jogo;
  - `BRIEF.md`: regras para fazer jogos novos.
- **Também hoje:** as 6 demos em 8 bits (`jogos/arcade-demos/`) seguem como página de testes à parte.
- **Pendente:** o dono testar os 10 jogos novos e dizer o que ajustar.

---

## 07/11/2026: Arcade do IAmiguinho, demos jogáveis em 8 bits
- **O dono pediu:** novas sugestões de minigames para o Arcade. Escolheu seis para testar e pediu tudo em **estilo 8 bits**.
- **Feito:** seis demos jogáveis, publicadas como página no Claude ("Arcade do IAmiguinho · testes", com menu). O código fica em `jogos/arcade-demos/`:
  - **Temporada Relâmpago:** 8 microjogos de 4 s que aceleram a cada 4 vencidos (cartucho, spoiler, cabo, cacetinho, "mais um jogo zerado", chat, parar no Z, boné). 3 pilhas de vida. A pontuação são os microjogos vencidos em sequência;
  - **Fábrica de Balacaxi:** jogo de ritmo com um botão. Bala + abacaxi = Balacaxi (100), o contrário = Abacabala (150), metades iguais não se prensam. Combos, 3 vidas e turno de 90 s;
  - **Pega o Boné:** corrida nos telhados à noite, só com pular e abaixar. Rota igual para todos na semana; menor tempo vence (cerca de 64 s numa corrida limpa);
  - **Pinball WinnerZ:** mesa em pé com o corredor do Zênite (letras Z-Ê-N-I-T-E), alvos do Radar e o IAmiguinho de bumper. 3 bolas;
  - **Cabo Enrolado:** desembaraçar fios em 5 níveis, iguais para todos na semana; menor tempo vence;
  - **Lag:** tênis de mesa contra o IAmiguinho, com atraso de comando que muda (medidor de ping). Pontuação: seus pontos × 100 + bônus se vencer.
- **Base comum (`arcade.js`):**
  - **Visual 8 bits:** tela de 320x180 pixels ampliada, com paleta de cores de console antigo mais os tons do WinnerZ. A letra é própria, em pixels (só maiúsculas, com acentos);
  - **Personagens:** o IAmiguinho e os Amiguinhos são desenhados em pixels;
  - **Controles:** teclado, controle e toque (botões na tela só no celular);
  - **Telas e recorde:** telas de início e de resultado com uma frase do IAmiguinho. O recorde da semana fica guardado só no aparelho.
- **Ainda não feito:** música (só efeitos), ranking da semana de verdade (online) e a entrada do Arcade no site.
- **Pendente:** o dono testar e dizer quais jogos entram no Arcade.

---

## 06/11/2026: o ChatGPT também vai trabalhar no site
- **O dono pediu:** um documento com tudo sobre o site para passar ao ChatGPT, que vai trabalhar em paralelo com o Claude, e como o ChatGPT pode acessar o site para fazer mudanças.
- **Feito:**
  - o documento "WinnerZ — guia do site para o ChatGPT" (um doc do Claude, para exportar e anexar no ChatGPT), sem chaves, sem e-mail e sem resultados do Awards;
  - o `AGENTS.md` na raiz, que o Codex (o ChatGPT que mexe no código) lê sozinho: manda seguir o `CLAUDE.md` e esta memória.
- **Decisões:**
  - o ChatGPT entra pelo Codex (chatgpt.com/codex), ligado ao GitHub só no repositório `winnerz`;
  - ele não envia direto para o `main`: cada mudança é um pull request que o dono aprova, depois de olhar a prévia do Vercel;
  - não se cadastram chaves no ambiente do Codex: ele testa em modo demonstração;
  - ao terminar, o ChatGPT escreve no topo deste histórico com "(ChatGPT)" no título e atualiza o `site.md`;
  - o dono combina quem faz o quê, para os dois não mexerem na mesma tela ao mesmo tempo.
- **Pendente:** o dono ligar o "Keep my email addresses private" no GitHub antes do primeiro pull request do ChatGPT, e conectar o Codex.

---

## 05/11/2026: Início: sem o HOJE embaixo da capa do lançamento
- **O dono pediu:** tirar o "HOJE" que ficava embaixo da capa do jogo no ponto "Hoje" da linha do horizonte.
- **Feito:** no dia de lançamento, o ponto mostra só a capa, o nome e "Saiu hoje · No seu Radar". O "Hoje" continua na legenda de cima da linha.

---

## 05/11/2026: Início: o lançamento do dia vai para o "Hoje" da linha do horizonte
- **O dono pediu:** a faixa grande de dia de lançamento "não ficou legal"; o jogo deve ser só mais um elemento da linha do tempo, no ponto "Hoje".
- **Feito:**
  - a faixa saiu;
  - no dia em que um jogo do Radar sai, o "Hoje" da linha do horizonte mostra a capa dele, o HOJE, o nome e "Saiu hoje · No seu Radar" em âmbar, e leva à página do jogo. Se sair mais de um, aparece "e mais N";
  - nos outros dias, o "Hoje" continua como antes;
  - o jogo do dia continua fora do quadrinho "No seu Radar" da coluna Próximo, para não repetir.
- **Decisão:** nada de faixa grande para lançamento. O lugar do lançamento do dia é o "Hoje" da linha do horizonte.

---

## 05/11/2026: Início: destaque para o jogo do Radar que sai no dia
- **O dono pediu:** dar mais destaque, na página inicial, ao jogo do Radar que está sendo lançado no dia (Zelda: Ocarina of Time aparecia só como uma linha pequena, "Saiu hoje.", menor que o card do GTA VI, que sai daqui a 14 dias).
- **Feito:**
  - nova faixa larga "Dia de lançamento" no Início, logo abaixo do topo da Jornada e antes da linha do horizonte. Só aparece no dia em que um jogo do Radar sai;
  - traz a imagem do jogo, o nome grande, "Saiu hoje." com as plataformas, os botões "Começar a jogar" e "Ver o jogo", e um HOJE grande em âmbar com a data;
  - o fio do horizonte acende em âmbar embaixo da faixa, com um brilho que corre na inclinação do Z (linguagem Fresta);
  - se sair mais de um jogo no mesmo dia, o primeiro ganha a faixa e os outros aparecem numa linha "Também sai hoje";
  - o jogo do dia sai do quadrinho "No seu Radar" da coluna Próximo, para não aparecer duas vezes. O quadrinho continua para o resto da semana.
- **Pendente:** o dono conferir no site; se quiser, a faixa pode ir para o topo da página no dia do lançamento.

---

## 02/11/2026: o jogo no Godot ganhou repositório próprio
- **O dono pediu:** receber as versões novas sem baixar e importar sempre.
- **Feito:**
  - o dono criou o repositório privado `winnerzbr/iamiguinho-jogos-de-verao`, e o projeto Godot foi para lá, com `CLAUDE.md` e memória própria;
  - aqui, `jogos/jogos-de-verao-godot/` ficou só com um aviso.
  - Ele vai usar o GitHub Desktop para puxar cada versão.
- **Daqui em diante:** o trabalho no jogo é no repositório novo. Esta memória fica como registro da versão do navegador.

---

## 02/11/2026: Godot: controle nos menus
- **O dono relatou:** "nos menus alguns comandos do controle não funcionam". Ele também notou umas travadinhas no vôlei e decidiu deixar assim por enquanto.
- **Causa:** no Godot, o ✕ e o ○ do controle não vinham ligados a confirmar e voltar nos menus.
- **Feito:**
  - ✕ confirma e ○ volta em todas as telas;
  - Start pausa e volta ao jogo, sem pausar e despausar no mesmo aperto;
  - a lista de provas rola com o direcional e as opções ficam sozinhas na tela;
  - o foco volta se o mouse tirar ele.
  - Testado só com botões do controle. O .zip novo foi para o dono.
- **Pendente:** o dono conferir no controle dele.

---

## 02/11/2026: o jogo vai para o Steam, feito no Godot
- **Decisão do dono:** lançar o IAmiguinho: Jogos de Verão no Steam quando estiver pronto, sem deixá-lo de graça no site, e passar o desenvolvimento para o Godot.
- **Escolhas dele:**
  - a versão do navegador fica no site como está, por enquanto;
  - testa abrindo o projeto no Godot do PC dele;
  - começar pela base + o vôlei, e depois as outras provas uma por uma;
  - usar o editor do próprio Godot no lugar do editor de dentro do jogo.
- **Feito:**
  - projeto Godot 4.7.2 em `jogos/jogos-de-verao-godot/` com a base (menu, partida, placar, pausa, resultado, recordes, opções, música, sons, controles);
  - o vôlei (partida rápida contra o Amiguinho Rosa), conferido lado a lado com o navegador: as fotos ficam quase iguais e as simulações dão números parecidos.
  - O dono recebeu o projeto em .zip e o passo a passo (`README.md` do projeto).
- **Pendente:**
  - o dono abrir no PC e jogar, e conferir se há trancos (o cérebro do Amiguinho é mais pesado no Godot);
  - depois, o Torneio e a Copa do vôlei e as outras 18 provas, uma por vez.

---

## 02/11/2026: sem palminhas; basquete com bola maior e por dentro do aro
- **O dono pediu:**
  - tirar as palminhas do jogo ("ficaram ruins");
  - aumentar a bola do basquete;
  - a bola na cesta passava por trás do aro inteiro: tem que passar por dentro dele.
- **Feito:**
  - as palminhas saíram de todas as provas;
  - a bola do basquete ficou 23% maior;
  - o aro tem uma metade de trás e uma da frente, e a bola passa entre as duas, por trás da rede.
- **Pendente:** o dono testar e ouvir os sons.

---

## 02/11/2026: patins: item alto alcançável e pouso abaixado
- **O dono pediu:**
  - poder pegar o item alto: bola ou coco vinham bem na hora de abaixar para o impulso, e desviando passava do item;
  - poder segurar ▼ no fim do pulo para já pousar abaixado e pegar impulso (antes era tombo "Pousou agarrado").
- **Feito:**
  - cada item alto agora tem uma janela livre para pousar, abaixar, carregar e pular; os obstáculos seguintes esperam;
  - pousar segurando ▼ deixa você abaixado, com a carga já começando; o agarrar só vale pontos se soltar antes de pousar;
  - soltar ▼ junto com o pulo não perde a carga.
  - Medido com um jogador automático: 160 de 161 itens altos pegos, sem tombos (antes, metade dos tombos era indo atrás do item).
- **Pendente:** o dono jogar; e ouvir os sons de desenho no jogo.

---

## 02/11/2026: sons de desenho no jogo
- **O dono pediu:** colocar no jogo os sons que escolheu na página "Sons de Desenho".
- **Feito:**
  - os 61 sons escolhidos tocam nas 19 provas; o corrimão ficou sem som, porque nenhuma opção serviu;
  - largada, ponto, vitória e derrota passaram a ser sons de desenho em todas as provas, como "Vai!", ta-dá, fanfarra e trompete triste;
  - cada prova tem os seus: passos e tombo na Corrida, motores no bugue, no jet ski e no teco-teco, buzina de palhaço ao ultrapassar no bugue, estrelinhas quando alguém fica tonto, entre outros;
  - arquivo `musica/sons.mp3` (710 KB) no jogo publicado e no site.
- **Pendente:** o dono jogar e dizer o que ajustar (volume de cada som, onde faltou ou sobrou).

---

## 02/11/2026: bocha com as bolas fora da quadra; sons de desenho animado para testar
- **O dono pediu:**
  - arrumar a bocha: as bolas saíam da quadra, talvez por algo mexido sem querer no editor;
  - sons "mais estilo desenho animado", numa página para ouvir e testar.
- **Bocha:** a cancha guardada no editor estava mais alta que a pintada. Agora a cancha do jogo sempre segue a pintada (mesmo formato), e a vila cobre a tela. Publicado no jogo e no site.
- **Sons:** 62 sons de desenho (75 arquivos com as variações), na página "Sons de Desenho". Ela tem cenas das 19 provas e marcação de "Gostei / Não gostei" com nota, que fica guardada para o Claude ler.
- **Depois (o dono: "alguns ficaram bons, mas muitos não"; perguntou de onde pegar sons ou um texto para pedir a um gerador):**
  - cada ficha da página ganhou o texto para pedir a um gerador, com a duração e o nome do arquivo;
  - a página ganhou uma seção com onde baixar sons prontos (FilmCow "Toons" indicada: grátis, comercial, sem crédito) e quais geradores usar (Adobe Firefly; ElevenLabs só no plano pago para uso comercial);
  - nenhuma marcação de "Gostei / Não gostei" tinha sido guardada até então.
- **Mais tarde:** o dono mandou os pacotes FilmCow "Toons" e "Hits & Crunches" (48 kHz).
  - A página ganhou até 3 opções do pacote em cada som (A, B, C), além da versão em código.
  - As cenas tocam a opção selecionada, e "Fica com" guarda a escolha.
  - O pacote não tem sons de água, palmas nem rodinhas; neles fica o feito em código ou um pedido a um gerador.
- **11h55:** o dono escolheu 59 dos 62 e pediu para refazer em código os 12 marcados "Nenhuma serve". Cada um ganhou 3 versões novas (Novo 1, 2 e 3) na página: motores com "pó-pó-pó" ou ronco macio, palmas de verdade, balão murchando, derrapada, rodinhas, corrimão, jato, braçada, bocha rolando e acelerada.
- **Pendente:** o dono escolher entre as versões novas (e nos 3 sem escolha); depois, colocar no jogo só os escolhidos.

---

## 02/11/2026: Corrida: peças da praia na versão de dia
- **O dono mandou:** de novo os pacotes da BMX e das peças da praia (já estavam no jogo, iguais) e depois a versão de DIA do quiosque de coco, coqueiros e rede de vôlei.
- **Feito:** a versão de dia entrou no jogo (de dia usava a da manhã). Só a imagem do meio-plano da Corrida mudou; trocada direto na página pronta do site (`public/demo/jogos-verao`; imagem nova `img/c41bc7869d94.webp` no lugar de `img/2601a59b645d.webp`).
- **Pendente:** a página do jogo no Claude não foi atualizada (esta sessão não tinha permissão para mudar artefatos antigos). Na próxima publicação dela, mandar o `index.html` e a imagem nova e tirar a antiga.

---

## 02/11/2026: sonoplastia retirada
- **O dono pediu:** tirar os efeitos sonoros novos e voltar ao estado anterior, porque não gostou deles.
- **Feito:** o jogo voltou aos bipes de antes em todas as 19 provas (no jogo publicado e no site). A água do surfe, a rede do basquete e os cenários novos da BMX e da Corrida continuam. Os arquivos dos sons ficam guardados e desligados (`SONOPLASTIA = False` no `build3.py`).
- **Pendente:** nada.

---

## 02/11/2026: espaço do Vercel (aviso de 100% dos 10 GB)
- **O dono mandou:** o e-mail do Vercel dizendo que a conta grátis usou 100% dos 10 GB de "Deployment Storage".
- **Causa:** o Vercel guarda uma cópia inteira do site a cada envio ao `main`. Com o Jogos de Verão (68 MB) e o teste do vôlei no Godot (41 MB) dentro de `public/demo`, cada cópia passou de 110 MB, e houve cerca de 100 envios entre 30/10 e 02/11. Só 36 de 113 commits desse período mudaram o site de verdade; o resto era memória, fontes dos jogos e artes.
- **Feito:**
  - o teste do vôlei no Godot saiu do site e foi para `jogos/volei-godot/exportado/`; ninguém linkava a página, e o site caiu de 115 MB para 74 MB por versão;
  - nova regra no `vercel.json` (`scripts/vercel-pular.sh`): o Vercel só monta uma versão nova quando muda algo do site (`src`, `public`, `api` e arquivos de montagem). Commits só de `docs/`, `jogos/`, `art/` etc. não publicam.
- **Decidido:** juntar as mudanças e enviar ao `main` uma vez por rodada de trabalho; arquivos grandes que não são do site ficam fora de `public/`. Pela regra nova do Vercel para o plano grátis, ao passar de 10 GB ele apaga sozinho as versões antigas. Ficam as 3 últimas, a que está no ar e a última prévia de cada ramo. O número no painel demora alguns dias para baixar.
- **Aviso "GitHub user not found" no Vercel:** não tem relação com o espaço. Os commits desta sessão saíam como `Heverton <noreply@winnerz.com.br>`, e esse e-mail não é de nenhuma conta do GitHub. A partir de agora, os commits saem como `Claude <noreply@anthropic.com>`, como nas outras sessões. Os commits antigos com o aviso ficam como estão, porque não atrapalham.
- **Pendente:** nada do dono. Se o Vercel bloquear um envio por falta de espaço, apagar versões antigas em Deployments no painel (o Claude não entra na conta).

---

## 02/11/2026: sonoplastia em todas as provas, água do surfe animada, bola por dentro da rede e cenários novos
- **O dono pediu:** bola por trás da rede no basquete; água e tubo do surfe animados; efeitos sonoros em todos os jogos. Mandou o pacote do cenário da trilha nova da BMX e as peças a mais da praia da Corrida (manhã, pôr do sol, noite e luzes).
- **Feito:** 73 sons feitos em código, tocando em todas as 19 provas (passos, rodas, motores, água, bolas, torcida...); água do surfe ondulando com reflexos; bola por dentro da rede; BMX com o cenário novo (terra, beirada, bico da rampa, objetos, poeira, fundo e dunas estendidos); Corrida com quiosque, coqueiros e rede de vôlei.
- **Pendente:** o dono ouvir e dizer o que ajustar; a versão de DIA das peças da praia (de dia está usando a manhã).

---

## 02/11/2026: Corrida na areia: contato no início do obstáculo e pulo mais longo
- **O dono pediu:** o contato no início do desenho do obstáculo (parecia no meio) e um pulo mais longo (caía demais); e aceitou os pedidos de peças a mais para o meio-plano.
- **Feito:** cada obstáculo bate a partir do início do desenho; pulo mais longo e mais alto (0,85 s); os Amiguinhos pulam na hora certa. Pedidos do quiosque de coco, coqueiros e rede de vôlei (4 horários e luzes) na guia da Corrida.
- **Pendente:** o dono testar e gerar as peças do meio-plano.

---

## 02/11/2026: Corrida na areia mais longa e com espaço entre os obstáculos
- **O dono pediu:** corrida bem mais longa (sem relógio na tela) e obstáculos menos juntos, com um flow melhor.
- **Feito:** baterias de 185, 195 e 205 m (uns 30 s cada); obstáculos em grupos com 12 a 20 m entre eles e trechos livres para embalar; poça com espaço para frear e voltar; areia fofa só nos trechos livres.
- **Pendente:** o dono testar. Se quiser, pedir mais peças de meio-plano (a pista longa repete os guarda-sóis e o posto).

---

## 02/11/2026: Corrida: correndo e trotando com a cabeça em 3/4
- **O dono mandou:** as pranchas da corrida e do trote refeitas com a cabeça em 3/4.
- **Feito:** trocadas no jogo e na Prévia (rosto aceso dentro do visor em todos os quadros); as de perfil ficaram guardadas.
- **Pendente:** o dono testar.

---

## 02/11/2026: BMX: desenho maior e visor apagado na ponta da rampa
- **O dono viu:** no salto aparecia um quadro diferente do IAmiguinho, maior e com o visor apagado.
- **Feito:** era o empinando (e o quadro 4 do corpo para trás): a prancha veio ~8% maior e o pneu da frente levantado era confundido com a tela do rosto. Escala corrigida, rosto aceso no lugar certo, e o empinando só aparece segurando ◀ no chão.
- **Pendente:** o dono testar.

---

## 02/11/2026: Corrida na areia pintada e movimentos novos da BMX
- **O dono mandou:** as pranchas da Corrida (6 do IAmiguinho, 4 do Amiguinho), objetos e cenário de dia; depois manhã, pôr do sol, noite e luzes. E os 8 movimentos novos da BMX.
- **Feito:** Corrida na areia toda pintada (corredores, obstáculos, largada, chegada, bandeirinhas e a praia nos 4 horários). BMX com os 8 movimentos novos (manobras seguradas, bunny hop, mortal encolhido, empinando, corpo no ar, desequilíbrio). Tudo na Prévia; pedidos marcados como entregues. A página passou do limite de arquivos: as imagens pequenas agora ficam embutidas.
- **Pendente:** o dono testar.

---

## 02/11/2026: BMX com manobras seguradas e pedidos da trilha nova
- **O dono disse:** "Agora sim! Ficou muito bom!" Pediu manobras que se mantêm segurando o botão (como no skate), combinando com o giro, e os prompts dos cenários, das peças da pista e dos movimentos do IAmiguinho, numa seção separada.
- **Feito:** Superman e Sem mãos seguram a pose cheia, Tailwhip repete (duplo, triplo), tudo combinável com o mortal e valendo mais pelo tempo segurado. Guia nova "BMX · trilha nova" na página de pedidos com 29 pedidos. Publicado na página do Claude e no site.
- **Pendente:** o dono gerar a arte da trilha nova.

---

## 02/11/2026: BMX com trilha de flow
- **O dono disse:** injogável; obstáculos demais em sequência, sem como pegar velocidade; a pista deve dar flow e o que pontua são os saltos (mais longe e mais alto) e as manobras; a pista pode ser feita em código.
- **Feito:** trilha que desce sempre, escrita em código (vale → rampa → descida de pouso comprida), pontos pela distância e altura de cada salto, gravidade mais leve, pulo para cima na ponta da rampa, pista desenhada em código e câmera que se afasta nos saltos altos. Nenhum tombo nos jogadores automáticos; medalhas recalibradas. Publicado na página do Claude e no site.
- **Pendente:** o dono testar; a arte nova da pista.

---

## 02/11/2026: BMX refeito com física de verdade
- **O dono pediu:** refazer a jogabilidade e a física da BMX (a bike parecia grudada no chão), com saltos grandes, manobras satisfatórias e mais elementos na pista, como no Hill Climb Racing.
- **Feito:** bike como corpo com peso, suspensão nas rodas, empinar, giro no ar e pouso de verdade; pulo (▲, mais alto com ▼ antes) e pump; ajudas leves do ciclista; pista nova com 10 tipos de trecho (whoops, kickers com morro de pouso, vales com rampa, degraus, rampa gigante...); câmera que sobe nos saltos; medalhas recalibradas. Testado com jogadores automáticos. Publicado na página do Claude e no site.
- **Pendente:** o dono testar.

---

## 01/11/2026: BMX pintado e tubo do surfe refeito
- **O dono mandou:** as 8 pranchas do IAmiguinho na BMX, a pista nos 4 horários com os objetos, o modelo da bike e as ondas com as emendas corrigidas (o tubo com o fundo do barril pintado e a correnteza).
- **Feito:** BMX todo pintado (IAmiguinho, fundo, dunas, terra, vala, tábua, bandeiras e poeira, nos 4 horários) e na Prévia; tubo novo e correnteza pintada no surfe (o fundo provisório saiu). Página de pedidos: entregas marcadas e a bike aprovada como anexo. Publicado na página do Claude e no site; a página do jogo tem 503 de 511 arquivos.

---

## 01/11/2026: Patins com itens altos e mais espaço; Mortal do skate segurando ▼
- **O dono pediu:** itens que só se pegam com o pulo alto; mais espaço entre os Amiguinhos e os outros itens; no skate, o Mortal numa direção, segurando como o giro, mais mortais valendo mais e pousando em pé.
- **Feito:** itens altos dourados (impulso ou pulo do corrimão, valem 3×); Amiguinhos seguidos mais afastados, água de coco fora de cima do Amiguinho e espaço mínimo entre as coisas no chão; Mortal segurando ▼ (escolha do dono), com tombo se pousar no meio da volta. Publicado na página do Claude e no site.

---

## 01/11/2026: Patins com impulso e sempre com saída; Mortal no skate
- **O dono pediu:** Amiguinhos maiores; dar tempo de pular, fazer manobra e cair no corrimão (sugeriu agachar para pular mais alto); nenhuma combinação de obstáculos pode ser impossível; Mortal no skate.
- **Feito:** Amiguinhos 72%; impulso (agachado 0,25 s e pula: 25% mais forte, com halo azul); corrigido o pulo que sempre saía girando (era o que fazia bater no corrimão no meio da manobra); conferência de saída em todo padrão novo de obstáculos (atrasa ou tira o que ficaria impossível); Mortal no skate com dois botões juntos. Publicado na página do Claude e no site.

---

## 01/11/2026: Patins: ponta do corrimão, Amiguinhos pintados e pulo na cabeça
- **O dono pediu:** o deslize começar na ponta do corrimão (encostar na ponta pulando dava tombo); os Amiguinhos da pista pintados; pular na cabeça deles dar pontos, sem tombo, com eles caindo no chão.
- **Feito:** postes do corrimão nas pontas de verdade e uma folga na ponta (tombos na simulação caíram de 26 para 12 em 60 pulos); Amiguinhos pintados na cor de cada um; pisão vale 60 × combo, você quica e ele cai de cara no chão com estrelinhas. Publicado na página do Claude e no site.

---

## 01/11/2026: Tubo do surfe: pedido refeito e fundo provisório
- **O dono pediu:** refazer a arte das ondas, porque o buraco no meio do tubo deixava ver a onda do cenário.
- **Feito:** 3 pedidos novos do tubo (meio, entrada e fechamento) com o fundo do barril pintado, sem transparência, na página de pedidos. No jogo, até a arte chegar, o fundo do tubo é pintado com a própria água do teto, virada e mais escura. Publicado na página do Claude e no site.
- **Pendente:** a arte nova do tubo.

---

## 01/11/2026: Rede da cesta, surfe (mortal, ondas, faixa escura) e reações em 3/4
- **O dono pediu:** a rede presa no aro; o mortal do surfe girando pelo centro do corpo; as ondas sem cortes e no jeito da arte do mar; explicar o quadrado escuro com riscos (pedir arte se tiver função, tirar se não tiver). Mandou também as reações do pingue-pongue refeitas em 3/4.
- **Feito:** rede no ponto de encaixe do pacote; mortal pelo centro do corpo; tubo e espuma com a cor de cada horário (tirada das faixas da onda) e bordas macias, a água até o pé da tela; saiu a faixa escura da frente (não tinha função). A correnteza (o quadrado escuro que aparece da 3ª série em diante) tem função: ganhou pedido de arte na página de pedidos. Reações em 3/4 no jogo e na Prévia. Publicado na página do Claude e no site.
- **Pendente:** a arte da correnteza; o dono testar.

---

## 01/11/2026: Basquete: cesta parada, linha do meio como linha de 3, tabela e bola maior
- **O dono pediu:** tirar o andar da cesta e usar a linha do meio pintada na quadra como divisor dos 3 pontos (a linha desenhada pelo jogo não combinava com a arte); a bola bater no meio da tabela, não na beirada; a bola maior.
- **Feito:** cesta fixa em todas as séries; três pontos atrás da linha do meio, sem a linha extra; tabela centrada onde a bola bate; bola 30% maior no desenho (a física do aro ficou como antes, porque com a bola maior até o arremesso perfeito errava). Publicado na página do Claude e no site.

---

## 01/11/2026: Pedidos das reações do pingue-pongue refeitos em 3/4
- **O dono pediu:** refazer os prompts da comemoração e do lamento, porque de perfil o rosto não aparece. Antes ele tinha reenviado o mesmo pacote das reações (idêntico, nada mudou).
- **Feito:** os 4 pedidos reescritos em 3/4 na página de pedidos, com a referência de ângulo de cada personagem (a pose parada do vôlei). Os cartões refeitos começam sem "Feita".
- **Pendente:** o dono gerar as 4 pranchas novas; o jogo segue com as de perfil até lá.

---

## 01/11/2026: Reações do pingue-pongue pintadas
- **O dono mandou** o pacote das reações do tênis de mesa: comemoração e lamento do IAmiguinho e do Amiguinho, de raquete na mão.
- **Feito:** as 4 no jogo (depois de cada ponto e no fim da partida) e na Prévia. Corrigido o rosto aceso do Amiguinho nos quadros de costas e de lado (cobria o corpo). O IAmiguinho do pingue-pongue virou um atlas só. Publicado na página do Claude e no site; a página tem 496 de 511 arquivos.

---

## 01/11/2026: Quiosque do Coqueiral (pingue-pongue) pintado
- **O dono mandou** o cenário do pingue-pongue: fundo e meio-plano nos 4 horários (duas versões do meio-plano do dia) e as luzes da noite.
- **Feito:** no jogo, pelo relógio; o quiosque um pouco menor para ficar atrás da mesa. Publicado na página do Claude e no site.
- **Atenção:** a página do jogo está com 502 de 511 arquivos.

---

## 01/11/2026: Quadra da Laje (basquete) pintada
- **O dono mandou** o pacote do basquete: cenário nos 4 horários com as luzes, cesta modular, redes (parada, chuá, balanço), bolas (girando e em chamas), carrinho e a torcida em 6 cores.
- **Feito:** tudo no jogo; o basquete ficou todo pintado (IAmiguinho, Amiguinho defensor, cenário, cesta, bola e torcida). Publicado na página do Claude e no site.

---

## 01/11/2026: Amiguinho defensor do basquete pintado
- **O dono mandou** 6 pranchas do Amiguinho no basquete (marcação e pulo do toco, com tentativas repetidas).
- **Feito:** escolhidas as de 3/4 (como o Amiguinho do vôlei): marcando e pulo do toco, no jogo e na Prévia. Publicado na página do Claude e no site.

---

## 01/11/2026: IAmiguinho pintado no patins
- **O dono mandou** as 12 animações do IAmiguinho no patins (e, antes, o mesmo pacote do cenário do patins de novo: idêntico, nada mudou).
- **Feito:** as 12 no jogo (passada, agachado, salto, pegada, Aviãozinho, Tesoura, Mortal, os 3 corrimões, giro e queda) e na Prévia. Os atlas de cada personagem pintado foram juntados em uma imagem só (surfe, basquete e patins), e a página do jogo caiu de 501 para 473 arquivos.
- **Pendente:** o dono testar o patins, o surfe e o basquete.

---

## 01/11/2026: basquete (IAmiguinho) e patins (cenário) pintados
- **O dono mandou** 12 pranchas do IAmiguinho no basquete e o pacote do cenário do patins (orla, calçadão, luzes, obstáculos, prêmios e corrimão).
- **Feito:** basquete com as 6 pranchas escolhidas pela régua (andar, espera, carregando, arremesso, comemorar, errou), a bola nas mãos em cada quadro; patins com o Calçadão das Ondas pintado nos 4 horários e todos os obstáculos e prêmios. As 6 pranchas na Prévia. Publicado na página do Claude e no site.
- **Pendente:** o dono testar; o cenário do basquete e as pranchas do IAmiguinho no patins. A página do jogo está com 501 de 511 arquivos.

---

## 01/11/2026: surfe pintado no jogo
- **O dono mandou** as 11 pranchas do IAmiguinho no surfe e o pacote técnico do cenário (mar e céu e onda nos 4 horários, luzes da noite, tubo em 3 módulos, objetos e espuma).
- **Feito:** tudo no jogo, no lugar do 16 bits (`cart2/mvsf.py`, `cart2/sfcen.py`, `cart2/sfp.js`), desenhado em alta; régua com a cabeça igualada à do vôlei; as 11 pranchas na Prévia com o veredito "aprovada". Jogo publicado na página do Claude e no site.
- **Pendente:** o dono testar.

---

## 01/11/2026: prancha do surfe aprovada
- **O dono mandou** a folha de modelo da prancha do surfe (5 vistas, azul-clara com faixa creme).
- **Feito:** aprovada; a imagem virou anexo do cartão da prancha e de todos os pedidos do IAmiguinho no surfe na página de pedidos.

---

## 01/11/2026: pedidos de arte de todas as provas, com guias
- **O dono pediu:** "Monte os pedidos para todos os jogos. No artefato, para não ficar tudo misturado, crie guias para cada modalidade" (perguntou antes pelos prompts do surfe, que não existiam).
- **Feito:** a página "Pedidos das provas novas" virou "Pedidos de arte dos Jogos de Verão" (mesmo endereço), com uma guia por modalidade e a contagem de feitos em cada uma; pedidos novos para as 12 provas antigas (Surfe, Patins, Basquete, BMX, Corrida na areia, Frisbee, Tiro com arco, Duelo de água, Canoagem, Futebol de areia, Natação e Jet ski). Vôlei e Half-pipe têm guia com o link das páginas próprias.
- **Total:** 381 pedidos (antes 125). Arquivos: `novas/pedidos.py`, `novas/antigas1.py`, `novas/antigas2.py`.

---

## 01/11/2026: Teco-teco d'Água mais difícil (segunda rodada)
- **O dono disse:** continua bem fácil (fez 19.310 contra 9.160).
- **Causa:** os Amiguinhos não contavam a queda da gota e quase não atiravam de longe; e as argolas davam muitos pontos para quem ficava na frente.
- **Feito:** mira com a queda; tiro em qualquer alvo na linha; tanque enchendo de vez; argolas 120 / +40; acerto 0,86 a 0,96; aperto a partir de 600 pontos de vantagem (mais rápidos, fora da altura preferida, caçando com bexigas).
- **Testes:** novo `teco_humano.cjs` (jogador bom simulado): ganhou 3 de 8, por pouco (antes ganhava todas com o dobro dos pontos). Publicado no site e na página do Claude.

---

## 01/11/2026: Teco-teco d'Água mais difícil, Amiguinhos espalhados
- **O dono pediu:** o jogo estava fácil (26 mil pontos contra 5 a 7 mil); os Amiguinhos ficavam colados brigando pelas mesmas coisas; a cadência dos tiros estava alta e dava para ficar na frente de todo mundo atirando.
- **Feito:** cadência à metade e mais gasto de água; gotas com alcance menor; ninguém passa de 60% da tela; cada Amiguinho com um jeito e uma altura (Rosa alto e atrás, Amarelo no meio e nas argolas, Verde baixo, na frente e ladrão de último acerto); alvos e fileiras de argolas já escolhidos por um valem menos para os outros; desvio entre eles; quando você dispara no placar, eles apertam e caçam você com bexigas; tonto 2,8 s.
- **Testes:** `teco.cjs`: o jogador "na frente atirando" ganhou 2 de 6 (antes todas); Amiguinhos colados de 31% para 12% do tempo. Jogo publicado no site e na página do Claude.

---

## 01/11/2026: Teco-teco d'Água, aviões menores e tanque vazio
- **O dono pediu:** aviões menores, para ter mais área livre na tela; com o tanque vazio ainda dava para atirar.
- **Causa do tiro com o tanque vazio:** no alto o tanque enche bem devagar, e cada pinguinho de água já liberava uma gota.
- **Feito:** aviões 30% menores; tanque vazio trava a pistola até voltar a 25% (rasante enche em meio segundo). Jogo publicado no site e na página do Claude.
- **Testes:** `teco.cjs` (agora confere que nenhuma gota sai com o tanque vazio).

## 01/11/2026: Jogos de Verão, prova nova Teco-teco d'Água
- **Ideia do dono:** jogo de avião estilo navinha, com pistola d'água no teco-teco e bexigas d'água; alvos (balões, drones e outros); os Amiguinhos competindo pelos mesmos alvos; argolas e outras formas de pontuar; bexigas deixam os adversários tontos sem pontuar.
- **Feito:** a prova (`cart2/ev_teco.js`), jogável no computador, no controle e no celular, com o placar dos quatro, tanque que enche no rasante, cestas de bexigas de paraquedas, pipas, drones, patinho inflável, dirigível com alvos e argolas em sequência. Entrou no editor (Mecânicas), na trilha (Turbo Jet por enquanto) e na página de pedidos (11 pedidos de arte, incluindo o céu nos 4 horários). Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Testes:** `teco.cjs` (novo), `todas.cjs`, `trilha.cjs`, `wzeditor.cjs` (ajustado: as abas por posição).
- **Pendente:** o dono testar e dizer o que mudar (dificuldade dos Amiguinhos, quantidade de alvos, duração); a arte pintada.

## 01/11/2026: Pedidos, todos os cenários juntos e pedidos do brushset
- **O dono pediu:** separar todos os pedidos (prompts) de cenário na página de pedidos, para pedir todos ao ChatGPT; ele está montando um brushset com a arte do jogo (o ChatGPT gera as artes e depois os pincéis, e ele pinta artes próprias com a mesma estética).
- **Feito:** a página "Pedidos das provas novas" ganhou, logo depois dos anexos, a seção "Todos os cenários" (44 pedidos): Quiosque do Coqueiral (pingue-pongue), Vila dos Pescadores (bocha), Dunas Brancas (bugue), Praia do Centro (embaixadinha) e, trazidos da página do skate, o Skatepark do Viaduto e as peças da pista do half-pipe. Os cartões das provas são os mesmos (mesma marca de "Feita"); os do skate são novos nesta página. O galpão do teaser (vídeo) ficou de fora. No fim, "Depois: o brushset", com 2 pedidos novos: pontas de pincel (folha 4 x 3 com 12 pontas em branco sobre preto) e grãos que repetem (6 texturas em cinza, uma por resposta). Os cartões de cada prova continuam no lugar.

## 01/11/2026: Pingue-pongue, Amiguinho pintado (8 pranchas)
- **O dono mandou** as 8 pranchas do Amiguinho no tênis de mesa (com os prompts).
- **Feito:** recortadas e montadas como as outras do Amiguinho (massa igualada sem contar a raquete, pés presos, rosto aceso, cor do adversário com a raquete sempre vermelha), no jogo com as mesmas regras do IAmiguinho; a bolinha desenhada do saque saiu. Entraram na Prévia das pranchas e no editor. Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Pendente:** comemorar e lamentar dos dois com a raquete (pedidos na página).
- **Testes:** `ppintado.cjs` (agora com os dois), `pingue.cjs`, `ppkeys.cjs`, `pprakete.cjs`, `wzolhar.cjs`.

## 01/11/2026: Pedidos do pingue-pongue, comemorar e lamentar
- **O dono:** faltava o pedido (prompt) de comemorar e lamentar do pingue-pongue.
- **Feito:** a página "Pedidos das provas novas" ganhou, no fim do Pingue-pongue, os grupos "IAmiguinho: comemorar e lamentar" e "Amiguinho: comemorar e lamentar" (4 pedidos, 8 quadros cada, com a raquete aprovada junto, visor em branco, sem bola). Ficaram no fim da prova para não mudar a numeração dos pedidos já marcados como feitos. A nota da prova diz que as 8 pranchas do IAmiguinho já estão no jogo.

## 01/11/2026: Pingue-pongue, IAmiguinho pintado (8 pranchas)
- **O dono mandou** as 8 pranchas do IAmiguinho no tênis de mesa (pronto, passos de lado, topspin, cortada, efeito por baixo, saque, andando com a raquete atrás e balão).
- **Feito:** recortadas, medidas pela régua (todas dentro do modelo) e no jogo, com a raquete desenhada na mão e o rosto aceso no visor; a bolinha desenhada no saque saiu (o jogo usa a dele, posta na mão desenhada). Entraram também no editor (Rostos e quadros) e na Prévia das pranchas. Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Pendente:** as pranchas do Amiguinho no pingue-pongue (ele segue com o desenho do vôlei); comemorar e lamentar do IAmiguinho com raquete, se o dono quiser.
- **Testes:** `ppintado.cjs` (novo), `pingue.cjs`, `ppkeys.cjs`, `pprakete.cjs`.

## 01/11/2026: Corrida de bugue sem bugues (corrigido)
- **O dono:** a corrida de bugue abria só com a pista reta, sem bugues e sem o resto da tela.
- **Causa:** a pista Lagoa Azul aplicada no editor tinha 3 atalhos de lagoa com começo e fim quase no mesmo ponto (dois cliques quase no mesmo lugar). A lagoa ficava com tamanho negativo, o desenho da corrida dava erro e parava antes dos bugues.
- **Feito:** atalho curto demais fica de fora da corrida (`ev_bugue.js`); o editor não deixa criar atalho curto ("Atalho curto demais") e tira os que já existem ao carregar a pista (`WZ_SC_MIN` em `editor.js`). Os 2 atalhos de verdade da Lagoa Azul continuam. Jogo publicado no site e na página do Claude.
- **Testes:** `bgatalho.cjs` (novo), `bugue.cjs`, `bgcena.cjs`, `wzeditor.cjs` (escolhia as abas pela posição; agora pelo nome).

## 01/11/2026: Jogos de Verão, 15 músicas novas e volume da trilha
- **O dono mandou** 15 músicas (uma por prova) e pediu para igualar o volume de todas, inclusive as já aplicadas, sem a música cobrir os sons e efeitos das partidas.
- **Feito:** cada prova toca a sua faixa; todas as 22 igualadas em -18 LUFS; no jogo a música toca bem mais baixa (cerca de -30 LUFS) e os efeitos ficaram 2x mais altos; o volume de música das opções passou a valer para as faixas gravadas. Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Pendente:** a Soca do Coco ficou sem lugar (o dono decide se entra em algum lugar). No iPhone e no iPad o volume da faixa não muda pelo código, então lá a música fica relativamente mais alta.
- **Testes:** `trilha.cjs`.

## 01/11/2026: Modo TV desligado no site
- **O dono:** ao usar o controle nos Jogos de Verão, no site, o jogo fechava e abria o modo de controle do site (Modo TV). Pediu para tirar esse modo por enquanto.
- **Feito:** o Modo TV está desligado por uma chave (`MODO_TV` em `src/tv/mode.ts`): o controle não abre mais nada no site, os endereços /tv não abrem e quem estava no Modo TV volta ao site normal. O código fica guardado para religar depois. Detalhes em `site.md`.

## 01/11/2026: Pintura do editor, 3ª etapa (cara e gestos do Procreate)
- **O dono pediu:** no iPad a pinça com dois dedos pintava (o primeiro dedo virava traço); os .brushset do Procreate ainda não importavam; copiar uma camada para outros quadros, escolhendo quais (com "todos"), para reaproveitar desenhos na animação; a pintura com a aparência do Procreate (para achar os botões) e com as funções e gestos dele.
- **Feito:** a tela de pintura foi refeita no jeito do Procreate (galeria, barra de cima, barra do lado, janelas, assistente de animação); dedo só pinta depois de um instante e o segundo dedo cancela o traço; com caneta o dedo não pinta; importação sem filtro de tipo e mais tolerante; copiar camada para outros quadros alinhando pelos pés, salvando tudo de uma vez. Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Testes:** `wzpintura3.cjs` (novo), `wzsite.cjs` (atualizado), `wzbanco.cjs`, `wzrecarrega.cjs`, `wzolhar.cjs`.
- **Pendente:** o dono testar no iPad com a caneta e com um .brushset de verdade; se algum pincel não abrir, a mensagem diz o motivo.

## 01/11/2026: Pintura do editor, 2ª etapa (recursos do Procreate)
- **O dono:** a 1ª etapa funcionou; pediu a próxima, com recursos mais robustos como os do Procreate.
- **Feito:** borrar, seleção (laço e retângulo), transformar, ajustes (matiz, saturação, brilho, desfoque), linha reta segurando a caneta, gestos (2 e 3 dedos, dedo parado), tela que gira e espelha, tela cheia, cor em quadrado + matiz com paleta, camadas com modos de mistura, travar transparência e máscara de recorte, duplicar/subir/descer/limpar, ajustes por pincel, leitura das configurações do pincel do Procreate, pintura do visor (onde o rosto aparece), lado em abas. Detalhes em `jogos-de-verao.md`. Jogo publicado no site e na página do Claude.
- **Testes:** `wzpintura2.cjs` (novo), `wzpintura.cjs`, `wzsite.cjs`, `wzaovivo.cjs`.
- **Pendente:** o dono testar com a caneta; próximas ideias: seleção mágica, liquefazer, régua de simetria, dinâmica fina dos pincéis do Procreate.

## 01/11/2026: Jogos de Verão no site, desenho inteiro e pintura no editor
- **Pedido do dono:** editar a imagem do personagem (não só o rosto): tamanho, posição etc.; uma ferramenta de desenho/pintura com a caneta no estilo do Procreate, integrada ao editor, para personagens e cenários, com pincéis do Procreate e do Photoshop; e publicar o jogo e o editor no site.
- **Decidido (pergunta ao dono):** pintura própria, sem anúncios (Photopea descartado). Ela sai em etapas.
- **Feito:**
  - no site: `/jogos-de-verao` e `/studio/jogos-de-verao` (cartão no Studio); dados do editor na tabela `jogo_dados` e imagens na pasta `jogos` (migração 0097); começa com a semente (o que o dono já tinha no editor da página do Claude);
  - desenho inteiro por quadro: tamanho e giro (além de mover), em número ou arrastando;
  - aba Pintura, 1ª etapa (detalhes em `jogos-de-verao.md`);
  - correção: o que foi aplicado podia chegar antes dos desenhos carregarem e os rostos não entravam; agora espera a página montar.
- **Testes:** `wzpintura.cjs`, `wzsite.cjs` (novos), `wzbanco.cjs`, `wzdono.cjs`, `todas.cjs`, `trilha.cjs`. Teste da ponte do site: `src/lib/jogosPonte.test.ts`. Página do Claude também publicada.
- **Pendente:** o dono rodar a `0097_jogos_de_verao.sql` no Supabase; conferir no site com a caneta; próximas etapas da pintura (seleção, transformar, borrar, modos de mistura, ajustes finos dos pincéis importados, refazer a máscara do visor).
- **Conferido:** a verificação do GitHub (tipos, testes e build) passou e o Vercel publicou. Aqui a instalação das dependências do site falhou (sem acesso ao registro de pacotes nesta sessão).

## 01/11/2026: Vôlei, dificuldade até "impossível" no editor
- **Pedido do dono:** no editor, um limite de dificuldade do Amiguinho no vôlei em que o valor mais alto é "impossível" (não erra, não dá para ganhar), para ajustar a dificuldade dos campeonatos.
- **Feito:** seção "Dificuldade dos adversários" em Mecânicas > Vôlei (partida rápida, Torneio e Copa), barras de 0 a 1,2 com o nome do nível; no 1,2 o Amiguinho não perde ponto (detalhes em `jogos-de-verao.md`). Nenhum valor do jogo mudou; o dono escolhe. Jogo publicado.
- **Testes:** `vimpossivel.cjs` e `wzdificuldade.cjs` (novos), `todas.cjs`, `wzaovivo.cjs`.

## 01/11/2026: Editor do jogo, causa do rosto fora do lugar
- **O dono mostrou (fotos):** o rosto do run ajustado e salvo; no jogo o rosto estava em outro lugar; ao reabrir o editor, os números iguais mas o desenho como antes.
- **Causa:** o "olhar para a bola" do vôlei mexia o rosto dentro do visor e ficava guardado depois de jogar, mexendo também o desenho do editor. Salvar e carregar estavam certos.
- **Decidido (Claude, para o dono confirmar):** o rosto fica parado onde o dono pôs; o olhar virou um número em Mecânicas > Vôlei ("Rosto olhando para a bola", 0 = parado, 1 = como antes).
- **Testes:** `wzolhar.cjs` (novo), `wzaovivo.cjs`, `wzdono.cjs`, `wzbanco.cjs`, `todas.cjs`. Jogo publicado.

## 01/11/2026: Editor do jogo, rostos ainda sem valer (2ª tentativa)
- **O dono relatou:** continua igual; salva, abre o jogo e as mudanças não aparecem; no editor voltam os rostos do jogo.
- **Achado:** a configuração dele está inteira no banco e, aqui, faz o desenho mudar no jogo e no editor; a falha é na leitura do banco na página dele, que daqui não dá para ver.
- **Feito:** leitura por três caminhos e uma linha de conferência no editor (seção do editor em `jogos-de-verao.md`); imagem de antes e depois enviada ao dono. Jogo publicado.
- **Foto do dono (01h10):** página nova (01/11 01:03), banco e dono ok, aplicado lido pelos três caminhos (187 quadros), 187 quadros entraram no jogo às 01h09, rascunho e editor com 187. A leitura está funcionando. O último rascunho salvo no banco é de 00h43; nada foi salvo depois disso.
- **Pendente:** o dono conferir o vôlei e, ao mexer de novo, ver se aparece "Rascunho salvo" no alto do editor.

## 01/11/2026: Editor do jogo, rostos salvos que não voltavam
- **O dono relatou:** mexeu nos rostos do IAmiguinho do vôlei e aplicou; ao voltar ao editor, os rostos não estavam como ele aplicou, e no jogo as mudanças não valiam.
- **Achado:** o banco tinha tudo salvo certo; a leitura é que falhava (aceitava a primeira resposta, que pode ser uma cópia antiga do navegador; e, se o banco respondesse durante uma prova, o aplicado não entrava).
- **Feito:** leitura confirmada, sempre o mais novo, aplicado entrando ao fim da prova, gravações em ordem e gravação imediata ao fechar (detalhes em `jogos-de-verao.md`, seção do editor). Jogo publicado.
- **Testes:** `wzbanco.cjs` (novo), `wzeditor.cjs`, `wzaovivo.cjs`, `wzrostos_vivo.cjs`, `wzpista_estragada.cjs`, `trilha.cjs`.
- **Pendente:** o dono conferir no navegador dele (recarregar a página do jogo).

## 01/11/2026: Jogos de Verão, trilha sonora gravada
- **O dono mandou:** 7 músicas para a trilha ("Carnaval na Areia" é o tema).
- **Feito:** as músicas entraram no jogo no lugar das de código: tema na abertura, Disco do Caranguejo nos menus e resultados, Mambo do Pódio no pódio e cada prova com a faixa do seu tipo (tabela em `jogos-de-verao.md`, seção "Trilha sonora gravada"). Jogo publicado.
- **Testes:** `trilha.cjs` (novo).
- **Pendente:** o dono ouvir e dizer se quer mudar alguma prova de faixa.

## 31/10/2026: Teaser do IAmiguinho, 1ª versão
- **O dono mandou:** as 7 peças do teaser.
- **Feito:** o vídeo montado em 16:9 e 9:16 (33,5 s, com som de ambiente e efeitos, sem música); programas em `videos/teaser-iamiguinho/`; plano e detalhes em `ideias.md`.
- **Pendente:** o dono ver; a risada do cientista (áudio gravado).

## 31/10/2026: Teaser do IAmiguinho, pedidos das peças
- **Pedido do dono:** produzir o vídeo do teaser. **Escolhas:** peças pintadas por ele + animação do Claude; 16:9 e 9:16; ambiente e efeitos, sem música.
- **Feito:** os prompts das 7 peças na página de pedidos (seção "Teaser do IAmiguinho (vídeo)") e o plano de montagem em `ideias.md`.
- **Pendente:** o dono gerar as peças; a risada do cientista (gravar).

## 31/10/2026: Ideia registrada, teaser do IAmiguinho
- **Pedido do dono:** registrar a ideia de um teaser de apresentação do IAmiguinho (galpão escuro, linha de produção de robôs sem boné, o cientista põe o boné em um deles e ele acende o visor).
- **Feito:** a ideia completa ficou em `ideias.md` (arquivo novo, já no índice).
- **Pendente:** nada; só registrada.

## 31/10/2026: Jogos de Verão, raquete e bolinha do pingue-pongue pintadas
- **O dono mandou:** a folha da raquete (5 vistas) e da bolinha.
- **Feito:** raquete pintada (vermelha para o IAmiguinho, preta para o Amiguinho; 3/4 esperando, de frente preparada, de lado no meio da batida) e bolinha pintada; a folha virou anexo das pranchas do pingue-pongue na página de pedidos. Detalhes em `jogos-de-verao.md`.
- **Testes:** `pprakete.cjs` (novo), `pingue.cjs`, `todas.cjs`.
- **Pendente:** pranchas dos personagens do pingue-pongue e o quiosque.

## 31/10/2026: Editor do jogo, rosto ao vivo e botão
- **O dono relatou:** o botão só apareceu digitando "editor"; os rostos e quadros ainda não atualizavam ao vivo.
- **Feito:** a aplicação das mudanças não para mais no meio por causa de uma peça de pista fora do lugar (causa provável); o desenho é sempre refeito; o botão confere de novo quem é o dono algumas vezes. Detalhes em `jogos-de-verao.md`.
- **Testes:** `wzrostos_vivo.cjs` e `wzpista_estragada.cjs` (novos), `wzeditor.cjs`.
- **Pendente:** o dono confirmar.

## 31/10/2026: Editor do jogo, botão que não aparecia
- **O dono relatou:** o botão do editor não aparece.
- **Feito:** o editor espera a ponte da página chegar (até 12 s) antes de decidir se é o dono; aceita também quem pode editar; atalho de reserva digitando "editor" no teclado; aviso na barra de cima quando não reconhece o dono.
- **Pendente:** o dono confirmar no jogo publicado.

## 31/10/2026: Editor do jogo, explicações e rostos ao vivo
- **Pedidos do dono:** explicação de cada mecânica ao parar o mouse em cima; nos rostos e quadros, ver a mudança na hora em que muda o número.
- **Feito:** "?" com explicação em todas as linhas das mecânicas (e o valor original); números dos rostos e quadros atualizam o desenho enquanto digita, e acompanham o arraste. Detalhes em `jogos-de-verao.md`.
- **Testes:** `wzaovivo.cjs` (novo), `wzeditor.cjs`, `todas.cjs`.

## 31/10/2026: Editor do jogo, abre sempre e mais coisas arrastando
- **O dono relatou:** o editor abriu uma vez e não abriu mais. **Pediu:** tudo o que der, editar arrastando.
- **Feito:** botão e editor acima da tela de pausa; abertura que não trava; configuração guardada como texto no banco; perguntas dentro do editor (o navegador bloqueia as janelas de pergunta na página); rostos e quadros com 4 modos de arrastar, rodinha e o quadro anterior por baixo; aba nova "Cancha da bocha" para arrastar a cancha e o lançamento. Detalhes em `jogos-de-verao.md`.
- **Testes:** `wzeditor.cjs`, `todas.cjs`.
- **Pendente:** o dono confirmar que abre sempre no jogo publicado; próximas etapas do editor (artes, velocidade dos movimentos, outras fases).

## 31/10/2026: Jogos de Verão, editor do jogo
- **Pedido do dono:** um editor completo para mexer sem depender do Claude (escolheu: tudo, rascunho + aplicar, página separada).
- **Feito:** editor dentro da página do jogo, só para o dono (botão "Editor"), com Mecânicas, Pistas do bugue (mapa arrastável), Rostos e quadros, Textos e falas e Versões; rascunho salvo sozinho, Testar, Aplicar com versão; a página do jogo ganhou o banco (db, só o dono escreve) e o `user`. Detalhes em `jogos-de-verao.md`.
- **Decidido:** ficou dentro do jogo e não numa página separada, porque outra página teria outro banco e as mudanças não chegariam ao jogo (explicado ao dono).
- **Testes:** `wzeditor.cjs` (novo), `todas.cjs`, `copa.cjs`.
- **Pendente:** trocar artes pelo editor, velocidade dos movimentos e as outras fases (próximas etapas).

## 31/10/2026: Jogos de Verão, lagoa, esteiras, efeitos e relevo da bocha pintados
- **O dono mandou:** o relevo da bocha (montinho, buraco e areia fofa) e o zip com a lagoa, a esteira de turbo e os efeitos da corrida.
- **Feito:**
  - corrida de bugue: lagoa com a água mexendo, esteiras com as setas acendendo e os 6 efeitos pintados (detalhes em `jogos-de-verao.md`); a corrida ficou toda pintada;
  - bocha: montinhos, buracos e areia fofa pintados;
  - página de pedidos atualizada.
- **Testes:** `bgcena.cjs` (efeitos e esteira), `bcvila.cjs`, `copa.cjs`, `bgcolisao.cjs`, `bocha.cjs`, `todas.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Pedidos do que falta (bugue e bocha)
- **Pedido do dono:** fazer os prompts de tudo o que ainda é desenhado pelo jogo.
- **Feito (página de pedidos):**
  - corrida de bugue: "Lagoa do atalho", "Esteira de turbo" e "Efeitos da corrida", com as imagens aprovadas para anexar (folha de chão, dunas, bugue);
  - bocha: grupo novo "Relevo da cancha" com "Montinho, buraco e areia fofa", anexando a vila aprovada.
- **Já tinham pedido:** a bolinha de gude da embaixadinha e as pranchas do pingue-pongue.
- **Pendente:** o dono gerar as artes.

## 31/10/2026: Jogos de Verão, chão da pista pintado e a onda fora dos itens
- **O dono mandou:** a textura do chão da pista. **Pediu:** retirar a onda.
- **Feito:**
  - a faixa do chão deitada ao longo da pista, acompanhando as curvas sem emenda (detalhes em `jogos-de-verao.md`);
  - a onda não sai mais na caixa de item;
  - página de pedidos atualizada.
- **Testes:** `bgcena.cjs` (curvas de dia e de noite), `copa.cjs`, `bgitens.cjs`, `bgcolisao.cjs`, `todas.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, bugue com batida melhor, caixas, esteiras e o rodopio dos Amiguinhos
- **Pedidos do dono:** melhorar a batida entre bugues (se sobrepunham), a coleta das caixas (encostava e não pegava), caixa voltar em 2 s, esteiras de turbo mais largas e o prompt da textura da pista. Também mandou a prancha da derrapagem e do rodopio do Amiguinho.
- **Feito:**
  - bugues com corpo de dois círculos: não se sobrepõem mais (0,1 no máximo em 3 corridas);
  - caixa pega quando o bugue encosta, volta em 2 s; itens também acertam pelo corpo;
  - esteiras com o dobro da largura;
  - Amiguinhos derrapando e rodopiando pintados, na cor de cada um;
  - pedido novo "Chão da pista (faixa que repete)" na página de pedidos, com as dunas e a folha de chão para anexar;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bgcolisao.cjs` (novo), `copa.cjs`, `bgrec.cjs`, `bgitens.cjs`, `bgmureta.cjs`, `vacuo.cjs`, `todas.cjs`.
- **Pendente:** textura do chão da pista; o dono testar.

## 31/10/2026: Jogos de Verão, corrida de bugue com o cenário pintado
- **Pedido do dono:** fazer o pedido da derrapagem e do rodopio dos Amiguinhos (feito: novo cartão na página de pedidos, com 3 imagens para anexar; o cartão agora aceita várias imagens).
- **O dono mandou:** dunas em 3 horários, beira-mar, folha de chão, folha de peças, folha de itens e o farol.
- **Feito:** tudo isso no jogo (detalhes em `jogos-de-verao.md`), com a luz do horário na pista e nas peças; o desenho da corrida foi separado em partes (chão, muretas, rampas, largada, bandeiras, caixas, poças, projéteis, farol) para a versão pintada trocar cada uma.
- **Testes:** `bgcena.cjs` (novo), `copa.cjs`, `bgrec.cjs`, `bgitens.cjs`, `bgpintado.cjs`, `copafotos.cjs`, `todas.cjs`.
- **Pendente:** derrapagem e rodopio dos Amiguinhos; o dono testar.

## 31/10/2026: Jogos de Verão, bugues dos Amiguinhos, derrapagem e rodopio pintados
- **O dono mandou:** a prancha da derrapagem e do rodopio do IAmiguinho e a do bugue do Amiguinho.
- **Feito:**
  - IAmiguinho derrapando (areia saindo dos pneus de trás, espelhado para o outro lado) e rodopiando (estrelinhas rodando);
  - Amiguinhos com o bugue pintado, cada um na sua cor, com as rodas virando;
  - página de pedidos atualizada;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bgpintado.cjs`, `copa.cjs`, `bgitens.cjs`, `bgrec.cjs`, `todas.cjs`.
- **Pendente:** derrapagem e rodopio dos Amiguinhos (se o dono quiser), itens, peças da pista e dunas.

## 31/10/2026: Jogos de Verão, bugue pintado do IAmiguinho
- **O dono mandou:** a prancha do bugue do IAmiguinho visto de cima (reto, rodas para a esquerda e para a direita).
- **Feito:**
  - bugue pintado no jogo só para o IAmiguinho, com a hélice e os pneus girando conforme a velocidade e as rodas da frente virando com o volante;
  - os Amiguinhos seguem com o bugue desenhado pelo jogo até chegar a prancha deles;
  - página de pedidos atualizada;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bgpintado.cjs` (novo), `copa.cjs`, `bgrec.cjs`, `bgitens.cjs`, `bgmureta.cjs`, `todas.cjs`.
- **Pendente:** prancha do bugue dos Amiguinhos, derrapagem e rodopio, itens, pista e dunas.

## 31/10/2026: Jogos de Verão, bocha com os buracos no caminho
- **Pedido do dono:** os buracos concentravam a partida (as bolas tendiam a ir sempre para um buraco).
- **Medido:** os buracos ocupavam ~6% da cancha, mas o bolim parava dentro em 21% das rodadas e 26% das bolas acabavam num buraco (quando o bolim cai no buraco, todas as bolas vão atrás).
- **Testado e descartado:** buraco com areia fofa (piorou, 33%), buraco menor (25%), mais raso (20%), formato com borda mais curta (23%).
- **Feito:** os buracos ficam só na primeira metade da cancha, no caminho, longe de onde o bolim para; os montinhos continuam em qualquer lugar. Resultado: bolim no buraco 0%, bolas no buraco 4%; o equilíbrio contra o Amiguinho continua parecido.
- **Testes:** `bcburacos.cjs` (novo), `bocha.cjs`, `bcburaco.cjs`, `todas.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, vila da bocha pintada
- **O dono mandou:** a Vila dos Pescadores vista de cima em 4 horários e a camada das luzes da noite.
- **Feito:**
  - vila pintada no jogo, com o horário pelo relógio e as luzes acendendo à noite;
  - a cancha do jogo encaixada na cancha pintada (ficou um pouco mais baixa: 110 em vez de 120 de altura, mesma largura);
  - montinhos, buracos, areia fofa, pegadas e conchas tingidos pela luz do horário;
  - a palavra ROLAR/ALTO embaixo da barra de força não fica mais cortada;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bcvila.cjs` (novo), `bocha.cjs`, `bcburaco.cjs`, `bcamiguinho.cjs` e `todas.cjs`, sem erros.
- **Situação:** a bocha está toda pintada. Pendente: o dono testar.

## 31/10/2026: Jogos de Verão, Amiguinho pintado na bocha
- **O dono mandou:** as 4 pranchas do Amiguinho da bocha (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo), já sem bola.
- **Feito:**
  - Amiguinho pintado na bocha, com a bola rosa (ou o bolim) na mão na mira e saindo da mão ao soltar, igual ao IAmiguinho;
  - pranchas na Prévia das pranchas;
  - na publicação, saíram 177 imagens antigas que o jogo não usa mais (limite de 512 arquivos);
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bcamiguinho.cjs` (novo), `bocha.cjs` e `todas.cjs`, sem erros.
- **Pendente:** vila vista de cima pintada; o dono testar.

## 31/10/2026: Jogos de Verão, Bocha com a bola na mão e pedidos sem bola
- **Dúvida do dono:** pranchas com ou sem bola na mão (o ChatGPT fez com bola, ele pediu sem, e os textos dos pedidos pediam com).
- **Decidido:** sempre sem bola. O jogo desenha a bola certa (bolim ou bola do time) e controla a hora em que ela sai da mão.
- **Feito:**
  - na mira, o IAmiguinho segura a bola na mão, acompanhando o braço; ao soltar, ela sai da mão até a linha;
  - textos dos pedidos da bocha (IAmiguinho e Amiguinho) ajustados para "sem bola", página de pedidos republicada;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bcmao.cjs` (novo) e `bocha.cjs`, sem erros.
- **Pendente:** quando chegarem as pranchas do Amiguinho, marcar a mão dele do mesmo jeito.

## 31/10/2026: Jogos de Verão, Bocha com o IAmiguinho, as bolas e as peças pintadas
- **O dono mandou:** 4 pranchas do IAmiguinho da bocha (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo, sem bola na mão), a folha das bolas e a folha de conchas, pegadas e tábuas.
- **Feito:**
  - IAmiguinho pintado na bocha: espera, mira com o braço indo para trás conforme a força, lançamento, torcida e comemoração (punho e joinha) quando ganha;
  - bolas azuis, rosa e bolim pintados, girando enquanto rolam;
  - conchas, pegadas e tábuas da borda (com cantos) da folha pintada;
  - as 4 pranchas novas entraram na Prévia das pranchas;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bcpintado.cjs` (novo), `bocha.cjs`, `bckeys.cjs`, `bcburaco.cjs` e `todas.cjs`, sem erros.
- **Pendente:**
  - pranchas do Amiguinho da bocha (por enquanto, desenhos do vôlei);
  - vila vista de cima pintada;
  - o dono testar.

## 31/10/2026: Jogos de Verão, Embaixadinha com futebol primeiro, gaivota que atrapalha e dificuldade progressiva
- **Pedidos do dono:**
  - bola de futebol em primeiro na ordem;
  - a gaivota não estava atrapalhando;
  - maneiras de ter dificuldade progressiva.
- **Feito:**
  - rotação a partir da série 5: futebol, praia, gude, pingue-pongue;
  - gaivota na altura das bolas, com sombra igual à de uma bola, empurrando a bola quando encosta (pelo peso da bola), cada vez mais frequente e rápida;
  - novidades por série: pedidos da torcida (5), toque mais preciso (7), sombra tímida (8), areia fofa (9), gaivotas mais ousadas (11), além do que já subia;
  - os pedidos atendidos aparecem no resumo da partida;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `ebdif.cjs` (novo), `ebbolas.cjs`, `ebcena.cjs`, `ebpintado.cjs` e uma partida em tempo real com jogador automático.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, Embaixadinha toda pintada, bolas novas na rotação e física pelo peso
- **O dono mandou:** gaivota, biruta, folha das bolas, os 4 horários do fundo e do meio-plano da Praia do Centro e as luzes da noite (algumas em duas versões).
- **Pedidos dele:**
  - corrigir a comemoração que ficava em looping durante a partida;
  - tirar da rotação as duas bolas (confirmado: a bola extra, duas ao mesmo tempo);
  - pôr a bolinha de gude;
  - melhorar a física das bolas conforme o peso de cada uma.
- **Feito:**
  - cenário, bolas, biruta e gaivota pintados no jogo, com o horário pelo relógio e as luzes acendendo à noite;
  - comemoração corrigida;
  - rotação nova: praia, gude, pingue-pongue e futebol a partir da série 5; sem bola extra;
  - física pelo peso (gravidade, resistência do ar, vento, subida, espalhamento, curva, quique, rolagem e dança), com a sombra calculada pela mesma física;
  - bolinha de gude provisória desenhada pelo jogo, e o pedido dela na página de pedidos (79 pedidos).
- **Testes:** `ebbolas.cjs`, `ebcena.cjs` (4 horários e a comemoração), `ebpintado.cjs`, `todas.cjs`, e uma partida em tempo real com jogador automático (39 toques, sem erros).
- **Pendente:** o dono testar; a bolinha de gude pintada.

## 31/10/2026: Jogos de Verão, Embaixadinha com o IAmiguinho pintado
- **O dono mandou** as 11 pranchas do IAmiguinho da embaixadinha (algumas repetidas e uma segunda tentativa de andar). Faltam bolas, biruta, gaivota e cenários; ele está gerando.
- **Feito:**
  - recorte, régua e atlas (`mveb.py` → `mveb.js`) e o desenho no jogo (`ebp.js`), com a escolha de prancha e quadro pelo estado da prova;
  - prova desenhada em alta (3,2×);
  - ajustes para a bola encostar no desenho: cabeceio com 35% do pulo desenhado; toque de coxa na altura 22 (era 25);
  - as 12 pranchas foram para a Prévia com veredito (todas aprovadas; pé e coxa com a nota de que vieram um pouco de frente; a segunda de andar fica guardada);
  - correção de publicação: as imagens novas do jogo (pasta `img`) precisam ir junto com a página; a regra entrou em `jogos-de-verao.md`.
- **Pendente:** o dono testar; bolas, biruta, gaivota e cenário pintados.

## 31/10/2026: Página de pedidos com os anexos para o ChatGPT
- **Pedido do dono:** pôr na página dos pedidos das provas novas as grades e referências para colar no ChatGPT, como no vôlei.
- **Feito:**
  - seção "Anexos para o ChatGPT" no topo: fichas de modelo e grades-guia do IAmiguinho e do Amiguinho e a referência de estilo dos cenários;
  - cada grupo de pedidos mostra os anexos que usa (personagem: ficha e grade; objetos: ficha do IAmiguinho e estilo; cenários: estilo);
  - 8 referências de pose em cinza nos cartões da embaixadinha (desenhos antigos de 16 bits nos quadros certos da grade), e o texto desses pedidos explica para o ChatGPT como usá-las;
  - botões "Copiar imagem" (cola no ChatGPT com Ctrl+V) e "Baixar" (a página ganhou a permissão de downloads; o navegador pede confirmação).
- **Pendente:** o dono usar e dizer se o copiar imagem funciona no navegador dele.

## 31/10/2026: Jogos de Verão, Embaixadinha (pingue-pongue, sem marcas e pedidos do estilo pintado)
- **Pedidos do dono:**
  - pôr uma bola de pingue-pongue na rotação;
  - tirar os marcadores dos pontos de contato no IAmiguinho;
  - fazer os prompts do visual pintado.
- **Feito:**
  - bola de pingue-pongue nas séries 7, 11, 15… (a de praia segue nas 5, 9, 13…): cai mais devagar, o vento leva mais e ela dança a cada toque. Desenho provisório feito pelo jogo;
  - saíram as marquinhas das três alturas dos lados do IAmiguinho;
  - página de pedidos: nova seção "Embaixadinha (estilo pintado)" com 24 pedidos (11 pranchas do IAmiguinho, bolas, biruta, gaivota e o cenário da Praia do Centro em 2 camadas e 4 horários). A página passou a ter 78 pedidos;
  - detalhes em `jogos-de-verao.md`, seção Embaixadinha (nova).
- **Pendente:** o dono testar e mandar as pranchas.

## 31/10/2026: Jogos de Verão, embalo do vácuo, balão mais rápido e dois ajustes no vôlei
- **Pedidos do dono:**
  - bugue: ao sair do vácuo, a velocidade voltava na hora e não dava para ultrapassar;
  - bugue: o balão d'água era lento e errava muito;
  - vôlei: o placar escondia a bola quando ela chegava na altura dele;
  - vôlei: a bola ficava levemente menor no saque do Amiguinho, ao ser jogada para cima.
- **Feito:**
  - embalo do vácuo: a velocidade ganha continua por uns 3 s depois de sair de trás (até +20%), caindo aos poucos. Nos testes, dá para ultrapassar quem anda no máximo trocando de faixa;
  - balão d'água a 330 px/s (era 250) e virando mais rápido;
  - vôlei: a bola agora é desenhada depois do placar, então passa na frente dele;
  - vôlei: a bola na mão do Amiguinho era desenhada 17% maior (resto do desenho de 16 bits); agora fica sempre do mesmo tamanho.
- **Testes:** `vacuo.cjs` (embalo e ultrapassagem), `bgitens.cjs`, `bgvolante.cjs`, `copa.cjs`; fotos do vôlei com a bola na altura do placar e do saque.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, pistas do bugue mais 20% largas
- **Pedido do dono:** aumentar a largura das pistas em mais 20%.
- **Feito:**
  - largura de 148 para 178 px; caixas e faixas dos Amiguinhos acompanham;
  - correção que apareceu nos testes com a pista larga: dentro de um atalho, o quique na mureta mandava o bugue de volta para a entrada (usava o sentido da pista, não o do corredor). Agora segue o corredor;
  - os Amiguinhos que vão pegar o atalho miram primeiro a boca do corredor. As batidas na entrada da lagoa caíram de ~7 para ~1 por corrida.
- **Testes:** `copa.cjs` (nenhum bugue preso, Copa inteira), `bgmureta.cjs`, `bgrec.cjs`, `bgitens.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, pistas do bugue 20% mais largas
- **Pedido do dono:** aumentar a largura das pistas em 20%.
- **Feito:** a largura passou de 124 para 148 px nas 3 pistas. Acompanham a nova largura as fileiras de caixas, a areia fofa por dentro dos grampos, a rampa do salto do atalho e as faixas por onde os Amiguinhos andam. Os trechos de pista continuam bem separados e os atalhos continuam com mureta.
- **Testes:** `copa.cjs` (nenhum bugue preso, Copa inteira), `bgmureta.cjs` (64 batidas, nenhuma travou), `bgrec.cjs` e `bgitens.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, bugue com volante suave, itens para trás e mureta que quica
- **Pedidos do dono:**
  - a curva estava muito acentuada: tentando uma curva leve, o bugue ia muito para o lado e batia;
  - o balão que persegue passou por ele enquanto estava invencível, continuou perseguindo e acertou quando a invencibilidade acabou;
  - poder jogar itens para trás;
  - a batida na mureta travava o bugue; ele deve quicar, perder velocidade e seguir andando.
- **Feito:**
  - volante mais suave: vira aos poucos, volta rápido e vira bem menos em alta. Um toque de 0,15 s desvia 14 px (antes, 97 px);
  - projéteis que passam por um bugue invencível não o acertam mais (nem depois), e o balão vai atrás de quem estiver na frente;
  - ↓ + item (no celular, "Atrás") joga bola e balão para trás; ↑ + item joga o protetor para a frente. Os Amiguinhos também jogam para trás;
  - mureta quica: perde de 13% a 50% da velocidade, nunca para, e o bugue sai alinhado com a pista;
  - os Amiguinhos tiram o pé conforme o novo limite do volante;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `bgvolante.cjs`, `bgmureta.cjs` e `bgitens.cjs` (novos), `copa.cjs` (nenhum bugue preso), `bgrec.cjs`, `bgkeys.cjs`, `bgpresos.cjs`, `vacuo.cjs`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, bugue mais rápido, pistas em dobro e vácuo
- **Pedidos do dono:**
  - carrinhos 15% mais rápidos;
  - pistas maiores e mais elaboradas, com o dobro do tamanho;
  - ganhar velocidade no vácuo, atrás dos adversários.
- **Feito:**
  - velocidade máxima de 200 para 230 (turbo +92), com motor, freio e aderência subindo junto para as curvas continuarem fazíveis;
  - as 3 pistas redesenhadas com o dobro do tamanho: Lagoa Azul com chicane, laço e S, e 2 atalhos pela água; Duna do Farol com 5 grampos com areia fofa por dentro, farol entre as colunas e mar ao norte; Desce-Duna com 4 descidas, 3 subidas, atalho de areia fofa e o salto por cima da duna. Agora são 3 ou 4 rampas, 6 fileiras de caixas e 8 esteiras por pista;
  - o jogo agora aceita mais de um atalho por pista;
  - vácuo: atrás de outro bugue, até +14% de velocidade, linhas de vento em volta e, com 1,5 s, um turbo curto ("Vácuo!"). Vale para os Amiguinhos também;
  - detalhes em `jogos-de-verao.md`.
- **Efeito no tempo:** as corridas passaram a durar de 2,5 a 3,5 min (3 voltas), e a Copa uns 9 min. Se ficar longo, dá para baixar para 2 voltas.
- **Testes:** `copa.cjs` (nenhum bugue preso nas 3 pistas, Copa inteira até o resultado), `vacuo.cjs` (novo), `bgrec.cjs`, `bgkeys.cjs` e `bgpresos.cjs` (12 de 12 sem presos).
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, Copa das Dunas (bugue com 3 pistas)
- **Pedido do dono:** "Pode implementar o próximo jogo". Todas as provas novas do plano já estavam feitas. Entre a Copa das Dunas, uma Regata de veleiros, o Castelo de areia e a Pesca na jangada, ele escolheu a Copa das Dunas, a parte do plano que faltava.
- **Feito:**
  - menu do bugue com **Corrida** (pista escolhida no botão "Pista") e **Copa das Dunas** (as 3 seguidas, pontos 10, 8, 6, 4, 2 e 1, classificação entre as corridas, nota pela posição final);
  - **Duna do Farol:** 3 grampos, farol no meio, mar ao norte, areia fofa por dentro dos grampos e atalho de areia fofa;
  - **Desce-Duna:** descidas que embalam, subidas que seguram e atalho com salto por cima da duna;
  - Amiguinhos melhores em todas as pistas: frenagem antes das curvas, correção de faixa (as batidas fortes na mureta caíram de ~6 para 0 a 1 por corrida), desvio da areia fofa e uso ocasional do atalho com turbo;
  - um Amiguinho aparecia com o nome "Você" e a cor do jogador: virou o Amiguinho Amarelo;
  - página de pedidos: +3 pedidos (farol de cima, beira-mar, areia fofa e ladeiras), total de 54;
  - detalhes em `jogos-de-verao.md`.
- **Testes:** `testes/copa.cjs` (nenhum bugue preso nas 3 pistas, Copa inteira até o resultado), `testes/copafotos.cjs` e `testes/bgrec.cjs` nas 3 pistas.
- **Pendente:** o dono testar a Copa das Dunas.

## 31/10/2026: Jogos de Verão, bugue volta de frente depois de rodar e escapa da mureta
- **Pedidos do dono:**
  - depois de ser acertado e rodar, o bugue nunca pode ficar virado para trás: tem que voltar na direção certa, andando sozinho, com um tempinho de invencibilidade;
  - depois de bater, sair da mureta só acelerando e virando, sem precisar de ré.
- **Feito:**
  - depois do rodopio, o bugue se alinha com a pista e anda sozinho para a frente por 0,85 s;
  - invencível por cerca de 2,3 s (pisca): itens, balões e caixas não pegam nesse tempo;
  - parado ou devagar na mureta (ou virado para trás), acelerar gira o bugue para dentro da pista, e virar escolhe o lado;
  - perto de parar, a batida na mureta quase não torce o bugue.
- **Teste novo:** `testes/bgrec.cjs`. Nas 20 recuperações, o bugue voltou de frente e invencível. Nas 20 saídas da mureta, saiu só acelerando e virando (a mais lenta levou 1,3 s).
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, bugue com física de carro, 2 itens e esteiras
- **Pedidos do dono:**
  - as caixas de item em fileira contavam como uma só (quando um carro pegava, todas sumiam);
  - poder guardar até 2 itens;
  - esteiras de turbo na pista;
  - física mais avançada nos bugues.
- **Feito:**
  - cada caixa some sozinha;
  - cada bugue guarda até 2 itens;
  - 5 esteiras de turbo;
  - física nova: motor, aderência dos pneus com escorregão e marcas, giro com inércia, pulo com gravidade, batidas com impulso e torção, carroceria que balança;
  - os Amiguinhos tiram o pé antes das curvas, dão ré quando ficam presos e seguem o corredor da lagoa;
  - detalhes em `jogos-de-verao.md`.
- **Pendente:** o dono testar.

## 31/10/2026: Jogos de Verão, Corrida de bugue com mecânicas melhores
- **Avaliação do dono:** "Conceitualmente é parecido com o que imagino, mas precisa melhorar bastante nas mecânicas."
- **Pedidos dele:**
  - direção melhor;
  - pista mais larga;
  - bordas para o bugue não sair;
  - bater na borda perde velocidade, mas deve dar para evitar bater em alta velocidade nas curvas;
  - itens no R2 e equivalentes.
- **Feito:**
  - pista nova mais larga (124 px), com muretas de zebra e curvas abertas;
  - batida que perde pouco de lado e muito de frente;
  - direção suavizada;
  - derrapagem também no R1/L1;
  - item no R2/RT/ZR (botão 7) e V no teclado;
  - corredor da lagoa com muretas;
  - zoom um pouco mais aberto.
- **Correção encontrada nos testes:** ao bater na mureta, a direção do bugue dava uma volta inteira, e alguns ficavam rodando parados. Os ângulos agora são sempre comparados pelo caminho mais curto (teste: 0 bugues presos em 12 corridas).
- **Pendente:** o dono testar a direção nova.

## 31/10/2026: Jogos de Verão, paraquedismo removido; Corrida de bugue
- **Decisão do dono:** "Não ficou legal a execução da ideia, pode deletar esse jogo e partir para o próximo."
  - O Paraquedismo saiu do jogo, do `build3.py`, do repositório, da página de pedidos e do plano visual.
  - A ideia está descartada.
- **Corrida de bugue** (`cart2/ev_bugue.js`), entre o Jet ski e o Vôlei:
  - segue as regras do plano: vista de cima, 3 voltas contra 5 Amiguinhos;
  - largada com turbo, derrapagem com faísca azul e laranja, pulos, areia fofa e lagoa;
  - todos os 6 itens;
  - detalhes em `jogos-de-verao.md`.
  - A Copa das Dunas (3 pistas) fica para depois.
- **Página de pedidos:** a Corrida de bugue entrou com 8 pedidos (51 no total).
- **Pendente:** o dono testar a Corrida de bugue.

## 31/10/2026: Jogos de Verão, teco-teco removido; Paraquedismo em formação
- **Decisão do dono:** "Pode deletar esse jogo do teco teco, não ficou divertido."
  - O teco-teco saiu do jogo, do `build3.py`, do repositório (`cart2/ev_teco.js`, `testes/teco.cjs`) e da página de pedidos.
  - A ideia está descartada.
- **Paraquedismo em formação** (`cart2/ev_para.js`), entre a Canoagem e o Futebol de areia:
  - segue as regras do plano: 3 saltos com queda livre em formação (roda), abertura baixa e pouso guiado com freada;
  - detalhes em `jogos-de-verao.md`.
- **Página de pedidos:** o Paraquedismo entrou com 14 pedidos (57 no total).
- **Pendente:** o dono testar o Paraquedismo. Depois vem a Corrida de bugue.

## 31/10/2026: Jogos de Verão, 3D descartado; teco-teco em 2D com voo livre
- **Decisão do dono:** "Pode descartar essa versão 3D. Para o jogo de avião, retorne ao 2D porém com movimentação livre do teco teco."
  - O vôlei 3D saiu do jogo, do `build3.py` e do repositório.
  - O teco-teco 3D também saiu.
  - O three.js não é mais carregado.
  - Não usar 3D nas provas, a não ser que o dono peça de novo.
- **Teco-teco:**
  - volta o 2D de lado (percurso, marcos e desenho da 1ª versão), mas sem física de estol;
  - a tela anda sozinha, e o avião se move livre com ▲ ▼ ◀ ▶;
  - turbo no ✕ e looping no ○;
  - detalhes em `jogos-de-verao.md`.
- **Página de pedidos:** os pedidos de lado do teco-teco voltaram.
- **Pendente:** o dono testar o teco-teco com voo livre. Depois vêm o Paraquedismo e a Corrida de bugue.

## 31/10/2026: Jogos de Verão, Vôlei 3D (teste)
- **Pedido do dono:** "Vamos fazer um teste: Porte o jogo de vôlei para 3D."
- **Escolhas dele:** quadra 3D de verdade (andar para a frente e para trás, controles e Amiguinho novos) e os desenhos pintados como personagens.
- **Feito:**
  - prova nova "Vôlei 3D (teste)", no fim da lista; o vôlei 2D continua igual;
  - personagens pintados como recortes de papel dentro da cena 3D;
  - círculo na areia mostrando onde a bola cai;
  - detalhes em `jogos-de-verao.md`.
- **Pendente:** o dono avaliar o teste e decidir se o caminho é esse (e se vale para outras provas).

## 31/10/2026: Jogos de Verão, Voo do teco-teco refeito em 3D
- **Avaliação do dono:** "Ficou ruim a jogabilidade, é muito complicado fazer o avião subir. Ideal é que tenha movimentação livre. Faça em 3D."
- **Feito:**
  - voo livre em 3D com three.js r160 (do jsDelivr), câmera atrás do avião;
  - ◀ ▶ fazem a curva e ▲ ▼ sobem e descem; soltando, o avião se nivela sozinho, sem estol;
  - circuito de 28 argolas pela costa, com a próxima brilhando e uma seta na borda;
  - balões, gaivotas, rasante nos marcos, passagem por baixo do viaduto, looping, looping invertido e giro;
  - detalhes em `jogos-de-verao.md`.
- **Decisão técnica:** a cena 3D é desenhada numa tela à parte e copiada para a tela do jogo, então o resto do jogo não mudou.
- **Página de pedidos:** o Teco-teco agora pede só o céu panorâmico pintado (4 horários); as pranchas de lado saíram.
- **Pendente:** o dono testar o 3D, inclusive no celular.

## 31/10/2026: Jogos de Verão, Voo do teco-teco
- **Bocha:** depois da correção das bolas no buraco, o dono manteve como protótipo inicial.
- **Voo do teco-teco** (`cart2/ev_teco.js`), entre a Canoagem e o Futebol de areia:
  - segue as regras do plano visual: nariz com ↑ ↓, turbo, 90 s, argolas em sequência, balões, rasantes nos marcos, looping e batida que rodopia sem acabar;
  - física de avião com estol;
  - começa decolando da pista do aeroclube;
  - extra: passar por baixo do viaduto vale 900;
  - detalhes em `jogos-de-verao.md`.
- **Correções feitas nos testes:**
  - a lista do pódio geral exige que toda prova nova tenha no ranking de exemplo as 4 pessoas de `PEOPLE` (@duda, @carol, @rafa, @bia); a bocha foi corrigida também;
  - a multiplicação das argolas foi limitada a ×8, porque sem limite os pontos explodiam.
- **Página de pedidos:** o Teco-teco entrou com 18 pedidos (61 no total).
- **Pendente:** o dono testar o Teco-teco. Depois vêm o Paraquedismo e a Corrida de bugue.

## 31/10/2026: Jogos de Verão, bocha sem bolas "se tocando" no buraco
- **Bug que o dono viu (print):** duas bolas paradas no buraco com areia fofa ficavam se tocando por muito tempo, com os efeitos de batida piscando.
- **Causas:**
  - a rampa do buraco empurrava uma bola na outra e elas quicavam sem parar;
  - na areia fofa, a regra de parar usava o atrito da areia batida;
  - só a regra de segurança de 14 s encerrava a jogada.
- **Correções:**
  - batida devagar (menos de 30 px/s) não quica: as bolas se acomodam;
  - bola devagar encostada numa bola parada para;
  - a regra de parar usa o atrito do lugar (a areia fofa segura 4 vezes mais);
  - efeito e som de batida só em batidas de verdade.
- **Teste:** `testes/bcburaco.cjs` rola 4 bolas em cada buraco. Antes uma delas não parava (o teste corta em 8,3 s); agora todas param em até 3 s.

## 31/10/2026: Jogos de Verão, Bocha aprovada e areia desviando mais
- **Avaliação do dono:** achou a Bocha muito legal e desafiante e aprovou como protótipo inicial.
- **Pedido dele:** a areia desviava pouco; buracos, montinhos e areia fofa deviam pesar mais.
- **Feito:**
  - rampa 2,6 vezes mais forte;
  - 4 relevos maiores (2 montinhos e 2 buracos);
  - areia fofa com 4 vezes o atrito;
  - pegadas com o dobro do desvio;
  - buraco e montinho mais fáceis de distinguir no desenho.
- **Equilíbrio:** com jogadores automáticos, o muito bom venceu 2 de 3 partidas, o médio 1 de 3 e o fraco 1 de 3.
- **Próximo:** Voo do teco-teco.

## 30/10/2026: Jogos de Verão, Bocha na areia
- **Pingue-pongue:** o dono achou bacana e aprovou como protótipo inicial; agora é lapidar. Ele ainda vai testar o salvamento da bola que passa por cima.
- **Bocha na areia** (`cart2/ev_bocha.js`), entre o Futebol de areia e a Natação:
  - segue as regras do plano visual (bolim, joga quem está mais longe, rolar ou pelo alto, montinhos, conchas e pegadas, até 7);
  - com a cancha deitada na tela, a mira ficou em ▲ ▼ e o tipo de lance virou dois botões: ✕ rola e ○ joga pelo alto;
  - entraram tábuas baixas em volta da cancha: sem elas, o bolim saía em quase toda rodada e anulava o jogo;
  - Amiguinho que simula as jogadas;
  - detalhes em `jogos-de-verao.md`.
- **Página de pedidos:** a Bocha entrou com 15 pedidos (43 no total).
- **Pendente:** o dono testar a Bocha. Depois vêm o Teco-teco, o Paraquedismo e a Corrida de bugue.

## 30/10/2026: Jogos de Verão, Pingue-pongue refeito (andar livre e física de verdade)
O dono testou: o momento de bater ficou difícil e a física da bola estava fraca.
- **Pedido dele, nesta ordem:** andar livre (a principal mudança), física de bola de pingue-pongue de verdade e mais jogadas. Exemplos dados por ele:
  - toque perto da rede para cair perto da rede do outro lado;
  - bola forte que quica e passa por cima, para salvar lá atrás.
- **Feito:**
  - anda livre;
  - a raquete é preparada antes da bola chegar, e a batida sai quando a bola passa pelo ponto bom (sem janela de tempo apertada);
  - física com ar e efeito;
  - 4 golpes e mais o balão;
  - saque quicando do próprio lado, com rede no saque repetindo;
  - Amiguinho novo, que prevê a bola e anda até ela.
  - Detalhes em `jogos-de-verao.md`.
- **Página de pedidos:** +4 pranchas (andando com a raquete preparada e balão, para os dois personagens).
- **Pendente:** o dono testar de novo.

## 30/10/2026: Jogos de Verão, Pingue-pongue (penhasco e frescobol reprovados)
- **Decisão do dono:** Salto do penhasco e Frescobol reprovados (as ideias e a jogabilidade). Saíram do jogo, do `build3.py` e da página de pedidos, e não voltam. O Salto do píer saiu de vez.
  - Apagados `cart2/penhasco.py` e `cart2/ev_frescobol.js`.
  - Segue a ordem: Pingue-pongue (feito agora), Bocha, Teco-teco, Paraquedismo e Corrida de bugue, um por vez, com teste do dono antes do próximo.
- **Pingue-pongue** (`cart2/ev_pingue.js`), no lugar do Salto na lista:
  - o personagem anda sozinho até a bola, e quem joga escolhe a hora e a bola (rebatida, cortada ou curtinha com efeito, funda ou curta);
  - até 11, com 2 de vantagem; tem modo de 2 jogadores;
  - detalhes em `jogos-de-verao.md`.
- **Menu das provas de placar:** o cabeçalho de medalhas era fixo do vôlei; agora cada prova pode trazer o seu (`medShort` e `menu2`).
- **Página de pedidos:** agora tem só o Pingue-pongue, com 24 pedidos:
  - raquete;
  - 6 pranchas de cada personagem;
  - mesa;
  - cenário em 2 camadas e 4 horários; a capa é a noite.
- **Plano visual (doc):** saíram as linhas e as seções do Salto do penhasco e do Frescobol; agora são 21 provas.
- **Pendente:** o dono testar o Pingue-pongue (dificuldade e tempo da batida).

## 30/10/2026: Jogos de Verão, provas novas (1ª entrega: Salto do penhasco e Frescobol)
O dono pediu para desenvolver e publicar as provas novas.
- **Decisão do dono:**
  - fazer jogável já, com arte provisória, publicando junto uma página de pedidos das pranchas; a arte entra conforme ele mandar;
  - um jogo por vez, testando antes do próximo.
- **Ordem:** Salto do penhasco, Frescobol, Pingue-pongue, Bocha, Teco-teco, Paraquedismo e Corrida de bugue.
- **Salto do penhasco** (`cart2/penhasco.py`): o Salto do píer virou o penhasco.
  - Mesmas regras, 5 saltos de 6, 9, 12, 15 e 18 m (o último com vento); a dificuldade sobe com a altura.
  - Falésia e farol desenhados pelo jogo (provisórios); medalhas 6.500, 10.000 e 13.500.
- **Frescobol** (`cart2/ev_frescobol.js`):
  - Cooperativo contra o recorde, com 60 s e 3 bolinhas.
  - ✕ rebate: no tempo certo sai a batida certa (50 pontos); fora do tempo, bola alta (20).
  - ○ (ou ↑ + ✕) é a pancada (100 pontos); o parceiro erra mais com pancada atrás de pancada.
  - A bolinha acelera a cada troca; a cada 10 trocas, +0,5 no multiplicador.
  - Uma pessoa: o parceiro é o Amiguinho. Duas pessoas no computador (botão "2 jogadores"): A D + F (W + F pancada) e ◀ ▶ + Enter (↑ + Enter pancada).
  - Personagens: desenhos pintados do vôlei (espera, corrida e cortada no chão) e raquete desenhada pelo jogo; praia provisória.
  - Medalhas 900, 1.900 e 3.200, calibradas com jogadores automáticos.
- **Página nova:** "Pedidos das provas novas" (https://claude.ai/artifact/Y5hetAQfCRf1dykVoA3c6w, gerada por `novas/pedidos.py`), com as pranchas e os cenários de cada prova nova. Hoje tem penhasco e frescobol, 41 pedidos.
- Provas novas desenhadas em alta resolução: marcar `paint: true` na prova.

## 30/10/2026: Jogos de Verão, arrancar e frear emendando com a espera
O dono mandou prints quadro a quadro do Amiguinho: em pé com as mãos para os lados, depois inclinado com a mão na frente, depois agachado, depois em pé de novo.
- **Causa:** a prancha "Arrancar e frear" começa e termina em pé com as mãos para os lados, e a espera tem a mão na frente do corpo. A cada parada e saída, a pose pulava.
  - Além disso, ao parar, apareciam um ou dois quadros de corrida parado.
- **Correção (Amiguinho):**
  - sair do parado sempre passa pelo arrancar, só com os quadros 2 a 4;
  - parar sempre passa pelo frear, só com os quadros 5 e 6 (agachado, com a mão na frente), que emendam com a espera;
  - o frear começa assim que ele para de verdade.
- O teste `testes/repro.cjs` agora desenha na escala do jogo: antes, as imagens que ele salvava eram de uma tela antiga.

## 30/10/2026: Jogos de Verão, Amiguinho sem vai e volta embaixo da bola
O dono gravou o Amiguinho esperando uma bola alta: anda, para, anda de novo, com desenhos trocando.
- **Causa 1:** passinhos de ajuste (de 1 a 5 px) a cada replanejamento.
  - **Correção:** sem pressa (bola a mais de 0,45 s de chegar), ele só anda se a diferença passar de 11 px.
- **Causa 2:** na cortada, ele corria atrás de onde a bola estava naquele instante e pulava cedo. Ia para um lado e depois voltava flutuando atrás da bola.
  - **Correção:** no chão, vai para onde a bola vai estar logo depois do pulo e pula o mais tarde possível.
- **Causa 3:** ao começar a andar, a folga de 0,16 s deixava o desenho de parado deslizando.
  - **Correção:** sair do parado agora leva 0,05 s.
- **Resultado:** a força continua parecida. No mais difícil, o saque com cortada sai em 13 de 20 saques.

## 30/10/2026: Jogos de Verão, Amiguinho sem tremer ao se mexer
O dono mandou dois vídeos do Amiguinho tremendo.
- **Causa vista nos vídeos:** em poucos quadros, ele passava por espera, corrida, arrancada, recuo e espera de novo. Pequenas correções de posição do cérebro novo trocavam o desenho a cada quadro.
- **Correção:**
  - O desenho de locomoção (parado, correndo, arrancando, freando, recuando) agora sai da velocidade suavizada.
  - Cada um fica pelo menos 0,16 s; arrancar e frear ficam o tempo da animação.
  - Vale para os dois personagens.
- **Cérebro:** não troca o lugar planejado por diferença pequena (menos de 9 px e sem ganho claro), e o alvo anda suave.
- **Medição em uma partida** (trechos de locomoção com menos de 0,1 s):
  - Amiguinho: de 109 para 19;
  - IAmiguinho: de 68 para 24.
- A força do Amiguinho continua a mesma.

## 30/10/2026: Jogos de Verão, cabeça olhando para a bola sem tremer
O dono notou que o Amiguinho parecia tremer andando. Ele trocava muito rápido entre olhar para a frente e olhar para cima, e entre andar e ficar parado.
- **Olhar para a bola:** entre a espera e a espera olhando para cima ou para baixo, entraram dois desenhos do meio, a 1/3 e a 2/3 do caminho, no IAmiguinho e no Amiguinho.
  - Eles são feitos entortando um único desenho, sem misturar dois, o que deixaria fantasma (`cart2/mids.py`, `look_anims`).
  - A cabeça agora sobe e desce aos poucos, em cerca de um quarto de segundo, passando por esses desenhos.
- **Andar e parar:** ele só passa a andar acima de uma velocidade maior e só volta à espera abaixo de uma menor. Antes, andando devagar, trocava toda hora entre os dois desenhos.
- O Amiguinho ignora correções de posição muito pequenas, para não ficar dando passinhos no lugar.

## 30/10/2026: Jogos de Verão, cérebro novo do Amiguinho e animações sem tremer
O dono jogou de novo e relatou:
- o Amiguinho jogava a bola muito para trás;
- no saque, ele tocava a bola para o meio da quadra, facilitando a cortada perto da rede;
- ele usava pouco a cortada;
- ele errava o lado do peixinho em todos os níveis;
- as animações tremiam.

**Pedido do dono:** a assertividade do Amiguinho vai de 40% no nível mais fácil a 90% no mais difícil. No mais difícil, ela pode variar de 80% a 95% com a dificuldade que se adapta ao placar.

**Cérebro novo** (`cart2/aivolei.js`, usado só pelo Amiguinho; o jogador automático dos testes usa o antigo):
- **Planeja o toque:** antes de cada toque, ele simula (imagina) várias posições, pulando ou não, e escolhe a melhor. Pode mandar a bola para o outro lado, longe de você, ou levantar alto perto da rede para cortar em seguida.
- **Cortada:** ele calcula quando pular para a cortada dar certo, confirmando com a mesma física do jogo, e corta no ar quando dá.
- **Saque:** nos níveis altos, joga a bola mais alto e corta (no mais difícil, em cerca de 2 de cada 3 saques). O saque de toque vai rápido e longe de você.
- **Peixinho:** mergulha para o lado em que a bola vai cair. Antes ia para onde a bola estava naquele instante; esse era o erro.
- **Assertividade:** é sorteada uma vez por lance. Quando o sorteio sai errado, ele lê mal onde a bola cai, se posiciona torto, não corta ou mergulha tarde.
- **Simulação contra o jogador automático:**

  | Nível | Vitórias do jogador automático | Erros do Amiguinho por toque | Cortadas por partida |
  |---|---|---|---|
  | Fácil | 12 de 12 | 12,7% | 0,8 |
  | Médio | 10 de 12 | 8,5% | 9,5 |
  | Difícil | 2 de 12 | 4,9% | 10,8 |
  | Final | 0 de 12 (só 2 pontos por partida) | 4,9% | 12 |

**Animações sem tremer:** cada animação ganhou quadros intermediários entre desenhos parecidos, feitos por fluxo óptico (`cart2/mids.py`), no IAmiguinho e no Amiguinho do vôlei.
- O jogo mostra o quadro do meio na primeira metade de cada troca, então o movimento fica com o dobro de desenhos.
- Onde o quadro do meio sairia borrado (movimentos grandes, mãos que mudam muito de lugar), ele não entra.
- O skate ainda não tem quadros intermediários.

## 30/10/2026: Jogos de Verão, ajustes de jogabilidade (vôlei e skate)
O dono jogou e pediu os ajustes abaixo.
- **Vôlei, dificuldade:** o Amiguinho Dourado (final do torneio) estava fácil. O motivo, achado em simulação: quando ia cortar, ele se posicionava longe demais da bola; se a cortada não saía, a bola batia de lado na cabeça e ia reta na rede.
  - Agora, quanto mais forte o adversário, mais perto da bola ele se posiciona.
  - No nível mais alto, os erros por toque caíram de 5,6% para 2,3%, e as cortadas por partida subiram de 3,8 para 7.
  - Contra o jogador automático das simulações: nível fácil e médio quase sempre perdem; o difícil ganha 19 de 20; o final ganha 20 de 20, deixando cerca de 2 pontos.
- **Vôlei, dificuldade que se adapta:** é a mesma do 16 bits. Se você está na frente, o adversário se concentra e erra menos; se ele está na frente, pode relaxar. Os adversários fortes (difícil e final) agora sempre usam isso; antes era sorteado a cada partida.
- **Vôlei, pontos:** partida normal até 7 e final até 10, no torneio e na Copa. Antes era 5 nas primeiras fases.
- **Vôlei, cortada:** a cortada carregada até o fim sai até 14% mais rápida.
- **Vôlei, animação do Amiguinho com "cara de stop-motion":** o encaixe de cada desenho seguia o alto do corpo. Como a geleia inclina, os pés escorregavam até 6 pixels da quadra de um quadro para o outro.
  - Agora, parado no chão, os pés ficam presos. Andando ou no ar, segue o centro do corpo.
  - É o mesmo encaixe em todos os movimentos, para a troca entre eles não dar pulinho.
  - A Prévia também foi ajustada.
  - A troca de um quadro para o outro ficou parecida com a do IAmiguinho.
  - Se ainda parecer travado, o próximo passo são pranchas de quadros intermediários.
- **Skate, pouso mais difícil:**
  - cai com giro mais de 35° fora (antes 45°) ou faltando mais de 20% da manobra (antes 30%);
  - desequilibra acima de 10° (antes 15°) ou faltando mais de 4% (antes 6%).
- **Skate, bônus por segurar:** +60% da manobra por segundo segurado, até dobrar. O nome mostra o tempo, por exemplo "Superman (0,7 s)", e vale também nas combinadas.
- **Pendente:** o dono vai testar os botões no celular e os pontos das manobras combinadas.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei completo
- Chegaram mais 22 pranchas. Com elas, o Amiguinho tem todos os movimentos do vôlei na versão da ficha de modelo.
- **Entraram no jogo e na Prévia:**
  - saque, parte 5;
  - espera olhando para cima e para baixo;
  - cortada no ar;
  - cortada no chão;
  - cortada no chão andando;
  - especial;
  - peixinho;
  - comemoração;
  - tristeza.
- As duas pranchas "sem par" da leva anterior eram tentativas da parte 5 do saque.
- **Novidade no jogo:** o Amiguinho também olha para a bola, inclinando o corpo para cima ou para baixo como o IAmiguinho. E anda de verdade com o braço armado na cortada no chão; antes, só quicava no lugar.
- Quando vieram tentativas repetidas, ficou uma e as outras ficaram guardadas na Prévia como "outra tentativa".
- **Pendente no vôlei:** placar, menus e HUD pintados; ajustes de jogabilidade.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei (17 pranchas)
- Chegaram 19 pranchas novas do Amiguinho. Entraram no jogo e na Prévia:
  - posição de espera;
  - corrida (2 partes);
  - arrancar e frear;
  - andar para trás;
  - virar;
  - pulo (3 partes);
  - toque (2 partes);
  - manchete (2 partes);
  - saque, partes 1 a 4. A parte 5 ainda é a antiga.
- Tamanho igualado pela massa ao Amiguinho de antes, e cada quadro com a mesma massa. O visor ocupa a mesma parte do corpo que antes.
- Na corrida, o Amiguinho sobe metade da altura desenhada.
- Duas pranchas quase iguais (`bv2_x1` e `bv2_x2`) não batem com nenhum cartão. Ficaram fora do jogo; perguntado ao dono qual movimento são.
- **Faltam:** saque parte 5, cortada no ar (3), cortada no chão (2), cortada no chão andando (2), especial, peixinho (4), comemoração (2), tristeza (2) e espera olhando para a bola (2).

## 30/10/2026: Jogos de Verão, troca de provas
- **Saíram do jogo:** Salto de hélice, Corrida do isopor e Minigolfe. O código delas continua no backup em 16 bits. O Minigolfe vai para o Arcade do IAmiguinho, com os gráficos do Arcade.
- **Troca:** o Salto do píer vai virar Salto do penhasco, na Falésia do Farol. Enquanto o penhasco não fica pronto, o Salto do píer continua no jogo.
- **Provas novas aprovadas:**
  - Voo do teco-teco;
  - Frescobol (precisa ter modo para uma pessoa, com um Amiguinho de parceiro);
  - Paraquedismo em formação;
  - Pingue-pongue no quiosque;
  - Bocha na areia;
  - Corrida de bugue: vista de cima, com mecânicas de corrida de kart e itens para acertar quem corre contra.
- Com as novas, o jogo fica com 22 provas. Hoje o jogo publicado tem 16 provas, e os textos da tela não dizem mais o número.
- O plano visual (doc) ganhou o lugar, o horário da capa, a paleta, os extras, os desafios e as **regras propostas** de cada prova nova.
- O Parque do Boardwalk ficou sem prova. A ideia é que vire a porta do Arcade no mapa (a decidir).
- **Pendente:** o dono aprovar as regras propostas antes de começar qualquer prova nova.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei
- Começaram as pranchas novas do Amiguinho (com a ficha de modelo). Parado (partes 1 e 2) aprovado e já no jogo e na Prévia.
- Tamanho igualado pela massa ao Amiguinho de antes; cada quadro com a mesma massa (o 1º quadro da parte 1 tinha vindo 6% menor).

## 30/10/2026: Jogos de Verão, correção no skate
- No começo da partida, sem apertar nada, o IAmiguinho ficava trocando entre em pé e agachado. A causa era a demonstração do menu (o voo de exemplo), que era contada como um pulo e deixava o jogo achando que ele estava pousando. Agora só pulos de verdade, durante a partida, ativam o pouso.

## 30/10/2026: memória dos projetos
- Criados o `CLAUDE.md` na raiz e a pasta `docs/memoria/` (este histórico, `site.md`, `jogos-de-verao.md` e `lives.md`). Agora toda sessão começa lendo esses arquivos e termina atualizando o histórico.
- Fontes do Jogos de Verão guardadas em `jogos/jogos-de-verao/`: 107 pranchas aprovadas (856 quadros), programas, ficha, cenário do skate e páginas de pedidos. Testado: montar a partir delas gera o jogo publicado idêntico.

## 30/10/2026: Jogos de Verão, skate pintado
- **Giro no ar:** pranchas refeitas, com 14 vistas diferentes.
- **Manobras combinadas:** criadas as 6 combinadas com giro (Superman Giratório, Cristo Giratório, Foguete Espiral, Helicóptero, Indy Giratória e Rabeta Giratória).
  - Cada uma tem prancha própria, com 8 vistas.
  - Valem a manobra × 1,5, mais o giro, × 1,3.
  - A Melão ficou de fora porque o comando dela (↖) se confunde com o giro.
- **Segurar:** segurar o botão ou a direção mantém a manobra, e ela só termina ao soltar. Pousar segurando derruba.
- **Cenário:** Skatepark do Viaduto, nos 4 horários do relógio de quem joga, com camada de luzes à noite e a cor da luz na rampa. O chão passou a ser de concreto.
- **IAmiguinho:** todas as pranchas do skate pintadas e no jogo (chão, ar, flips, pegadas, botões, borda e tombo).
- **Pendente:** ajustes de jogabilidade do skate; um possível bônus por segurar mais tempo.

## 29 e 30/10/2026: Jogos de Verão, vôlei e decisões gerais
- **Vôlei do IAmiguinho:** refeito com a ficha de modelo e a grade-guia, em 38 pranchas.
  - Rosto aceso dentro do visor, olhando para a bola.
  - Espera com a cabeça acompanhando a bola.
  - Saque só jogando a bola para cima.
- **Plataforma:** o vôlei foi testado no Godot (`/demo/volei-godot`) e o Unity foi avaliado. Decisão: continuar no navegador.
- **Prévia das pranchas:** fica como página de trabalho para todas as pranchas.
- **Pendente:**
  - pranchas do Amiguinho no vôlei;
  - placar, menus e HUD pintados;
  - ajustes de jogabilidade do vôlei.
