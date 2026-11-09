# Redesign dos elementos: as 5 direções

Gerador dos quadros do canvas "WinnerZ — revisão de design dos elementos" (artefato 3c961142-dafa-4536-8fab-836d3f514cdb).

- `themes/base.css`: as peças comuns (botão, card, capa, abas, filtros, etiquetas, nota, medidor, campo, interruptor, aviso, menu do topo).
- `themes/F.css`, `M.css`, `L.css`, `N.css`, `I.css`: o visual de cada direção (Fresta 2, Monolito, Letreiro, Anamórfico e Impacto), com as cores do modo escuro e do claro.
- `gen.py`: monta cada página (Início, Coleção, Jornada, Comunidade, WinnerZ Awards, Perfil, Preferências e Jogo, mais "Todos os elementos" nas direções 4 e 5) em cada direção e modo: `python3 gen.py <pasta de saída>`.
- `layout.py`: organiza o `canvas.json` (uma página do canvas por direção, fileira escura em cima e clara embaixo).

Os quadros feitos à mão (Hoje, Botões, Cards, Filtros, Campos, Aplicado, Mono*, Letreiro*) ficam só no canvas.
