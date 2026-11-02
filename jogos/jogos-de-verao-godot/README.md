# IAmiguinho: Jogos de Verão (Godot)

O jogo das provas na orla com o IAmiguinho, feito no Godot para ser lançado no Steam. Desde 02/11/2026, ele é desenvolvido aqui. A versão do navegador (`jogos/jogos-de-verao/` e `public/demo/jogos-verao/`) parou de receber mudanças.

## Para jogar no seu PC

1. **Baixe o Godot 4.7.2** (grátis), na versão padrão, não a ".NET":
   https://godotengine.org/download/archive/4.7.2-stable/
   É um arquivo .zip. Descompacte e abra o programa (no Windows, `Godot_v4.7.2-stable_win64.exe`). Não precisa instalar.
2. **Pegue a pasta do projeto:** é esta pasta, `jogos/jogos-de-verao-godot`. O Claude manda um .zip dela a cada rodada; descompacte em qualquer lugar.
3. Na primeira tela do Godot (Gerenciador de Projetos), clique em **Importar**, escolha o arquivo `project.godot` desta pasta e depois **Importar e Editar**.
4. Aperte **F5** (ou o botão ▶ no canto de cima à direita) para jogar.
   - Teclado: setas ou WASD; Espaço ou Z = ação (✕); X = ○; C = □; V = △; Esc = pausa.
   - Controle (Xbox, PlayStation, Steam Deck): direcional ou analógico, ✕ ○ □ △, Start = pausa.
5. Para fechar o jogo: Esc → Menu → Sair, ou F8 no Godot.

A primeira vez que o projeto abre, o Godot leva um minuto preparando as imagens e os sons. Depois abre rápido.

## Para mexer nos números

- **Medalhas, nomes e músicas das provas:** `nucleo/jogo.gd`, na lista `PROVAS` (dois cliques no arquivo, à esquerda, embaixo, em "Sistema de Arquivos").
- **Números de cada prova** (velocidades, pulo, tamanho da rede, dificuldade do Amiguinho...): ficam no começo do script de cada prova, em `provas/<prova>/`, com uma explicação em cima de cada um. Troque o número, salve (Ctrl+S) e aperte F5.
- Se algo der errado, é só pedir ao Claude para voltar como estava: tudo fica guardado no repositório.

## Como o projeto está organizado

| Pasta | O que tem |
|---|---|
| `cenas/` | menu, partida (placar de cima, explicação, pausa, resultado) |
| `nucleo/` | o que vale para o jogo todo: lista das provas, recordes, opções, controles, sons, música, base das provas |
| `provas/` | uma pasta por prova |
| `arte/` | as pranchas e cenários (tirados do jogo do navegador por `ferramentas/extrai_arte.py`) |
| `sons/` | os sons de desenho escolhidos pelo dono (um arquivo por som; `ferramentas/sons.py`) |
| `musica/` | as faixas gravadas do dono |
| `fontes/` | Archivo e IBM Plex Mono (licença livre, OFL) |
| `testes/` | testes automáticos com fotos (rodam no ambiente do Claude) |
