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
- **Redesign dos elementos em avaliação** (09/11/2026): o canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb) tem oito direções:
  - **Fresta 2:** a Fresta levada aos cards, campos e filtros;
  - **Monolito:** hardware de luxo, com teclas, LEDs e peso;
  - **Letreiro:** créditos de cinema, só tipografia e fios;
  - **Anamórfico:** luz de cinema, reflexo de lente, granulado e foco que muda;
  - **Impacto:** a vinheta como interface, com luz diagonal, pulso, faíscas e partículas;
  - **Ímã:** peças em duas metades que se afastam e se cravam, com a costura acendendo;
  - **Transmissão:** o pacote gráfico da live, com letreiro de LED, tarjas e cortinas;
  - **Cromo:** metal espelhado e laca negra, com reflexos que correm.

  O dono gostou mais da linha ousada da Impacto (09/11/2026).

  Todas aparecem em 8 páginas do site, no modo escuro e no claro. O gerador fica em `prototipos/redesign-elementos/`.

  O ChatGPT também vai propor as dele. Nada foi aprovado nem aplicado: até o dono decidir, vale o Fresta atual.

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
