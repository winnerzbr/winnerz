# Redesign dos elementos: as 5 direções

Gerador dos quadros do canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb).

- `themes/base.css`: as peças comuns (botão, card, capa, abas, filtros, etiquetas, nota, medidor, campo, interruptor, aviso, menu do topo).
- `themes/F.css`, `M.css`, `L.css`, `N.css`, `I.css`, `G.css`, `T.css`, `C.css`: o visual de cada direção (Fresta 2, Monolito, Letreiro, Anamórfico, Impacto, Ímã, Transmissão e Cromo), com as cores do modo escuro e do claro. `X.css` é a Impacto + Ímã: entra depois do `I.css` e troca só os botões (`CHAIN` no `gen.py`).
- `gen.py`: monta cada página (Início, Coleção, Jornada, Comunidade, WinnerZ Awards, Perfil, Preferências e Jogo, mais "Todos os elementos" nas direções 4 e 5) em cada direção e modo: `python3 gen.py <pasta de saída>`; `ONLY=GTC` gera só as direções escolhidas.
- Para conferir um quadro: tirar o `<helmet>` e o `<x-dc>` para um HTML comum e abrir no Chrome sem tela (`google-chrome --headless --screenshot`).
- `layout.py`: organiza o `canvas.json` (uma página do canvas por direção, fileira escura em cima e clara embaixo).

Os quadros feitos à mão (Hoje, Botões, Cards, Filtros, Campos, Aplicado, Mono*, Letreiro*) ficam só no canvas.

## Direções de 09/11/2026 (segunda leva): Pincel, Figurinha, Estojo, Quadrinho e Zênite
- Temas `P`, `S`, `E`, `Q` e `Z` em `themes/`.
- `P.css` e `S.css` são montados por `build_new.py` a partir de `P.tpl` e `S.tpl` (ele calcula as máscaras de pincelada e o contorno recortado do título). Rodar `python3 build_new.py` antes do `gen.py` quando mexer nos `.tpl`.
- Para gerar só essas: `ONLY=PSEQZ python3 gen.py <pasta de saída>`.
- A Pincel usa a fonte Caveat (o site já carrega) nos rótulos pequenos.
