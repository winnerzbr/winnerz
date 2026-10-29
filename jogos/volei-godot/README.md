# Vôlei de praia no Godot (teste)

Versão de teste do vôlei do IAmiguinho: Jogos de Verão feita no Godot 4.3, com a mesma física, IA e regras da versão do navegador e as pranchas pintadas do moveset.

- Página publicada: `/demo/volei-godot/` (arquivos em `public/demo/volei-godot/`).
- Para abrir no editor: Godot 4.3 → Importar → esta pasta (`project.godot`).
- Para gerar a página de novo: no editor, Projeto → Exportar → Web (já aponta para `public/demo/volei-godot/index.html`), ou pela linha de comando:
  `godot --headless --path jogos/volei-godot --export-release "Web" ../../public/demo/volei-godot/index.html`
  (precisa dos modelos de exportação do Godot 4.3 instalados).

Pastas: `scripts/` (partida, IA, desenho, controles e menus), `shaders/` (rosto aceso dentro do visor), `art/` (pranchas e cenário), `sons/` (efeitos).
