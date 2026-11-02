# IAmiguinho: Jogos de Verão

Minigames de praia inspirados em California Games. Roda no navegador. Está no site do WinnerZ (www.winnerz.com.br/jogos-de-verao; o editor em /studio/jogos-de-verao) e continua publicado como página (artefato) no Claude.

## Decisões em vigor
- **Plataforma:** continua no navegador.
  - O Godot foi testado: o vôlei foi refeito nele e está em `/demo/volei-godot`, com o código em `jogos/volei-godot`.
  - O Unity foi avaliado e descartado.
- **Estilo:** desenho animado pintado no jogo inteiro, incluindo menus e HUD.
  - Os personagens seguem a ficha de modelo, com a grade-guia de proporções.
  - O 16 bits fica só como backup e nas provas que ainda vão ter as regras revistas.
- **Ordem de migração:**
  1. vôlei (feito);
  2. skate (feito);
  3. as outras provas, depois de revisar as regras de cada uma;
  4. as provas novas, depois que o dono aprovar as regras.
- **Animações:** desenhos inteiros quadro a quadro, de 12 a 24 quadros por movimento, em pranchas 4×2 com fundo verde.
  - O quadro mostrado segue a física do jogo.
  - Cada golpe tem o seu quadro de contato.
- **Cenários:** cada prova tem um lugar próprio na Costa WinnerZ, sem repetir cenário.
  - Todo cenário existe em 4 horários (manhã, dia, entardecer e noite), e o jogo usa o relógio de quem joga.
  - Ver o doc "Jogos de Verão: plano visual".
- **Itens conquistáveis:** só visuais (cenários, bolas, skates…), ganhos usando o site. Nunca mudam pontos nem física.

## Provas
O plano tem 19 provas, e o jogo publicado tem 19 (com o Teco-teco d'Água, de 01/11). Os lugares, as paletas e as regras propostas de cada prova estão no doc do plano visual.
- **No jogo:** Surfe, Half-pipe, Embaixadinha, Patins, Basquete, Pingue-pongue, BMX, Corrida na areia, Frisbee, Tiro com arco, Duelo de água, Canoagem, Teco-teco d'Água, Futebol de areia, Bocha na areia, Natação, Jet ski, Corrida de bugue e Vôlei.
- **Retiradas em 30/10/2026:** Salto de hélice, Corrida do isopor e Minigolfe. O código delas fica no backup em 16 bits (`verao/index.html`). O `build3.py` só as tira da lista. O Minigolfe vai para o Arcade do IAmiguinho.
- **Reprovadas pelo dono em 30/10/2026 (as ideias e a jogabilidade):** Salto do penhasco e Frescobol. Saíram do jogo e não voltam. O Salto do píer também saiu de vez.
- **Pedidos de arte de todas as provas (01/11, pedido do dono):** a página de pedidos agora cobre as 19 provas, com uma guia para cada modalidade (o dono pediu para não ficar tudo misturado).
  - As 12 provas antigas que ainda não tinham pedido ganharam os seus (`novas/antigas1.py`: Surfe, Patins, Basquete, BMX, Corrida na areia, Frisbee; `novas/antigas2.py`: Tiro com arco, Duelo de água, Canoagem, Futebol de areia, Natação, Jet ski), montados a partir do que cada prova desenha hoje (poses, objetos, visão de lado ou de cima, panoramas que repetem) e dos lugares e capas do plano visual.
  - Em cada uma: primeiro o equipamento (prancha, patins, bike, disco, arco, pistola, caiaque, jet ski), que vira anexo; depois as pranchas do IAmiguinho (4 × 2, 8 quadros), as do Amiguinho quando a prova tem rival, os objetos em fundo verde e o cenário (dia como base, manhã, entardecer, noite e as luzes da noite).
  - Onde o Amiguinho do vôlei já serve (parado, correndo, comemorar, triste), a prova usa o do vôlei e só pede o que falta. A bola do futebol e a biruta vêm da Embaixadinha.
  - **Surfe, prancha aprovada (01/11):** azul-clara com faixa creme e quilha azul-marinho, em 5 vistas (`novas/anexos/ref_prancha_surfe.jpg`). Está no cartão da folha de modelo e em todos os pedidos do IAmiguinho no surfe, para anexar junto.
  - São 381 pedidos na página (168 de cenário em "Todos os cenários"). Os cartões de cenário são os mesmos nas duas guias: marcar "Feita" numa marca na outra.
- **Surfe pintado (01/11):** IAmiguinho, cenário, onda, tubo, objetos e espuma pintados; detalhes na seção "Surfe pintado".
- **Basquete (01/11):** IAmiguinho pintado. **Patins (01/11):** cenário, obstáculos e corrimão pintados. Detalhes nas seções próprias.
- **Novas:** feitas uma por vez, jogáveis com arte provisória. Os pedidos das pranchas e dos cenários ficam na página "Pedidos das provas novas" (`novas/pedidos.py`), e a arte entra conforme o dono manda.
  - Feitas:
    - Pingue-pongue (`cart2/ev_pingue.js`): aprovado como protótipo, agora é lapidar;
    - Bocha na areia (`cart2/ev_bocha.js`): aprovada como protótipo ("muito legal e desafiante"), agora é lapidar;
    - Corrida de bugue (`cart2/ev_bugue.js`): em ajustes com o dono; a Copa das Dunas (3 pistas) foi feita em 31/10 e espera o teste dele.
  - Todas as provas novas do plano foram feitas.
  - Removido também: Paraquedismo em formação ("não ficou legal a execução da ideia").
  - Removido: Voo do teco-teco. O dono testou 3 versões (de lado com física, 3D e 2D com voo livre) e achou que não ficou divertido.
    - Voltou em 01/11 com outra ideia do dono: **Teco-teco d'Água** (`cart2/ev_teco.js`), uma navinha com pistola d'água e bexigas, contra 3 Amiguinhos. Detalhes na seção própria.
  - Cada prova nova fica num arquivo `cart2/ev_<prova>.js`, com `paint: true` para ser desenhada em alta resolução.

  | Prova | Lugar | Pontos principais |
  |---|---|---|
  | Pingue-pongue no quiosque | Quiosque do Coqueiral | 1 contra 1, partida até 11, cortada e bola com efeito; pode ser jogado em duas pessoas |
  | Bocha na areia | Vila dos Pescadores | vista de cima, mira e força, rolar ou bater, até 7 pontos |
  | Corrida de bugue | Dunas Brancas | vista de cima, corrida de kart: derrapagem com turbo, largada com turbo e itens de praia (bola, balão d'água teleguiado, protetor solar, água de coco, guarda-sol); 3 voltas e a Copa das Dunas com 3 pistas |

### Pingue-pongue (como funciona, 2ª versão)
O dono reprovou a 1ª versão (andar sozinho até a bola e acertar o tempo exato). Pediu andar livre, física de bola de pingue-pongue de verdade e mais jogadas.
- **Andar livre:** ◀ ▶ andam do fundo até a rede. Quem saca fica atrás da mesa.
- **Bater:**
  - aperta o golpe antes da bola chegar: a raquete fica preparada (até 1,15 s) e a batida sai sozinha quando a bola passa pelo ponto bom (na frente do corpo, na altura do peito);
  - apertar com a raquete preparada troca o golpe;
  - o aperto feito durante o fim da batida anterior vale para a próxima.
- **Qualidade da batida:** depende do lugar onde a bola passa (perto do ponto bom), do tempo de preparo (mais de 0,2 s é cheio; até 0,55 s a bola sai mais forte), da força da bola que chegou e de estar correndo na hora.
  - Preparado, anda mais devagar.
  - Batida perfeita mostra "Perfeita!".
- **Golpes:**
  - ✕/Espaço: rebater (topspin);
  - ○/X: cortada (forte; com a bola baixa erra muito);
  - □/C: efeito (cortada por baixo, bola baixa e lenta);
  - △/V: toque curto (cai perto da rede; de longe da mesa sai ruim).
  - ▲ segurado manda funda; lá de trás da mesa, ▲ + rebater vira balão. ▼ segurado manda curta.
- **Física:**
  - gravidade, resistência do ar e efeito: topspin mergulha e acelera no quique; efeito por baixo flutua e freia (o toque curto quica duas vezes na mesa);
  - devolver bola com efeito usando rebatida tende a mandar na rede; devolver topspin com efeito tende a subir;
  - bola na fita às vezes passa;
  - o tempo da bola corre a 85% para dar tempo de reagir;
  - a mira calcula o ângulo pela física (evita quinas e passa a rede com folga), e o erro vem da qualidade;
  - rastro da bola: laranja com topspin, azul com efeito por baixo.
- **Regras:**
  - saque: aperta o golpe para jogar a bola para cima, e a batida sai sozinha; ▲ ▼ mudam a profundidade;
  - o saque quica primeiro do seu lado; se tocar na rede e cair certo, repete;
  - até 11, com 2 de vantagem; o saque troca a cada 2 pontos (a cada ponto no 10 a 10).
- **Amiguinho** (mesmo cérebro dos testes):
  - prevê a bola pela física, escolhe onde bater e vai até lá;
  - erra por tempo de reação, posição e preparo, conforme o acerto: 0,74 de base, entre 0,55 e 0,9 conforme o placar;
  - escolhe cortada na bola alta, toque curto com o jogador longe, efeito contra bola baixa com efeito por baixo, balão quando está muito atrás, e funda ou curta conforme a posição do jogador.
- **2 jogadores:**
  - Jogador 1: setas ou A D W S, com Espaço, X/E, C/Q, V/R, ou o 1º controle.
  - Jogador 2: J L I K, com Enter, O, U, P, ou o 2º controle.
- **Pontos e medalhas:** iguais (vitória 1.500 + 100 por ponto de diferença; bronze 8 pontos, prata vencer, ouro vencer por 5).
- **Testes:**
  - `testes/pingue.cjs`: jogadores automáticos contra o Amiguinho; troca média de 6 a 11 batidas;
  - `testes/ppkeys.cjs`: teclado, saque e 2 jogadores;
  - `testes/todas.cjs`.
- **Arte provisória (até 01/11 para o IAmiguinho; o Amiguinho segue assim):** desenhos do vôlei (espera, corrida, recuo, golpe no chão e andando agachado com o golpe pronto). A página de pedidos ganhou "Andando com a raquete preparada" e "Balão (defesa lá atrás)" para os dois personagens (28 pedidos).
- **IAmiguinho pintado (01/11):** as 8 pranchas do dono chegaram e estão no jogo (`cart2/mvpi.py` → `mvpi.js`, window.MVPI; desenho em `cart2/ppi.js`; pranchas em `jogos/jogos-de-verao/pingue/pranchas`, quadros `cart2/mv2/pp_*`). A raquete vem desenhada na mão: nesses quadros o jogo não desenha a raquete separada.
  - Escalas pela régua (cabeça igualada à do vôlei): pronto 1,064 · passos de lado 1,009 · topspin 1,040 · cortada 1,017 · efeito 1,015 · saque 1,043 · andando com a raquete atrás 1,059 · balão 1,099. Cabeça de cada quadro igualada à mediana da prancha (±12%). O meio da cabeça (âncora) não conta a raquete vermelha.
  - Qual prancha aparece: parado → pronto (laço); andando → passos de lado (para trás, ao contrário); preparado andando → andando com a raquete atrás; preparado parado → os quadros antes do toque do golpe (o braço vai para trás com o tempo de preparo); depois da batida → do toque até o fim. Rebater = topspin, cortada = cortada, efeito e toque curto = efeito, balão = balão. Toque no quadro 4 (no balão e no saque, 5).
  - Saque: bolinha na mão (1), jogando para cima (2 e 3), raquete atrás (4), batida (5 a 8). A bolinha desenhada saiu dos quadros 1 a 3 (o jogo desenha a dele); na mão, a bolinha do jogo aparece no lugar da mão desenhada e, ao subir, volta ao caminho de sempre em 0,15 s (só o desenho; a física é a mesma).
  - Comemorar e lamentar: pintados desde 01/11 (ver "Reações pintadas" abaixo).
- **Amiguinho pintado (01/11):** as 8 pranchas dele chegaram (com os prompts usados, guardados em `pingue/pranchas/prompts_amiguinho`) e estão no jogo: `cart2/mvbpp.py` → `mvbpp.js` acrescenta as animações ppEspera, ppLado, ppTopspin, ppCortada, ppEfeito, ppSaque, ppAndar e ppBalao ao desenho do Amiguinho do vôlei (mesma montagem: massa igualada, pés presos parado, centro da massa andando, rosto aceso, quadros do meio, cor do adversário).
  - A raquete (vermelha, na mão) não conta na massa nem no lugar dos pés (`cart2/ppred.py`) e não muda de cor com a cor do adversário (`animb2.js`).
  - Escala pela massa (sem a raquete): pronto 1,012 · pulinhos 1,047 · topspin 1,027 · cortada 1,069 · efeito 0,999 · saque 0,986 · pulinhos com a raquete atrás 0,978 · balão 0,967.
  - Mesmas regras do IAmiguinho (`ppi.js`); toque no quadro 4 (balão 5, saque 6: no saque, quadros 4 e 5 com a raquete atrás enquanto a bola sobe). A bolinha desenhada do saque saiu (no quadro 1 ela estava encostada em cima da mão; tirada pela cor branca); a do jogo fica na mão desenhada.
  - No editor (Rostos e quadros), as animações pp* aparecem no "Amiguinho".
  - Página do jogo no Claude: 441 de 512 arquivos. 
  - No editor (Rostos e quadros): "IAmiguinho no pingue-pongue".
  - Prévia: as 8 entraram somando à página publicada (`previa_pp.py`).
  - Teste: `testes/ppintado.cjs` (folha com os 8 movimentos e fotos do jogo).
- **Raquete e bolinha pintadas (31/10):** folha do dono (frente vermelha, de lado, 3/4, inclinada, verso preto e a bolinha), montada em `cart2/mvpp.py` -> `mvpp.js` (window.PPA) e desenhada por `cart2/ppp.js`. IAmiguinho com a borracha vermelha e o Amiguinho com a preta; esperando: 3/4 (o Amiguinho, o verso); preparada: de frente; no meio da batida: de lado; 14 unidades de comprimento, girando em volta do meio da cabeça (a mesma posição e giro de antes); a bolinha pintada no lugar da desenhada (o placar continua por cima quando ela passa no alto). A folha virou anexo das pranchas na página de pedidos. Teste: `testes/pprakete.cjs`.

- **Quiosque do Coqueiral pintado (01/11, imagens do dono em `pingue/arte`):** `cart2/ppcen.py` → `ppcen.js`; desenho em `ppp.js` (troca o `drawScene`; a mesa, a rede e os personagens são os de antes).
  - Fundo (céu, mar, ilha e barcos) e meio-plano (quiosque de palha, varal de lâmpadas, coqueiros e dois Amiguinhos no balcão) nos 4 horários pelo relógio, misturando perto da troca; de noite as luzes dos dois por cima (estrelas, lua, barco; lâmpadas coloridas e a luminária do quiosque) e a luz quente sobre a mesa.
  - O meio-plano entra em 85% do tamanho, preso no meio da tela, para o quiosque ficar atrás da mesa (no tamanho cheio o balcão encostava na mesa).
  - Vieram duas versões do meio-plano do dia: ficou a que bate com os outros horários; a outra (`meio_dia_outra.png`, banquinhos mais baixos e cocos verdes) fica guardada.
  - Teste: `testes/ppcena.cjs` (os 4 horários).
- **Reações pintadas (01/11, pacote do dono em `pingue/pranchas_reacoes`):** comemoração e lamento dos dois, de raquete na mão.
  - IAmiguinho: `cart2/mvpi.py` ganhou festa e lamento (escala 1,064, igual ao pronto). Amiguinho: `cart2/mvbpp.py` ganhou ppFesta e ppLamento (1,012).
  - Quando aparecem (`cart2/ppi.js`): depois de cada ponto e no fim da partida, quem fez o ponto comemora e quem perdeu lamenta; os 8 quadros correm em ~0,7 s e param no último. Antes era o desenho do vôlei com a raquete separada.
  - Rosto aceso do Amiguinho: nos quadros de costas ou de lado o contorno escuro era confundido com a tela e o brilho cobria o corpo; agora, se a "tela" passa de 60% do quadro, o quadro fica sem rosto aceso (pós-processo no `mvbpp.py`).
  - O IAmiguinho do pingue-pongue virou um atlas só (`junta_arquivo('mvpi.js','MVPI')`), como os do surfe, basquete e patins.
  - Prévia: as reações entraram somando à página publicada (`previa_ppr.py`). Teste: `testes/ppreacao.cjs`.
  - **Em 3/4 no jogo (01/11, pacote `IAmiguinho_Tenis_de_Mesa_Reacoes_3_4`):** as 4 pranchas novas substituíram as de perfil (guardadas em `pingue/pranchas_reacoes/perfil`), mesmos nomes, mesmo caminho (`mv2/cutf.py`, `mvpi.py`, `mvbpp.py`, build, `previa_ppr.py`). O rosto aparece em todos os quadros, menos no 6 do lamento do Amiguinho (o visor visto de cima). O quadro 8 é igual ao 1.
  - **Antes (pedido refeito em 3/4 (pedido do dono, 01/11):** as quatro vieram de perfil (o gerador chegou a corrigir para "strict side profile") e o rosto não aparece. Os pedidos foram reescritos na página de pedidos (guia Pingue-pongue, fim): câmera em 3/4 virada para a frente e para a direita em todos os quadros, como o IAmiguinho e o Amiguinho parados no vôlei; visor largo e sempre à vista, nada na frente dele; raquete na mão do lado direito da imagem. Novos anexos: `novas/anexos/ref_34_iamiguinho.jpg` e `ref_34_amiguinho.jpg` (quadros `v2_ready_0` e `bv2_espera_0`). No `pedidos.py`, os textos de câmera ficam em `CAM_IA`/`CAM_BL`; um cartão pode ter `kv` (sufixo da chave do "Feita") para um pedido refeito não aparecer como feito, e a contagem só soma cartões que existem.
  - Quando chegarem: trocar as pranchas em `pingue/pranchas_reacoes` e rodar de novo `mvpi.py`, `mvbpp.py` e o build (o rosto aceso do Amiguinho volta a aparecer, porque o visor fica visível).
- **Arquivos da página publicada (01/11):** 497 (474 imagens, 22 músicas e a página), limite 511. Ao publicar, mandar as imagens novas e tirar (null) as que a página não usa mais; a publicação recusa tirar arquivos que a conversa não viu, então listar os arquivos da página antes (Artifact list, scope files).

### Bocha na areia (como funciona)
- **Cena:** vista de cima, na Vila dos Pescadores (pintada, ver "Vila pintada"). A cancha tem tábuas baixas em volta. IAmiguinho joga com as bolas azuis e o Amiguinho com as rosa, 4 para cada lado; o bolim é laranja.
- **Ordem:**
  - quem começa a rodada joga o bolim, que tem que parar da metade da cancha para a frente; se não parar, a vez passa ao outro lado e, na 2ª falha, ele vai para o meio;
  - depois, quem jogou o bolim joga a primeira bola;
  - em seguida joga sempre quem está mais longe dele;
  - quem ganha a rodada joga o próximo bolim.
- **Controles:**
  - ▲ ▼ miram;
  - segurar ✕/Espaço rola, e segurar ○/X joga pelo alto;
  - a força sobe e desce enquanto segura, e soltar lança;
  - mira e barra de força aparecem só na vez de quem joga.
- **Física:**
  - a areia tem atrito forte;
  - montinhos e buracos desviam a bola, e a areia fofa freia muito;
  - conchas são obstáculos e pegadas entortam um pouco a bola;
  - reforçado em 31/10, a pedido do dono:
    - montinhos e buracos desviam cerca de 3 vezes mais: uma bola que passa na beira desvia uns 17 px, contra 6 antes;
    - a bola rola morro abaixo e pode parar no fundo do buraco;
    - a areia fofa freia 4 vezes mais que a areia batida;
    - as pegadas entortam o dobro;
    - são 2 montinhos e 2 buracos por partida, maiores;
    - buracos só na primeira metade da cancha (31/10, a pedido do dono): espalhados, eles puxavam a partida (ocupavam ~6% da cancha, mas o bolim parava dentro em ~1 de cada 4 rodadas e ~1 de cada 4 bolas terminava num buraco). Agora ficam no caminho (centro entre 62 px depois da linha e 40% da cancha, raio 20 a 28): desviam a bola que passa e seguram a fraca; os montinhos continuam em qualquer lugar. Medido em 24 partidas automáticas: bolim no buraco 0%, bolas no buraco 4%;
    - no desenho, o buraco tem o fundo escuro e a borda clara, e o montinho tem o brilho em cima;
  - parada: bola devagar para quando a rampa é mais fraca que o atrito do lugar ou quando está encostada numa bola parada; batida devagar não quica;
  - as bolas batem umas nas outras, e o bolim é mais leve;
  - a bola pelo alto voa, cai e quase para; se cair em cima de outra, tira ela do lugar;
  - nas tábuas a bola bate e volta fraquinha;
  - só sai do jogo a bola que cai fora pelo alto;
  - se o bolim sair, a rodada é anulada.
  - O terreno é sorteado a cada partida.
- **Pontos:**
  - no fim da rodada, cada bola mais perto do bolim que a melhor do outro lado vale 1 ponto;
  - linhas tracejadas mostram a medida;
  - quem faz 7 vence.
  - Avisos: "Encostou!" (bola colada no bolim) e "Tirou!" (a melhor bola do outro lado ficou bem mais longe).
- **Amiguinho:** testa centenas de jogadas com a mesma física (divididas em vários quadros), escolhe a melhor (ficar mais perto, tirar a bola do outro, evitar tirar o bolim) e erra força e mira conforme o acerto (0,72 de base, entre 0,5 e 0,9 conforme o placar).
- **2 jogadores:** um de cada vez, nos mesmos botões.
- **Medalhas:**
  - bronze 400 (fazer 4 pontos), prata 1.500 (vencer), ouro 1.900 (vencer por 4);
  - vitória vale 1.500 + 100 por ponto de diferença.
- **Testes:**
  - `testes/bocha.cjs`: o jogador automático muito bom venceu 3 de 3, o médio 2 de 3 e o fraco 0 de 3;
  - `testes/bckeys.cjs`: teclado;
  - `testes/bcpintado.cjs`: fotos do IAmiguinho pintado (mirando, soltando, pelo alto, torcendo, esperando);
  - `testes/bcmao.cjs`: fotos ampliadas da bola na mão (quadros 1 a 4 de rolando e pelo alto, bolim) e saindo da mão;
  - `testes/bcamiguinho.cjs`: o mesmo para o Amiguinho (espera, mira, soltura, torcida, vitória);
  - `testes/bcvila.cjs`: fotos da vila nos 4 horários e na troca, com a cancha do jogo encaixada;
  - `testes/bcburacos.cjs`: quanto os buracos puxam a partida (bolim e bolas dentro de buraco no fim das rodadas; aceita variações de teste: menor, fofo, rasa, compacto).
- **Arte pintada (31/10):**
  - o dono mandou 4 pranchas do IAmiguinho (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo), a folha das bolas (4 azuis, 4 rosa e o bolim laranja) e a folha de conchas, pegadas e tábuas;
  - as pranchas do IAmiguinho vieram sem bola na mão, como pedido: a bola do jogo é desenhada à parte;
  - uso no jogo (`cart2/bcp.js` e `cart2/mvbc.py`):
    - esperando a vez: enquanto o Amiguinho joga;
    - na mira: quadros 1 a 4 de "rolando" ou "pelo alto" conforme a força (o braço vai para trás); ao soltar, quadros 5 a 8;
    - com a bola andando: torcendo, quadros 1 a 6; rodada ou jogo ganho: quadros 7 e 8 (punho e joinha);
    - perdeu: continua a tristeza do vôlei;
  - bola na mão (31/10, pedido do dono): na mira, o IAmiguinho segura a bola azul (ou o bolim, na vez do bolim) na mão do quadro atual; a bola vai para trás e para a frente com o braço e, ao soltar (quadro 5), voa da mão até a linha em 0,16 s, crescendo até o tamanho da cancha; a bolinha da fila ao lado dele some enquanto ela está na mão; a barra de força foi um pouco mais para a esquerda para não cobrir a mão de trás;
  - decidido em 31/10: pranchas da bocha sempre SEM bola (o jogo desenha a bola na mão, porque ela muda entre bolim e bola do time e precisa sair da mão na hora certa); os textos dos pedidos (IAmiguinho e Amiguinho) foram ajustados para "sem bola" e a folha das bolas não precisa mais ir de anexo;
  - bolas giram conforme rolam; conchas, pegadas e as tábuas da borda (com cantos) vêm da folha pintada;
  - escala: régua da cabeça igualada (torce 1,027, alto 0,984, rolar 1,047, espera 1,044);
  - pranchas guardadas em `jogos/jogos-de-verao/bocha/pranchas`; já estão na Prévia das pranchas.
- **Amiguinho pintado (31/10):**
  - o dono mandou as 4 pranchas dele (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo), sem bola;
  - montadas em `cart2/mvbcb.py` (mesma montagem do vôlei, `mvb2.py`: massa igualada, pés presos no chão, máscara da tela e rosto) e acrescentadas ao desenho do Amiguinho do vôlei como animações bcEspera, bcRolar, bcAlto, bcTorce; escala pela massa: espera 0,969, rolar 0,974, alto 0,989, torce 0,997;
  - usa as mesmas regras do IAmiguinho: espera, mira com a bola na mão (quadros 1 a 4 pela força), soltura no 5, torcida 1 a 6, ganhou 7 e 8; perdeu: tristeza do vôlei;
  - no lançamento pelo alto, a mão em forma de coração do quadro 5 é a mão abrindo na soltura;
  - pranchas em `jogos/jogos-de-verao/bocha/pranchas` (bl_*) e na Prévia das pranchas.
- **Vila pintada (31/10):**
  - o dono mandou a vila vista de cima em 4 horários (manhã cedo, dia, entardecer, noite) e a camada das luzes da noite (janelas e reflexo da lua no mar);
  - montada em `cart2/bccen.py` -> `bccen.js` (window.BCC); o horário vem do relógio, com a troca misturando dois horários por 1 hora (5h, 10h, 16h, 19h), igual à embaixadinha; à noite as luzes acendem por cima, piscando de leve;
  - a cancha pintada (lado de dentro das tábuas: x 261 a 1837, y 365 a 880 na imagem de 1920x1080) fica exatamente em cima da cancha do jogo; para casar com o desenho, a cancha do jogo ficou um pouco mais baixa: y de 75 a 185 (era 70 a 190), mesma largura;
  - com a vila pintada, as tábuas são as do desenho (as da folha de peças ficam de reserva) e o chão da cancha não é mais desenhado pelo jogo;
  - montinhos, buracos, areia fofa, pegadas e conchas recebem a luz do horário (camada tingida: manhã alaranjada leve, entardecer laranja, noite azul);
  - artes em `jogos/jogos-de-verao/bocha/arte`.
- **Bocha toda pintada:** personagens, bolas, peças e vila. Montinhos, buracos e areia fofa pintados desde 31/10 (folha do relevo 3x2: redondos em cima, ovais embaixo; montinho e buraco usam o redondo com 2,35 x o raio; a areia fofa usa o oval quando é 25% mais comprida que larga, com 2,2 x os raios), dentro da camada que recebe a luz do horário; montado em `cart2/bccen.py` (BCC.rel) e desenhado por `bocha.drawRelief` em `cart2/bcp.js`. Na derrota, a tristeza ainda é a do vôlei.

### Corrida de bugue (como funciona)
- **Cena:** Dunas Brancas, vista de cima, câmera seguindo o bugue com o norte para cima (82% de zoom, para ver mais à frente). 3 voltas contra 5 Amiguinhos.
- **Pista (2ª versão, 31/10):**
  - largura de 178 px desde 31/10 (era 124; o dono pediu +20% duas vezes: 148 e depois 178); as caixas, a areia fofa dos grampos, a rampa do salto e as faixas dos Amiguinhos acompanham a largura; desde 31/10 as pistas também têm o dobro do tamanho (ver "As 3 pistas da Copa");
  - muretas de zebra vermelha e branca em toda a volta: bater de lado perde pouco (6%) e de frente perde muito (até 61%); o bugue escorrega junto da mureta e alinha com ela;
  - não há mais saída para a areia fofa.
- **Física dos bugues (3ª versão, 31/10):**
  - motor que perde força perto da velocidade máxima (230 px/s desde 31/10, 15% a mais a pedido do dono; com turbo, +92; motor, freio e aderência subiram junto), freio, ré curta e arrasto;
  - pneus com limite de aderência: o bugue escorrega de lado quando passa do limite e deixa marcas na areia;
  - giro com inércia: o volante vira menos em alta e, entrando rápido demais, o bugue sai de frente;
  - parado de cara na mureta, acelerando ou freando, ele ainda vira;
  - derrapagem: começa com um pulinho, os pneus de trás seguram menos e a carga só conta com o bugue escorregando de lado;
  - pulo com gravidade: pousar alinhado dá turbo; pousar torto perde 28% do embalo; o bugue amassa no pouso;
  - batida na mureta (31/10, o dono achou que travava): o bugue quica para longe dela, perde de 13% (raspão) a 50% (de frente) da velocidade, nunca fica abaixo de 60 px/s e sai alinhado com a pista sem precisar virar; por 0,3 s não quica de novo;
  - dentro de um atalho, o quique leva o bugue no sentido do corredor (antes usava o sentido da pista e mandava o bugue de volta para a entrada);
  - os Amiguinhos que vão pegar o atalho miram primeiro a boca do corredor e só depois a saída (direto na saída, raspavam na quina da mureta);
  - batidas entre bugues trocam impulso e torcem o bugue;
  - a carroceria balança para fora nas curvas;
  - na água, os pneus seguram menos e a água freia (o turbo atravessa);
  - item acertado faz o bugue rodopiar com pouca aderência.
  - depois do rodopio, o bugue nunca fica virado para trás: se alinha com a pista e anda sozinho para a frente por 0,85 s; fica invencível por uns 2,3 s, piscando (nada pega nele, nem caixa de item);
  - de cara na mureta, parado ou virado para trás: acelerar gira o bugue para dentro da pista (virar escolhe o lado), sem precisar de ré; devagar, a batida quase não torce o bugue.
- **Esteiras de turbo:** 8 por pista (setas amarelas andando); passar por cima dá 0,8 s de turbo.
- **Vácuo (31/10, pedido do dono):** logo atrás de outro bugue (até 140 px, andando na mesma direção, acima de 110 px/s) o bugue pega o vácuo: até +14% de velocidade máxima, motor 30% mais forte e menos perda de embalo; linhas de vento passam em volta dele. Segurando 1,5 s no vácuo, sai com um turbo curto ("Vácuo!"). **Embalo (31/10, o dono não conseguia ultrapassar):** a velocidade ganha no vácuo continua depois de sair de trás do adversário e vai caindo em uns 3 s (até +20% de velocidade máxima); as linhas de vento continuam enquanto dura o embalo. Teste: saindo do vácuo a 262 px/s, 1 s depois ainda está a 267 e 2 s depois a 261 (o normal é 230); colado atrás de quem anda no máximo e trocando de faixa, passa em 2,7 s. Vale para todos, Amiguinhos também. O resumo da corrida conta quantos vácuos.
- **Controles:**
  - ◀ ▶ viram. Volante mais suave desde 31/10 (o dono achou que curvas leves viravam demais): segurando, o volante vai virando aos poucos (0,3 s até o fim) e volta rápido ao soltar; a resposta é suave no começo (bom para o analógico); em alta as rodas viram bem menos (ângulo máximo 0,56 parado e 0,22 a 230 px/s). Um toque de 0,15 s a 230 px/s desvia 14 px (antes, 97 px); segurando, faz uma curva de raio ~130;
  - ✕/Espaço acelera e ○/X freia (no celular acelera sozinho, e os botões são Freio, Derrapa e Item);
  - R1, L1 ou □ (C no teclado) segurado na curva derrapa, com um pulinho no começo: com 0,85 s vem a faísca azul (turbo curto) e com 1,7 s a laranja (turbo longo); o turbo sai ao soltar;
  - **R2 usa o item**, como o dono pediu (é o botão 7 do padrão: RT no Xbox, ZR no Switch; V no teclado). O △ não usa mais o item.
  - **Item para trás (31/10):** ↓ (ou o analógico para baixo) + o botão do item joga para trás; no celular, o botão "Atrás". ↑ + item joga o protetor longe para a frente.
- **Pista:**
  - **Largada:** contagem 3, 2, 1, Vai!; acelerar de 0,5 s antes do Vai em diante dá turbo, e cedo demais afoga.
  - **Pulos:** 3 ou 4 rampas por pista; pousar alinhado dá turbo curto.
  - **Atalhos:** corredores retos com muretas cortando por dentro de curvas, com água ou areia fofa no meio; só compensam com turbo.
  - **Caixas de item:** 6 fileiras de 5 caixas por pista; cada caixa some sozinha e volta em 2,5 s.
  - **Itens:** cada bugue guarda até 2; o item usado é o primeiro, e o HUD mostra os dois.
- **Itens** (quem está atrás ganha itens melhores; a onda saiu em 31/10):
  - bola de praia: quica reto e volta nas bordas; para trás, sai rolando contra quem vem atrás;
  - balão d'água: persegue quem está logo à frente, a 330 px/s (era 250; o dono achou lento) e virando mais rápido (para trás, quem vem logo atrás). Se passar por um bugue invencível (depois de rodar), não acerta, nem depois, e vai atrás de quem estiver na frente desse bugue; o mesmo vale para a bola;
  - protetor solar: deixa uma poça atrás (ou longe na frente, com ↑);
  - água de coco: turbo;
  - guarda-sol: escudo que bloqueia um ataque;
  - onda: retirada em 31/10 a pedido do dono (deixava os três primeiros lentos por 2,2 s).
  - Quem é acertado rodopia e perde velocidade, mas continua a corrida.
- **Amiguinhos:** seguem a pista cada um na sua faixa, tiram o pé antes das curvas (calculam a velocidade pelo raio da curva e pela aderência), derrapam nas curvas fortes e usam os itens com critério. Os da frente aliviam um pouco quando abrem muita vantagem, e os de trás apertam.
- **Pontos:**
  - por posição: 1º 3.000, 2º 2.200, 3º 1.600, 4º 1.100, 5º 700, 6º 400;
  - medalhas: bronze em 3º, prata em 2º, ouro em 1º.
- **Testes:**
  - `testes/bugue.cjs`: corridas com o jogador no piloto automático e fotos (corridas de 79 a 86 s);
  - numa corrida inteira dos 6 bugues no piloto automático, houve só 4 batidas fortes na mureta: dá para fazer as curvas rápido sem bater;
  - `testes/bgkeys.cjs`: largada com turbo, derrapagem e item pelo teclado (com 2 itens guardados);
  - `testes/bgrec.cjs`: depois de ser acertado, o bugue volta de frente e invencível; de cara na mureta, sai só acelerando e virando (30 de 30 nos dois casos, nas 3 pistas);
  - `testes/copa.cjs`: as 3 pistas no piloto automático (tempos, presos, batidas fortes, atalho, areia fofa) e uma Copa inteira. Último resultado (pistas em dobro): nenhum bugue preso; de 2 a 7 batidas fortes por corrida (quase todas na entrada dos atalhos);
  - `testes/bgvolante.cjs`: quanto o bugue desvia com toques curtos em alta;
  - `testes/bgcolisao.cjs`: sobreposição entre bugues em 3 corridas, caixa pegando de lado e voltando em 2 s, largura da esteira;
  - `testes/bgcena.cjs`: fotos do cenário pintado (largada nos 3 horários, rampa, caixas e itens, lagoa, farol de dia e de noite, mar, ladeiras, salto, onda);
  - `testes/bgpintado.cjs`: fotos dos bugues pintados (IAmiguinho reto, rodas para os dois lados, nas curvas, derrapando para os dois lados, rodopiando; Amiguinhos nas 5 cores);
  - `testes/bgmureta.cjs`: 67 batidas em ângulos de 15° a 85° nas 3 pistas; em todas o bugue segue andando (a única exceção quica para dentro de um atalho);
  - `testes/bgitens.cjs`: balão passa por quem está invencível e vai atrás do da frente; bola e balão para trás acertam quem vem atrás; protetor para a frente;
  - `testes/vacuo.cjs`: sozinho, o bugue chega a 229 px/s; colado atrás de outro, passa de 260 e, com 1,5 s, sai com o turbo do vácuo (até 335);
  - `testes/copafotos.cjs`: fotos do menu, das pistas novas, do salto e da classificação;
  - `testes/bgpresos.cjs`: 12 corridas, nenhum bugue preso. Os Amiguinhos dão ré quando ficam parados de cara na mureta e seguem o corredor da lagoa até a saída.
- **Bugue pintado do IAmiguinho (31/10):**
  - prancha do dono (4x2, apontando para a direita): 1-4 reto, com a hélice do boné e os pneus girando; 5-6 rodas da frente para a esquerda; 7-8 para a direita (conferido medindo o ângulo dos pneus);
  - montado em `cart2/mvbg.py` -> `mvbg.js` (window.BGA): cada quadro recortado numa caixa fixa da célula (o bugue não pula de um quadro para o outro); 24 unidades de comprimento (com o estepe);
  - no jogo (`cart2/bgp.js`): o quadro anda mais rápido com mais velocidade (5 + velocidade/18 quadros por segundo); virando mais que 25% do volante, mostra as rodas viradas para o lado certo; rodopiando, rodas retas; o jogo gira o desenho com o bugue, e o vento do vácuo, o protetor e a setinha continuam por cima;
  - pranchas em `jogos/jogos-de-verao/bugue/pranchas` (bg_ia, bg_ia_rodopio, bg_bl).
- **Derrapagem e rodopio do IAmiguinho (31/10):**
  - prancha bg_ia_rodopio: 1-4 derrapando (traseira escorregando para a esquerda, areia saindo dos pneus de trás), 5-8 rodopiando (desenhado girado 0, 90, 180 e 270 graus, com estrelinhas);
  - derrapagem: o desenho é da derrapagem para a direita; para a esquerda o jogo espelha; o giro já desenhado (2 a 7,5 graus, medido pelo eixo do corpo) é desfeito, porque o jogo já inclina o bugue na derrapagem;
  - rodopio: os 4 desenhos trocam rápido (10 por segundo) com o giro desfeito, então o bugue segue a direção do jogo e as estrelinhas rodam em volta; o centro do bugue é o mesmo nos 4 (meio da caixa do desenho de 0 grau).
- **Bugue dos Amiguinhos (31/10):**
  - prancha bg_bl (rosa): 1-4 reto, 5-6 rodas para a esquerda, 7-8 para a direita (conferido pelo ângulo dos pneus);
  - cada Amiguinho com a sua cor (amarelo, rosa, azul, verde, laranja), pela mesma troca de cor do vôlei (pneus, gaiola, visor e faróis ficam);
  - derrapagem e rodopio próprios desde 31/10 (prancha bg_bl_rodopio, 2000x1000, células de 500; mesma conta do IAmiguinho: giro desenhado desfeito, espelhado para a esquerda, estrelinhas rodando), também na cor de cada um.
- Tudo montado em `cart2/mvbg.py` -> `mvbg.js` (window.BGA: conjuntos ia, iad, ias, bl, cada quadro com âncora e giro desenhado) e desenhado por `cart2/bgp.js`.
- **Cenário, peças e itens pintados (31/10):**
  - o dono mandou: dunas vistas de cima em 3 horários (dia, fim de tarde, noite), a faixa da beira-mar, a folha de chão (areia fofa em 3 tamanhos, faixa comprida, rampa do atalho, setas e marcas de pneu), a folha de peças (caixa de item, rampa de madeira, largada, bandeirinhas, mureta reta e curva), a folha de itens (cada item grande e pequeno) e o farol com o facho separado;
  - montado em `cart2/bgcen.py` -> `bgcen.js` (window.BGC: dunas, mar e um atlas de peças) e desenhado por `cart2/bgp.js`;
  - dunas: repetidas em ladrilhos de 400 unidades, o horário pelo relógio (5h dia, 16h fim de tarde, 19h noite, misturando por 1 hora na troca);
  - pista e peças numa camada que recebe a luz do horário (fim de tarde laranja leve, noite azul), como na bocha;
  - muretas: o pedaço vermelho e branco repetido ao longo da beira da pista (7,5 de grossura); a curva da folha ficou de reserva;
  - largada: a faixa quadriculada com os postes atravessando a pista; rampas: 2 módulos de madeira atravessando a pista (a areia do desenho do lado de quem chega); rampa do salto do Desce-Duna: a da folha de chão;
  - areia fofa: a mancha pelo tamanho; no corredor de areia fofa do atalho, a faixa comprida;
  - ladeiras: setas na areia nas descidas e marcas de pneu nas subidas (60% de força), 3 por fileira;
  - caixas: o desenho da caixa girando devagar e pulando de leve; itens: ícones grandes no quadrinho do item; bola e balão pequenos voando; poça do protetor; o guarda-sol aberto em cima do bugue enquanto protege; (a onda pintada atravessando a tela saiu junto com a onda);
  - farol: a torre no lugar do desenho antigo; o facho gira por cima de tudo, mais forte à noite;
  - beira-mar (Duna do Farol): a faixa repetida dos lados, a areia de baixo some sobre as dunas, a água vai e volta de leve; acima dela, a água do alto da faixa esticada;
  - ainda desenhados pelo jogo: o chão da pista, a lagoa e as esteiras de turbo;
  - artes em `jogos/jogos-de-verao/bugue/arte`.
- **Chão da pista pintado (31/10):** a faixa 4:1 do dono (areia batida com marcas de pneu da esquerda para a direita, emenda dos lados), deitada ao longo da pista: cada trecho da linha da pista vira dois triângulos que recebem o pedaço certo da faixa (as beiradas usam a normal média em cada ponto, então os trechos vizinhos dividem a mesma beirada e não aparece emenda nas curvas); a faixa repete a cada 4 larguras de pista (712); por baixo, a cor média (#e9c69f); o corredor do atalho usa a faixa do meio na mesma escala. Arte em `jogos/jogos-de-verao/bugue/arte/pista.webp`.
- **Onda fora dos itens (31/10, pedido do dono):** a caixa não dá mais a onda; a fala do IAmiguinho que citava a onda mudou para o balão d'água; o código do efeito continua guardado.
- **Lagoa, esteiras e efeitos pintados (31/10, zip "Costa WinnerZ — Pista e Efeitos"; farol, beira-mar e folha de chão vieram iguais às já usadas):**
  - lagoa: 4 quadros da água trocando devagar (3 por segundo); a água do desenho (x 100 a 485, y 38 a 153 no quadro guardado de 576x192) casa com a água do jogo (rx, ry) e o desenho é cortado no corredor do atalho;
  - esteira: 4 quadros das setas acendendo (9 por segundo), 34 x 46;
  - efeitos: folha de 6 fileiras de 4 (cada célula guardada com 128 px); poeira, areia fofa, água, faíscas azuis e laranja, e a caixa estourando (só quando pega a caixa; a esteira continua com o anel); a batida usa a poeira; tamanho da célula inteira no mundo: 40, 40, 42, 26, 32 e 64;
  - verde da borda tirado só onde o verde passa do vermelho e do azul (a água é mais azul que verde);
  - nos testes locais, o servidor não manda o charset: palavras com acento no código da página viram outra coisa (o teste `bgcena.cjs` converte antes de comparar); publicado, funciona normal.
- **Corrida de bugue toda pintada.**
- **Ajustes de 31/10 (pedido do dono):**
  - batida entre bugues: cada bugue é dois círculos (frente e trás, raio 8,5, a 4,5 do centro), conferidos 3 vezes por passo e empurrados pelo contato mais fundo; antes era um círculo só (16 de distância) e eles se sobrepunham de frente e de trás. Medido em 3 corridas inteiras: sobreposição máxima 0,1;
  - caixa de item: pega quando o corpo do bugue encosta nela (dois círculos + raio 7 da caixa); antes contava só o centro do bugue a 12 da caixa. Passando ao lado, pega até 16 de distância entre os centros. Reaparece em 2 s (era 2,5);
  - bola, balão e poça do protetor também acertam pelo corpo do bugue;
  - esteiras de turbo com o dobro da largura (44, era 22), com duas fileiras de setas.
- **Modos (no menu da prova):**
  - **Corrida:** uma corrida avulsa na pista escolhida no botão "Pista" (Lagoa Azul, Duna do Farol ou Desce-Duna; cada toque troca a pista e o IAmiguinho fala dela);
  - **Copa das Dunas:** as 3 pistas seguidas. Cada chegada vale 10, 8, 6, 4, 2 e 1 pontos (quem não chegou conta pela posição na pista). Entre as corridas aparece a classificação, e ✕/Espaço (ou um toque) leva à próxima pista. A nota e a medalha saem da posição final na Copa, e "Jogar de novo" começa outra Copa. No HUD, a última casa mostra a corrida e os pontos.
  - No modo das provas da semana, o bugue é uma corrida avulsa.
- **As 3 pistas da Copa (2ª versão, 31/10: o dobro do tamanho, a pedido do dono):** todas com muretas, 3 voltas, 3 ou 4 rampas, 6 fileiras de caixas e 8 esteiras de turbo. Desenhadas com a ferramenta que confere o raio das curvas e a distância entre trechos (`/tmp/pistas` na sessão; os pontos ficam no `ev_bugue.js`).
  - **Lagoa Azul** (~11.600 px por volta, era 5.700): reta de largada, chicane, curvão da direita, laço de cima, o S do meio e a volta pela esquerda. Dois atalhos pela água (por dentro do U do meio e por dentro do laço de cima). Corridas de uns 145 s.
  - **Duna do Farol** (~13.800 px, era 6.700): cinco grampos (três colunas em zigue-zague e o S da esquerda), o farol entre as colunas e o mar ao norte, logo acima da pista de cima. Areia fofa por dentro dos 5 grampos; um atalho de areia fofa cortando o grampo de baixo entre as colunas. Corridas de uns 175 s.
  - **Desce-Duna** (~15.400 px, era 7.500): retas longas com 4 descidas que embalam e 3 subidas que seguram; atalho de areia fofa no grampo da esquerda e o salto por cima da duna (rampa na entrada) cortando o laço do meio. Corridas de 3 a 3,5 min.
  - Com as pistas em dobro, uma Copa inteira leva uns 9 minutos.
- **Areia fofa:** freia forte e faz levantar poeira; o turbo atravessa sem frear.
- **Amiguinhos nas pistas novas:** olham à frente pela distância (não pela contagem de pontos), calculam a frenagem antes das curvas, corrigem a volta para a sua faixa quando cortam a curva, abrem por fora dos grampos com areia fofa e, com turbo ou água de coco na mão, às vezes entram no atalho.
- **Nomes e cores dos Amiguinhos:** Amarelo, Rosa, Azul, Verde e Laranja. O bugue do jogador é azul-escuro. Antes, um dos Amiguinhos aparecia como "Você", da mesma cor do jogador.

## Páginas publicadas (Claude)
| Página | Endereço | Para quê |
|---|---|---|
| Jogos de Verão | https://claude.ai/artifact/2dFTqQJ77p3TJovNPM7v9v | o jogo em desenvolvimento (vôlei, skate, surfe, basquete, patins, pingue-pongue, BMX e corrida na areia pintados) |
| Jogos de Verão 16 bits | https://claude.ai/artifact/KATSnXhZbmXS4ptNGZKRcx | backup congelado em 16 bits |
| Prévia das pranchas | https://claude.ai/artifact/4JU4Gtd5ri3iU786ezarkP | toda prancha nova toca em loop com o veredito antes de entrar no jogo |
| Moveset do Vôlei | https://claude.ai/artifact/1dXVWLrYSy4Z9z9pCrnZAf | pedidos das pranchas do vôlei (IAmiguinho e Amiguinho) |
| Pedidos de arte (antes "Pedidos das provas novas") | https://claude.ai/artifact/Y5hetAQfCRf1dykVoA3c6w | os prompts de arte de todas as provas, uma guia por modalidade (01/11): Comece aqui (como pedir e anexos), Todos os cenários, uma guia por prova na ordem do jogo (Vôlei e Half-pipe com o link das páginas próprias; o Half-pipe repete os cenários do skate), Teaser e Brushset |
| Moveset do Skate | https://claude.ai/artifact/HBWsEJqsp6rZaBEmHStwS3 | pedidos das pranchas do skate, das manobras combinadas e do cenário |
| Plano visual (doc) | https://claude.ai/artifact/N2TAefrFeShKPgXHgzkEgw | Costa WinnerZ, cenários, horários, itens, regras das provas novas e ordem de produção |

## Como uma prancha vira jogo
1. O dono gera a prancha no ChatGPT, com estes anexos:
   - o pedido em inglês da página de moveset;
   - a ficha de modelo e a grade-guia;
   - a referência de pose em cinza;
   - as pranchas aprovadas que o cartão pedir.
2. O Claude recorta os 8 quadros e passa a régua de proporção, que compara a cabeça e o corpo com a ficha.
   - A escala é igualada pela cabeça.
   - Cada quadro recebe um ajuste próprio de até ±12%.
3. Entre várias tentativas, fica a de cabeça mais constante e pose certa. O motivo vai para a Prévia.
4. A prancha entra no jogo e na Prévia, os dois são publicados, e o histórico registra.
5. Ao publicar o jogo, mandar também as imagens novas da pasta `jogos_verao/img` (o build tira as imagens de dentro da página; publicar só a página deixa os desenhos novos sem carregar). A página publicada aceita no máximo 512 arquivos: na mesma publicação, remover as imagens antigas que a página nova não usa mais (em 31/10 saíram 177).

## Embaixadinha
- **Como é:** IAmiguinho de lado na areia (hoje no fundo da praia do vôlei), 3 bolas, sem relógio. Toques na cabeça, na coxa ou no pé quando a bola passa na altura; variar vale mais; X/○ faz firula (sobe mais, faz curva, vale o dobro). A sombra na areia mostra onde a bola cai.
- **Séries (a cada 8 toques) e dificuldade progressiva (31/10, pedido do dono):** sempre sobem a gravidade, o espalhamento do toque, o vento e as rajadas. Novidades:
  - 2 mais espalhado; 3 vento (biruta);
  - 4 **gaivota que atrapalha**: voa na altura das bolas, a sombra dela é igual à de uma bola e, se encostar numa bola, empurra a bola para o lado e um pouco para cima (praia e pingue-pongue vão longe, a gude quase não sai do lugar); fica mais frequente e mais rápida a cada série (de ~7 s na série 4 a ~2,5 s na 14; 11: "Gaivotas mais ousadas!"). Antes ela voava alto, longe das bolas, e a sombra era menor que a de uma bola, então não atrapalhava;
  - 5 **pedidos da torcida**: às vezes aparece um balão sobre a torcida pedindo cabeça, coxa ou pé; atender (sem firula) vale +150 × combo, e o pedido some depois de 4 toques;
  - 7 **toque mais preciso**: a faixa de cada altura de toque encolhe 1 (8: 1, 9: 2, 11 em diante: 3);
  - 8 **sombra tímida**: a sombra da bola só aparece quando ela já desceu abaixo de uma altura que vai baixando (150 na série 8, 70 na 14); a da gaivota sempre aparece;
  - 9 **areia fofa**: um trecho de areia fofa (muda de lugar a cada série) onde o IAmiguinho anda na metade da velocidade.
- **Bolas:** da 5 em diante troca de 4 em 4, com o **futebol primeiro** (pedido do dono): futebol (5, 9, 13…), praia (6, 10, 14…), bolinha de gude (7, 11, 15…), pingue-pongue (8, 12, 16…). A bola extra (duas bolas ao mesmo tempo) saiu da rotação em 31/10. Na série nova aparecem a novidade e, se a bola trocou, o nome da bola.
- Teste da dificuldade: `testes/ebdif.cjs`.
- **Física pelo peso (31/10, pedido do dono; tabela `EB_BOLAS` no `build3.py`):** cada bola tem gravidade, resistência do ar (as leves chegam a uma velocidade máxima de queda), quanto o vento leva, quanto sobe e se espalha no toque, quanto a firula curva, quanto quica e rola quando cai e se dança a cada toque. A sombra e o tempo do toque usam a mesma física, com a resistência do ar.
  - Gude: a mais pesada; cai rápido (1,3 s no ar), o vento quase não mexe, sobe menos, quase não quica e rola.
  - Futebol: o meio-termo (1,6 s).
  - Pingue-pongue: leve, dança a cada toque, o vento leva bastante, quica alto (1,9 s).
  - Praia: a mais leve; desce devagar (velocidade máxima de queda ~110), o vento leva muito (2,2 s).
  - Teste: `testes/ebbolas.cjs` (rotação, tempo no ar e erro da sombra: no máximo 5 px na de praia).
- **Sem marcas de contato (31/10, pedido do dono):** saíram as marquinhas das três alturas que apareciam dos lados do IAmiguinho quando a bola chegava.
- As mudanças ficam no `cart2/build3.py` (a prova vem do jogo de 16 bits).
- **Estilo pintado:** os pedidos estão na página "Pedidos das provas novas", seção "Embaixadinha (estilo pintado)", com 24 pedidos:
  - 11 pranchas do IAmiguinho: espera olhando a bola, cabeça seguindo a bola, andando embaixo da bola, toque de pé, de coxa, cabeceio, firula de calcanhar, levantando a bola do chão, deixou cair, fim de jogo e comemoração. Sem a bola: o jogo desenha;
  - folha das bolas (futebol, praia, pingue-pongue, bola de firula e bola extra), biruta e gaivota;
  - cenário da Praia do Centro (prédios da orla, calçadão, quiosques), 2 camadas em 4 horários; a capa é o meio-dia.
- **Anexos na página de pedidos (31/10, pedido do dono):** a página "Pedidos das provas novas" ganhou a seção "Anexos para o ChatGPT" (ficha e grade do IAmiguinho e do Amiguinho e a referência de estilo), repetida no começo de cada grupo com os anexos daquele grupo. Cada imagem tem "Copiar imagem" (cola direto no ChatGPT) e "Baixar" (a página tem a permissão de downloads; pede confirmação). Os cartões da embaixadinha têm a referência de pose em cinza com os desenhos antigos de 16 bits nos quadros certos (`novas/poses_eb.py` gera; ficam em `novas/anexos`). As fichas e grades vêm de `moveset_volei/ficha` e a referência de estilo de `skate_moveset/ficha`.
- **IAmiguinho pintado (31/10):** as 11 pranchas chegaram e estão no jogo (`cart2/mveb.py` → `mveb.js`; desenho em `cart2/ebp.js`; pranchas originais em `embaix/pranchas`). A prova passou a ser desenhada em alta (3,2×, liso, `paint: true`).
  - Escalas pela régua (cabeça igualada à do vôlei): espera 0,896 · olhar 0,911 · andar 0,883 · pé 0,981 · coxa 0,874 · cabeceio 0,985 · firula 1,012 · levanta 0,973 · caiu 0,906 · fim 0,908 · festa 0,915. Cabeça de cada quadro igualada à mediana da prancha (menos em olhar, caiu e fim, onde a cabeça gira ou abaixa de verdade). Altura em pé = 52 unidades, igual ao desenho antigo.
  - Qual prancha aparece: bola parada no pé no começo → levantando (quadros 1-4) e, no toque, 5-8; bola no ar → cabeça seguindo a bola (quadro pela altura da bola); andando → andando; toque → pé, coxa, cabeceio ou firula, começando no quadro do contato (4; na firula, 5) e indo até o 8; bola caiu → deixou cair (1,5 s); última bola → fim de jogo; série nova ou 10 seguidos → comemoração, só se nenhuma bola chega em 0,7 s. Rosto aceso do vôlei dentro da tela de cada quadro.
  - Ajustes para a bola encostar no desenho: o cabeceio usa 35% do pulo desenhado; a altura do toque de coxa desceu de 25 para 22.
  - Pé e coxa vieram um pouco virados para a frente (as outras são de lado); funcionam, dá para refazer de lado se incomodar. A segunda prancha de andar (3/4, maior) ficou guardada.
  - As 12 pranchas estão na Prévia com o veredito. A Prévia não dá mais para regerar do zero aqui (faltam quadros antigos na pasta de trabalho): as pranchas novas entram somando à página publicada.
  - Teste: `testes/ebpintado.cjs` (fotos de cada situação).
- **Cenário, bolas, biruta e gaivota pintados (31/10):** `cart2/ebcen.py` → `ebcen.js` (imagens do dono em `embaix/arte`); desenho em `cart2/ebp.js`.
  - Praia do Centro em duas camadas nos 4 horários, pelo relógio (perto da troca mistura os dois, como no skate); de noite, as luzes das janelas, dos postes e dos quiosques acendem por cima, piscando de leve. A faixa de areia do meio-plano termina aos poucos sobre a areia do fundo.
  - Foram usados: fundo dia/manhã/entardecer/noite; meio-plano dia (a versão com o guarda-sol rosa, a mesma base dos outros horários), manhã, entardecer e noite; luzes do fundo (a versão só com as luzes) e do meio-plano. Ficaram guardadas: a outra versão do meio-plano do dia e a outra das luzes do fundo.
  - Bolas: futebol (4 quadros girando), a de firula com o rastro, praia (3) e pingue-pongue (2); a bola dourada não é usada (a bola extra saiu). A bolinha de gude ainda é desenhada pelo jogo (vidro azul com redemoinho laranja); o pedido dela entrou na página de pedidos.
  - Biruta: murcha sem vento, meio aberta com pouco, esticada balançando com vento forte; aponta para onde o vento sopra.
  - Gaivota: 4 quadros batendo as asas.
- **Correção (31/10):** a comemoração ficava em looping durante a partida. O relógio da partida recomeça a cada partida e uma marca antiga, maior que o relógio, deixava a comemoração ligada; agora ela zera e só acontece uma vez por comemoração. Teste em `testes/ebcena.cjs`.
- **Pendente:** o dono testar; a bolinha de gude pintada.

## Surfe pintado (01/11/2026)
- **Chegou do dono:** as 11 pranchas do IAmiguinho no surfe (em pé, subindo a parede, agachado no tubo, decolando e no ar, Superman, Indy, Rabeta, Mortal desenhado em pé, aterrissagem, caldo e o giro em 8 vistas) e o pacote técnico: mar e céu do Pico da Pedra Furada nos 4 horários, a parede da onda nos 4 horários (faixa 4:1 que repete), a camada de luzes da noite, o tubo em 3 módulos (entrada, meio que repete e fechamento), a folha de objetos e a de espuma e respingos. Originais em `surfe/pranchas` e `surfe/arte` (com os prompts que ele usou).
- **No jogo** (`cart2/mvsf.py` → `mvsf.js`; `cart2/sfcen.py` → `sfcen.js`; desenho em `cart2/sfp.js`; a prova passou a `paint: true`, desenhada em alta). A física e as regras não mudaram.
  - Escalas pela régua (cabeça igualada à do vôlei): em pé 1,004 · subindo 0,942 · tubo 1,004 · aterrissagem 1,031 · no ar 1,031 · Superman 1,046 · Indy 1,041 · Rabeta 0,996 · Mortal 0,979 · caldo e giro 1,0. A cabeça varia de 4 a 7% entre quadros; cada quadro igualado à mediana da prancha (menos no caldo e no giro). Em pé, da quilha à hélice = 42 (o de 16 bits tinha uns 39).
  - Âncora no meio da prancha, embaixo (a prancha não escorrega quando o corpo inclina); no caldo, na cabeça, com a linha da água no corte dos quadros 5 a 8.
  - Qual prancha aparece: na onda, em pé (laço); segurando para subir ou na batida, subindo; no tubo, agachado; depois de pousar, a aterrissagem. No ar sem manobra, o voo com o quadro pela velocidade (2 a 4 subindo, 5 e 6 no alto, 7 e 8 descendo). Manobra: o quadro segue o andamento (Superman, Indy, Rabeta, Mortal; no Mortal o jogo gira o desenho uma volta para trás). Giro: as 8 vistas; com manobra junto, perto de lado mostra a manobra achatando, de frente e de costas as vistas do giro. Caldo: cai (1 a 4), afunda e volta (5 a 8), some no fim.
  - Cenário pelo relógio (perto da troca de horário mistura os dois); de noite, as luzes da camada 12 por cima, piscando de leve. O mar e o céu sobem um pouco junto com a crista, como antes. A água da frente usa o fundo da faixa da onda, mais escuro.
  - Tubo: o teto do módulo do meio fica na altura do teto da física (6 acima, para o IAmiguinho agachado não atravessar); entrada à esquerda e fechamento à direita terminam macios na ponta de fora.
  - Objetos: estrela, concha, concha dourada (a de cima da crista), boia, pedra, prancha solta, gaivota (2 quadros) e drone (2 quadros). Espuma: 3 colunas na quebra, 4 respingos e 2 de rastro.
  - As 11 pranchas estão na Prévia (somadas à página publicada por `previa_sf.py`).
  - Teste: `testes/sfpintado.cjs` (fotos de cada situação e dos 4 horários, e uma partida com o teclado).
- **Ajustes pedidos pelo dono (01/11, `sfp.js` e `sfcen.py`):**
  - Mortal: gira em volta do centro do corpo (o meio dos quadros do mortal, a média de todos, `sfMeio`), não mais em volta dos pés.
  - Ondas: o tubo e as 3 colunas de espuma da quebra ganharam as cores de cada horário. A conta de cor sai das 4 faixas da onda (mesmo desenho, só a cor muda): uma fórmula ajustada pixel a pixel que leva a cor do dia para a do horário (erro médio de 4 a 5 em 255). Um atlas por horário (`SFC.th`, com entrada, meio, fechamento e colunas), misturados perto da troca de horário. Antes, de noite, o tubo ficava turquesa forte.
  - Sem cortes: o pé dos módulos do tubo some na água; a entrada some à direita e o fechamento à esquerda e à direita (30%), por cima do meio; o meio fica preso entre as pontas (o último pedaço passava do fechamento e fazia uma parede reta).
  - A faixa da onda vai até o pé da tela (antes acabava numa faixa escura). Saiu a faixa escura da frente com a linha azul e os riscos: era só enfeite do desenho de 16 bits, sem função. As colunas de espuma vão até o pé da tela.
  - Correnteza (o "quadrado escuro com riscos" que aparece da 3ª série em diante): tem função (dentro dela subir fica difícil e a onda puxa para baixo). Pedido de arte na página de pedidos (guia Surfe, grupo Correnteza: uma textura em pé que repete de cima para baixo, na luz do dia, com a parede da onda aprovada como anexo `novas/anexos/ref_onda_surfe.jpg`). Até chegar, a faixa provisória ficou com as beiradas macias.
  - Tubo refeito (01/11, pedido do dono): o vão do meio do tubo (50% a 80% da altura) veio transparente e mostrava a onda do cenário. Pedido novo na página de pedidos (guia Surfe, grupo "Tubo da onda (refeito)": meio que repete primeiro, depois entrada e fechamento com o meio aprovado anexado; quadradas, mesmas linhas: ar 0-20%, teto 20-50%, fundo do barril pintado 50-80%, parede da onda 80-100%; anexo `novas/anexos/ref_tubo_atual.jpg`). Até chegar, o jogo pinta o fundo provisório: o teto do meio virado e escurecido (peça `fundo` no atlas de cada horário), andando devagar e sumindo nas pontas.
  - Tubo refeito entregue (01/11, pacote `Ondas_Costa_WinnerZ_emendas_corrigidas`, em `surfe/arte/04_tubo_refeito`): entrada, meio que repete e fechamento (quadradas, 1254 px, guardadas a 384 px = 115 unidades; o teto termina a 51% da peça, a mesma altura de antes) com o fundo do barril pintado e emendas sem diferença. O jogo monta entrada | meio × n | fechamento lado a lado (o meio estica um pouco para caber um número inteiro de peças); macio só no pé, na esquerda da entrada e na direita do fechamento. O fundo provisório saiu. Cores de cada horário pela mesma conta das faixas da onda.
  - Correnteza pintada (mesmo pacote, `04_corrente_repetivel_vertical`): textura que repete de cima para baixo, na cor do horário, lados macios na peça e alto/pé sumindo em fatias, andando para baixo; da crista até o pé da área da correnteza.
- **Pendente:** o dono testar; a arte da correnteza e o tubo refeito.

## BMX pintado (01/11/2026)
- **Manobras seguradas (02/11, pedido do dono, como no skate):** segurando ○ □ △ no ar, Superman e Sem mãos param na pose cheia (o meio da manobra, quadros 3-4-5 balançando) e o Tailwhip continua girando (duplo, triplo, ×n). Soltou, termina. Valem mais: +150% por segundo segurado; cada volta a mais do Tailwhip vale uma inteira. Girando junto (◀ ▶) é combinada (×1,3 com mortal). Pousar segurando é tombo ("Pousou no meio da manobra"). Nomes: "Superman segurado", "Tailwhip duplo". Teste: `testes/bxsegura.cjs`.
- **Pedidos da trilha nova (02/11):** guia própria "BMX · trilha nova" na página de pedidos (`novas/bmx2.py`, separada da guia BMX): 8 movimentos do IAmiguinho (Superman segurado, Sem mãos segurado, Tailwhip contínuo, bunny hop, mortal encolhido, empinando, corpo para trás e para frente no ar, desequilibrou no pouso), peças da pista (terra em ladrilho que repete para todos os lados, beirada de cima em faixa 8:1 que o jogo dobra no contorno, ponta da rampa, marcos da trilha, poeira do pouso grande) e ajuste dos cenários (dunas com encosta que continua para baixo, fundo com mais céu), com os horários. Anexos novos: `ref_bmx_pranchas`, `ref_bmx_trilha`, `ref_bmx_salto`, `ref_bmx_terra`, `ref_bmx_dunas`, `ref_bmx_fundo`.
- **Trilha de flow (02/11, segunda versão; o dono achou a 1ª "injogável": obstáculo demais em sequência, não dava para pegar velocidade):**
  - O que pontua são os saltos: distância (de onde decolou até onde pousou) e altura (acima da ponta da rampa), em metros (10 unidades = 1 m): 6 por metro de distância + 22 por metro de altura + mortais e manobras, × combo; pouso torto vale metade. Não há mais pontos por distância pedalada. O placar mostra o maior salto; o resultado, o maior e o mais alto.
  - A pista é escrita em código (`BX_PISTA` em `cart2/bxfis.js`, uma linha por trecho, fácil de refazer): uma trilha que desce sempre, vale → rampa → ponta → descida de pouso comprida → vale. Saltou curto ou longe, pousa na descida e não perde velocidade. Trechos: 'descida' (comprimento, quanto desce), 'salto' (altura da rampa, inclinação da ponta, inclinação do pouso, comprimento do pouso; o pouso é 30% mais comprido que o escrito, para caber o salto com o pulo), 'plano' e 'ondas' (fora da pista: em alta velocidade viravam rampa e jogavam a bike na rampa seguinte). A lista tem 17 saltos, com rampas grandes no 8º e no 14º e a gigante no fim; acabou, repete 15% maior. Curvas suaves (Hermite) entre pontos com altura e inclinação; na ponta da rampa a inclinação muda de uma vez (decola ali). Sem valas de água por enquanto.
  - Física ajustada: gravidade 300 (mais flutuante), atrito no chão 0,06, velocidade máxima 400; o pulo (▲) empurra só para cima (antes empurrava para trás na ponta inclinada e matava a velocidade); a ajuda no ar mira a inclinação do lugar onde a bike vai pousar.
  - Pista desenhada em código: contorno da trilha com o ladrilho de terra pintada de cada horário, faixa de areia em cima e contorno escuro (funciona em qualquer inclinação; a faixa pintada em colunas listrava nas partes íngremes). Embaixo das dunas, cor lisa de areia.
  - Câmera: segue o chão (um pouco à frente); no ar, se afasta (zoom até a metade) conforme a altura, para o chão continuar aparecendo.
  - Jogadores automáticos (`testes/bxfisica.cjs`, 6 partidas): só pedalando ~12.000 pontos, saltos de 29 m e 4 m de altura em média, nenhum tombo; com o pulo na ponta da rampa ~21.000, saltos de 39 m e 13 m de altura (máx. 62 m e 22 m); com mortais ~29.000, 14 mortais. Medalhas: 10.000 / 20.000 / 30.000 (ia 7.000).
- **Física nova (02/11, pedido do dono: "jogabilidade péssima, a bike grudada no chão; refazer como no Hill Climb Racing")**, em `cart2/bxfis.js` (troca init, update, a pista e o pouso do `bmx`; o desenho continua em `bxp.js`):
  - A bike é um corpo: centro de massa 22 acima do pé da bike (no IAmiguinho), massa 1, inércia 230, gravidade 400. Rodas de raio 12,6 a 12,85 do meio (medidas na arte). Cada roda encosta no chão como uma mola (suspensão: mola 170, amortecedor 15, afunda no máximo 3,2; o desenho sobe o quanto a roda afundou). O contato é com o ponto mais perto da pista (funciona em paredes e pontas de rampa).
  - Controles: ✕ pedala (força 150 pelo eixo da roda de trás, até 235); ▲ pula (150; com ▼ segurado 0,25 s antes, 215); ▼ na descida dá pump; ◀ ▶ empinam no chão e giram no ar (8,4 rad/s). Os controles de toque ganharam ▲ ▼.
  - Ajudas do ciclista: no chão, sem ◀ ▶, ele equilibra a bike com a pista (sem isso, pedalar empinava e virava para trás); no ar, sem ◀ ▶, vai alinhando com o chão lá embaixo (perto de em pé, inclusive terminando um mortal); longe de em pé, o giro continua no embalo e para em ~0,2 s.
  - Tombo: a cabeça (2, 21 do centro de massa, raio 7,5) encostar no chão; pousar com mais de 63° de diferença do chão; pousar no meio da manobra; a roda tocar o fundo da vala. Pouso limpo até 22°. Parado (menos de 14 de velocidade) por 1,4 s: "Empurrou a bike" até um lugar plano à frente, sem tombo. Caiu duas vezes no mesmo lugar: volta 160 mais à frente.
  - Pista (gerada na hora, cada vez mais difícil; `base` muda com os degraus): costelinhas, whoops, kicker com vão e morro de pouso (face do morro com no máximo ~45°), vala de água (depois de 900), morro, mesa, vale com saída em rampa (~53° na ponta), degrau para cima e para baixo (penhasco curto) e rampa gigante (depois de 1800: desce para pegar velocidade, sobe íngreme, vão de 110 a 180 e pouso na descida comprida). Toda ponta de rampa tem a tábua.
  - Câmera: sobe e desce com a bike (acima de 55 de altura e abaixo de −12); o fundo sobe 60% (acima dele, uma faixa desfocada do alto do céu continua o céu), as dunas 90% (embaixo delas a areia continua) e a pista 100%.
  - Pontos: distância/4 + no ar 80 por segundo + 0,8 por unidade de altura + mortais (300 para trás, 340 para frente) + manobras, × combo; "Salto gigante" acima de 60 de altura (contado no resultado). Medalhas novas: 3.500 / 8.000 / 13.000 (ia 2.600).
  - Teste `testes/bxfisica.cjs` (8 partidas de cada jogador automático): só pedalando ~1.900 pontos e 1 tombo (quase sempre a vala, que pede o pulo); pedalando com pump e pulo na ponta da rampa ~9.300 e nenhum tombo (toda vala dá para passar); com mortais ~19.500, 17 mortais e 0,3 tombo. Pico de altura até ~170. Fotos: `testes/bxpintado.cjs` (o jogador com mortais andando de verdade).
- **Chegou do dono:** as 8 animações do IAmiguinho na BMX (pedalando, pumping, salto, Superman, sem mãos, tailwhip, aterrissagem e queda; `bmx/pranchas`), a pista da Costa WinnerZ nos 4 horários (fundo distante 32:9, plano médio com as dunas e a faixa de terra da pista 6:1, luzes da noite e os objetos; `bmx/arte`) e a imagem do modelo da bike (`bmx/modelo_bicicleta.png`, virou anexo do pedido da bike).
- **No jogo** (`cart2/mvbx.py` → `mvbx.js`, `cart2/bxcen.py` → `bxcen.js`, desenho em `cart2/bxp.js`; a prova passou a `paint: true`). A física não mudou.
  - Escala pela régua: cabeça 0,466 → 0,505 (K 1,08, igual em todos os quadros). Em pé pedalando, da roda à hélice = 56 (a altura do desenho de 16 bits; a bike nova é mais comprida). Âncora no meio da bike, embaixo; o desenho gira com o ângulo da física.
  - Qual animação: no chão, pedalando (o quadro segue a pedalada, ~1,5 volta por segundo pedalando); segurando na descida, pumping; logo depois de pousar, a aterrissagem; no ar, o salto (saída 1 a 3, subindo, flutuando, preparando o pouso perto do chão) ou Superman / Sem mãos / Tailwhip pelo andamento; no tombo, a queda (na vala ele afunda na água).
  - Cenário: os 4 horários de cada camada empilhados numa imagem só (limite de arquivos): fundo (anda a 30%), dunas do plano médio (55%, o pé atrás da pista) e a faixa de terra, que acompanha o perfil do chão em colunas de 2 (embaixo, a cor da terra do horário). De noite, as luzes por cima. Vala: o miolo da peça pintada (borda de trás, água, borda da frente) no fundo do vão entre as rampas; a tábua da peça foi separada e fica na ponta da rampa (2 antes do vão), girando com a rampa; a peça da vala só veio de dia, então o jogo escurece de noite e avermelha no pôr do sol. Bandeiras quadriculadas a cada 160 e a poeira pintada nos pousos.
  - Prévia: as 8 entraram (`previa_bx.py`). Teste: `testes/bxpintado.cjs` (cada situação, a vala, os 4 horários e uma partida).
- **Pendente:** o dono testar.
- **Movimentos novos (02/11, pacote do dono, `bmx/pranchas2`):** Superman segurado, Sem mãos segurado, Tailwhip contínuo, bunny hop, mortal encolhido, empinando (wheelie), corpo para trás/para frente e desequilíbrio, no `mvbx.py` (K 1,08). Quando aparecem: segurando ○/□ depois do meio da manobra, as poses seguradas (em laço); Tailwhip do 2º giro em diante, o contínuo; pulo (▲): agachado com ▼ antes os quadros 1-2 e, saindo do chão, 3 a 8; girando rápido sem manobra, o encolhido; ◀ ▶ no ar, corpo para trás (1-4) ou para frente (5-8); no chão só com a roda de trás, o wheelie (preso na roda de trás, inclinação medida em cada quadro); pouso torto sem cair, o desequilíbrio. A física não mudou. Prévia: `previa_bx2.py`. Teste: `testes/bxnovos.cjs`.
- **Correção do empinando (02/11, o dono viu no jogo):** na ponta da rampa a roda da frente sai antes e aparecia o desenho do empinando maior e com o visor apagado. Três causas: (1) a prancha do empinando veio desenhada ~8% maior (bike e IAmiguinho; o quadro 4 do corpo para trás é o mesmo desenho): escala K/1,08 nelas (`mvbx.py`); (2) o pneu da frente levantado era tomado pela tela do rosto: na BMX a tela agora é a mancha escura mais perto do fone (anel ciano) (`visor.SOLID`); (3) o empinando só aparece segurando ◀ no chão (`bxp.js`); passando a ponta da rampa sem segurar, fica a pedalada girada com a bike.
- **Arquivos da página publicada:** limite 511 por versão. Em 02/11 passou do limite (528); desde então as imagens de até 4 KB ficam embutidas na página (`build3.py`) e sobraram 409 imagens + 22 músicas + a página.

## Corrida na areia pintada (02/11/2026)
- **Chegou do dono:** 6 pranchas do IAmiguinho (correndo forte, trotando, largada, pulo da barreira, tropeço, sem fôlego; `corrida/pranchas_ia`), 4 do Amiguinho (correndo, largada, pulo, tropeço; `corrida/pranchas_amiguinho`), obstáculos, largada/chegada/bandeira e a Praia da Maré Baixa de dia (`corrida/arte`); logo depois, manhã, pôr do sol, noite e as luzes da noite (`corrida/arte_horas`).
- **No jogo** (a prova passou a `paint: true`; a corrida em si não mudou):
  - IAmiguinho: `cart2/mvcr.py` → `mvcr.js` (window.MVCR), K 1,08 em todas (o pacote veio com a escala igual). Em pé, 46 na raia da frente. Quando aparece: contagem, largada 1-3; primeiro meio segundo, 4-8; ▶ (rápido) correndo forte, senão trotando; no ar, o pulo 2-7 (a altura vem do jogo); batendo/escorregando, o tropeço; sem fôlego e no fim (quem não ganhou), o cansado; ganhando a bateria, a festa do vôlei.
  - Amiguinhos: `cart2/mvbcr.py` → `mvbcr.js` (crSprint, crLargada, crSalto, crQueda em window.MVB, na cor de cada um), escala 1,10, 30 de altura na frente; no fim, festa/tristeza/parado do vôlei.
  - Cenário: `cart2/crcen.py` → `crcen.js` (window.CRC); desenho em `cart2/crp.js`. Fundo quase parado (5%), meio-plano (guarda-sóis com a torcida e o posto) a 50%, repetindo a cada 1000; areia das raias tirada da parte de baixo do fundo (emendada) andando junto; bandeirinhas a cada 20 m; marca da largada em cada raia; faixa de chegada atrás da última raia e a linha quadriculada no chão. Cada camada tem os 4 horários empilhados numa imagem só. De noite, a lua e a luz do posto somadas por cima e um azulado leve sobre tudo.
  - Obstáculos: em pé, a altura antiga manda e a largura segue o desenho; poça, areia fofa (montinhos lado a lado) e a marca de largada esticam.
  - Testes: `testes/crpintado.cjs` (cada situação e os horários), `testes/crvitrine.cjs` (fotos grandes), `testes/crfluxo.cjs` (as 3 baterias no automático, sem erro).
- **Pedidos:** a guia da Corrida na página de pedidos ficou como entregue.
- **Pendente:** o dono testar.

## Basquete pintado: IAmiguinho (01/11/2026)
- **Chegou do dono:** 12 pranchas do IAmiguinho no basquete (mais tentativas que pedidos: 5 de andar, 2 de espera, 2 de carregar). Originais em `basquete/pranchas`.
- **Escolhidas pela régua** (a cabeça mais constante): andar `bq_andar_d` (1,5%), espera `bq_espera_b` (1%), carregando `bq_carrega_b` (6,8%); arremesso, comemorar e errou vieram uma de cada. As outras ficam guardadas.
- **No jogo** (`cart2/mvbq.py` → `mvbq.js`, desenho em `cart2/bqp.js`; a prova passou a `paint: true`). A física não mudou. Em pé = 50 (o de 16 bits tinha 48,5). Escalas: espera 0,728 · andar 1,101 · carregando 0,787 · arremesso 1,031 · comemorar 0,839 · errou 0,872.
  - Parado: espera (laço), bola nas mãos (6 à frente, 17 acima dos pés). Andando: quicando (laço; a bola quica 15 à frente). Segurando: carregando, as mãos sobem do peito até o alto em 0,35 s e ficam no quadro 8; a bola vai junto (posições por quadro em `BQ_MAOS_CAR`). Soltou: o arremesso a partir do quadro 4 (a soltura), com o pulo desenhado. Cesta: comemorar (laço). Errou: mãos na cabeça.
  - O cenário, a cesta, a bola, o defensor e a torcida continuam os de antes (o cenário pintado da Quadra da Laje ainda não chegou).
  - As 6 pranchas estão na Prévia (`previa_bq.py`). Teste: `testes/bqpintado.cjs`.
- **Amiguinho defensor pintado (01/11):** 6 pranchas do dono (4 de marcação, 2 de pulo; em `basquete/pranchas_amiguinho`). Ficaram as de 3/4, iguais ao Amiguinho do vôlei: `bv2_bq_defesa_c` (marcando) e `bv2_bq_toco_a` (pulo do toco). A defesa_d veio com a 2ª linha espelhada; a defesa_a com as mãos para baixo; defesa_b e toco_b de perfil. `cart2/mvbbq.py` → `mvbbq.js` (animações bqDefesa e bqToco no Amiguinho do vôlei, com a cor dele); desenho em `bqp.js`. Marcando = laço; agachando = toco 1-2; no pulo = toco 3-8 (a altura vem da física). Escala pela massa: 1,045 e 1,127. Na Prévia (`previa_bbq.py`).
- **Quadra da Laje pintada (01/11, pacote do dono em `basquete/arte`):** `cart2/bqcen.py` → `bqcen.js`; desenho em `bqp.js` (o desenho da prova é o mesmo de antes com cenário, cesta e bola trocados; a física e as medidas da cesta não mudaram).
  - Fundo e meio-plano (alambrado, caixa d'água, plantas e o chão da quadra) nos 4 horários pelo relógio, misturando perto da troca; de noite as luzes dos dois (refletores, varal de lâmpadas, janelas) por cima.
  - Cesta em peças: base no chão, poste que repete até o topo, braço que repete até a tabela, tabela (bordas esquerda e direita, achatadas na largura para parecer vista de lado) de ry − 36 a ry + 8; rede atrás e aro por cima, no ponto de encaixe do pacote (a abertura de 260 px = o aro da física). Rede parada, chuá (4 quadros, logo que a bola passa) e balanço (4 quadros). A biruta continua a da Embaixadinha no alto do poste.
  - Bola: 4 quadros girando e 4 em chamas (o fogo fica para trás do movimento); 120 px de diâmetro = 11 da física. Carrinho de bolas no canto. Torcida: 6 cores × 4 quadros (2 olhando, 2 comemorando), nos mesmos 8 lugares de antes, encostada no alambrado.
  - Teste: `testes/bqpintado.cjs` (agora com os 4 horários, a rede e a bola de fogo).
- **Ajustes pedidos pelo dono (01/11, `bqp.js` e `build3.py`):**
  - A cesta não anda mais: fica parada em x 345, aro na altura 100 em todas as séries (antes trocava de lugar a cada série e deslizava na última). As séries agora mudam só o vento, a marcação e o aperto da força certa.
  - Linha de três: é a linha do meio pintada no chão da quadra (`BQ_LINHA3` = 199,5, medida na altura dos pés). O jogo não desenha mais a linha branca inclinada. `BQ.TRES` só vale no desenho antigo de 16 bits (o editor avisa).
  - Tabela: como a tabela pintada é vista de frente, o meio dela (o quadrado laranja) fica onde está o centro da bola quando ela bate (BX − BQ.R); o aro fica na frente da parte de baixo da tabela. A física da batida não mudou.
  - Bola 30% maior no desenho (`BQ_BOLA` = 1,3), inclusive em chamas e quicando. A física do aro continua com a bola de antes (com a bola maior na física, até o arremesso perfeito batia no aro e saía). No chão ela quica pelo tamanho do desenho (`BQ.CHAO`), para não afundar na quadra.
  - Simulação depois do ajuste: arremesso perfeito entra de três e de dois (40 de 40); na beirada da faixa boa, metade entra de três.
  - Rede presa no aro (01/11): a parada vai no ponto de encaixe do pacote (estava 1,4 abaixo e ficava solta); o chuá e o balanço sobem 1,2 para o anel branco de cima ficar atrás do aro.
- **Pendente:** o dono testar.

## Patins pintado: cenário, obstáculos e corrimão (01/11/2026)
- **Chegou do dono:** o pacote do Calçadão das Ondas: orla em panorama 32:9 que repete e a faixa do calçadão 6:1 nos 4 horários, a camada de luzes da noite (com as posições dos postes, quiosques e lua), a folha de obstáculos e prêmios (com as regiões de cada peça) e o corrimão em 3 peças. Originais em `patins/arte`, com os prompts.
- **No jogo** (`cart2/ptcen.py` → `ptcen.js`, desenho em `cart2/ptp.js`; `paint: true`). A física não mudou.
  - A orla anda a 40% (repete a cada 800 de largura, na altura da tela); o calçadão anda junto com você (faixa de 342 × 57, do 168 até o pé da tela). Horário pelo relógio, misturando perto da troca; de noite as luzes piscam de leve por cima.
  - Buraco no calçadão (estica do tamanho do buraco), coco rolando (4 quadros pela rotação), coco caindo com a sombra crescendo, bola de frescobol, picolé e água de coco (balançando) e o corrimão: poste da esquerda, barra que repete e poste da direita, na altura da física (38 + 4).
  - O Amiguinho parado é o do vôlei.
  - Teste: `testes/ptpintado.cjs` (os 4 horários com todos os obstáculos e uma partida).
- **IAmiguinho pintado no patins (01/11, as 12 animações do pacote do dono):** `cart2/mvpt.py` → `mvpt.js`, desenho em `ptp.js` (o de 16 bits fica só de reserva, enquanto as pranchas não carregam). O pacote já veio com a escala igualada (boné ao queixo = 134 px): uma escala só (1,03), sem ajuste por quadro. Em pé nos patins = 50.
  - Andando: a passada (pelo caminho andado). Agachado: desce (1-4) e fica embaixo (5-8). No ar: o salto, o quadro pela velocidade (3 a 7); segurando ▼, pegando o patins (fica no 5); Aviãozinho, Tesoura e Mortal seguem o andamento (no Mortal o jogo gira uma volta para trás); girando, as 8 vistas (com manobra junto, perto de lado mostra a manobra achatando). Corrimão: Soul (padrão), Royale ou Agachado. Tombo final: a queda.
  - As 12 pranchas estão na Prévia (`previa_pt.py`).
- **Ajustes pedidos pelo dono (01/11, `ptp.js`, `animb2.js` e `build3.py`):**
  - Corrimão: o desenho tinha os postes uns 17 antes e 13 depois do corrimão de verdade (encostar na ponta pulando era tombo). Agora os postes ficam nas pontas da física (poste da esquerda no pixel 20 da peça, o da direita no 162; corrimão curto junta as duas pontas no meio). Dá para cair em cima desde 4 antes do começo até 4 antes do fim, e perto do começo (até 30 depois), se os pés estão até 14 abaixo do topo, descendo sobe no corrimão e subindo passa (`sobeRail`). Simulação com 60 pulos: antes 26 tombos e 34 deslizes, agora 12 tombos (pulo atrasado, bate de lado) e 48 deslizes.
  - Amiguinhos da pista pintados: o Amiguinho do vôlei (parado, `idle`) a 52% do tamanho, na cor de cada um (rosa, laranja, roxo, dourado; `window.__blCor` troca a cor e devolve a anterior), virado para você.
  - Pular na cabeça (`pisa`): descendo, com os pés entre 5 e 24 de altura em cima dele, vale 60 × combo, sobe o combo e você quica (80% do pulo; as manobras no ar continuam). Ele amassa e cai de cara no chão (o peixinho do vôlei, quadros 1 a 12), com estrelinhas, e some em 2 s. Chegar baixo (pés abaixo de 5) ou subindo ainda é tombo. Conta no resultado ("na cabeça"). Simulação: dos 60 pulos, 13 na cabeça, 35 por cima e 12 tombos (antes 22 tombos).
  - Teste: `testes/ptpisa.cjs` (simulação, fotos da pista, do pisão quadro a quadro e da ponta do corrimão, e uma partida).
- **Mais ajustes do dono (01/11, segunda rodada):**
  - Amiguinhos maiores: 72% (eram 52%). Caixa de colisão `PT_BOT` (de x − 1 a x + 17, cabeça a 23, pisão com os pés de 7 a 32). Os dois Amiguinhos seguidos ficam 30 de distância (eram 20).
  - Impulso (ideia do dono, para dar "flow"): agachado (▼) 0,25 s ou mais e pula = pulo 25% mais forte (`PT_IMP`), 1,56× mais alto e 25% mais tempo no ar. Carregado, aparece um halo azul embaixo dos patins e faíscas subindo. Conta no resultado ("impulsos") e está na explicação antes da prova.
  - Corrigido: o aperto que pula também contava como "▲ no ar" no mesmo quadro, e todo pulo saía girando (`this.jf`). Agora o giro é só com um segundo aperto. Era isso que fazia bater no corrimão no meio da manobra. Teste `testes/ptfluxo.cjs` (manobra começando 0,15 s depois do pulo): Mortal e giro antes do corrimão 0 de 50 com o pulo normal e 27 de 50 com o impulso (os outros 23 são momentos de pulo fora da janela); Aviãozinho e Tesoura dão com o pulo normal.
  - Itens altos (01/11, terceira rodada): picolé ou água de coco a 128 do chão, com brilho dourado; o pulo comum alcança uns 95, o impulso 125 e o pulo de cima do corrimão 133. Valem 3× ("lá no alto"). Entram em cima do corrimão do padrão (45%) ou no meio do espaço livre depois do padrão (40%, se houver 1,05 s ou mais; o picolé do chão que estaria ali sobe). Teste `testes/ptespaco.cjs`: pulo comum 0 de 30, impulso 25 de 30, do corrimão 28 de 30.
  - Espaço entre as coisas (01/11): os dois Amiguinhos seguidos ficam a 64 (eram 30 e ficavam colados); a água de coco que ficava em cima do Amiguinho foi para 46 depois dele (pega descendo do pulo); entre o padrão novo e o que já está no chão, pelo menos 34 de chão livre (`ptEspaca`). Medido em 30 partidas: nenhum caso perto demais na tela.
  - Sempre tem saída (`cart2/ptsolve.js`): cada padrão novo é conferido por um jogador que decide a cada 0,1 s (nada, abaixar ou pular; sem manobras e sem o impulso), junto com o que já está vindo. Sem saída, o padrão chega 0,15 s depois (até 2,4 s) ou é tirado. Bola e coco andam na proporção da sua velocidade (depois de um tombo, quando você fica lento, o que foi planejado continua no mesmo ritmo); a queda do coco pode esperar. Testes: `testes/ptsaida.cjs` (o jogador da busca joga 60 partidas inteiras: nenhum tombo; nem antes da conferência ele achou combinação impossível, então o caso do dono provavelmente pedia abaixar, já que a bola passa na altura da cabeça e pulando só passa no alto do pulo) e `testes/ptconfere.cjs` (dois casos impossíveis de propósito: um é atrasado, o outro tirado).
- **Pendente:** o dono testar.
- **Atlas juntos (01/11):** cada personagem pintado novo (surfe, basquete, patins) fica num atlas só e numa máscara só (`cart2/junta.py`: cada animação ganha `y`, a imagem fica em `src`/`mask` do topo). Antes era uma imagem e uma máscara por animação e a página publicada chegou a 501 dos 511 arquivos; agora tem 450 imagens. Ao publicar, mandar as imagens novas e tirar (null) as que a página não usa mais.

## Vôlei
- **IAmiguinho:** 38 pranchas, completo.
  - Inclui a espera olhando para a bola: a cabeça sobe e desce conforme a altura da bola.
  - Inclui o saque só jogando a bola para cima.
- **Amiguinho:** completo na versão da ficha de modelo (41 pranchas), com os mesmos movimentos do IAmiguinho: olha para a bola e anda armando a cortada no chão.
  - Régua do Amiguinho: tamanho pela massa (raiz da área da silhueta), igual ao Amiguinho de antes; em cada quadro a massa é igualada (até ±10%), porque a geleia amassa e estica mas não muda de quantidade.
  - Encaixe do Amiguinho: parado no chão, os pés ficam presos; andando ou no ar, segue o centro do corpo. É o mesmo em todas as animações.
  - Quadros intermediários (`cart2/mids.py`): entre desenhos parecidos, um quadro do meio por fluxo óptico. O jogo mostra o do meio na primeira metade de cada troca. Vale no IAmiguinho e no Amiguinho; no skate, ainda não.
  - Olhar para a bola: entre a espera e a espera olhando para cima ou para baixo há dois desenhos do meio (1/3 e 2/3), feitos entortando um desenho só. A cabeça passa por eles aos poucos. Andar e parar trocam com folga de velocidade, para não ficar alternando.
  - Locomoção (parado, correndo, arrancando, freando, recuando): sai da velocidade suavizada e cada desenho fica pelo menos 0,16 s, para não trocar a cada quadro.
  - Amiguinho: sair do parado sempre passa pelo arrancar (quadros 2 a 4) e parar sempre passa pelo frear (quadros 5 e 6). O 1º e os 2 últimos quadros dessa prancha não entram, porque ficam em pé com as mãos para os lados e não emendam com a espera.
- **Adversários (cérebro novo, `cart2/aivolei.js`):**
  - Antes de cada toque, ele simula posições e escolhe a melhor: mandar longe de você ou levantar para cortar.
  - Calcula o pulo da cortada e, nos níveis altos, saca com cortada.
  - O peixinho vai para o lado em que a bola vai cair.
  - Assertividade de 40% (mais fácil) a 90% (mais difícil); no mais difícil, varia de 80% a 95% conforme o placar.
  - Torneio: fácil, médio, difícil e final.
  - A dificuldade se adapta ao placar: se você está na frente, ele se concentra; se ele está na frente, relaxa um pouco. Nos adversários fortes vale sempre.
  - As simulações estão em `jogos/jogos-de-verao/testes`.
- **Pontos:** partida normal até 7; a final do torneio e da Copa vai até 10.
- **Cortada:** a carregada até o fim sai mais rápida.
- **Bola e placar (31/10, pedidos do dono):** a bola passa na frente do placar (antes, o placar era desenhado por cima dela). No saque do Amiguinho, a bola na mão era desenhada 17% maior (tamanho da bola do desenho antigo de 16 bits) e parecia encolher ao ser jogada para cima; no estilo pintado ela fica sempre do mesmo tamanho. As duas mudanças estão no `cart2/build3.py`.
- **Pendente:**
  - placar, menus e HUD pintados;
  - o dono testar os botões no celular.

## Skate (Half-pipe)
- **Mortal (01/11, pedido do dono; segunda versão escolhida por ele):** segurar ▼ no ar, como o giro: enquanto segura, dá mortais para trás em volta do centro do corpo (600°/s, encolhido, quadro 2 do voo, `skp.js`); soltando, completa a volta em que está. Pousar com mais de 35° fora do em pé é tombo ("Pousou no meio do mortal"), mais de 10° desequilibra. Cada mortal completo vale mais (`HP_FLIPS`: 260, 620, 1050, 1550...; Mortal, Mortal duplo, triplo). O toque rápido em ▼ continua sendo a Rabeta; a Rabeta segurada e a Rabeta Giratória saíram (escolha do dono); girando, só ↑ combina. Os dois botões juntos (1ª versão) saíram. Teste: `testes/skmortal.cjs`.
- **Pranchas:** o IAmiguinho está todo pintado.
  - No chão: parado, impulso, freio, desequilíbrio e pouso.
  - No ar: saída da rampa, voo, flips (o corpo e o skate girando em separado), 3 pegadas e as 4 manobras dos botões.
  - Giro em 14 vistas.
  - Borda: manual, parada de mão, grind e stall.
  - Tombo.
- **Segurar a manobra:** segurar o botão ou a direção mantém a manobra, e ela só termina quando o jogador solta.
  - Vale para os botões e para as pegadas. Os flips terminam sozinhos.
  - Pousar segurando derruba.
- **Manobras combinadas:** segurar a manobra e girar meia volta ou mais cria uma manobra nova. Ela vale a manobra × 1,5, mais o giro, × 1,3.
  - As 6 têm prancha própria, com 8 vistas.

  | Comando | Manobra |
  |---|---|
  | ✕ + giro | Superman Giratório |
  | ○ + giro | Cristo Giratório |
  | □ + giro | Foguete Espiral |
  | △ + giro | Helicóptero |
  | ↑ + giro | Indy Giratória |
  | ↓ + giro | Rabeta Giratória |

  A Pegada Melão (↖) ficou de fora, porque o comando dela se confunde com o giro.
- **Cenário:** Skatepark do Viaduto (bairro Cidade da Costa WinnerZ), nos 4 horários.
  - Camadas: cidade ao fundo, viaduto grafitado e a rampa.
  - À noite, as luzes ficam numa camada própria que pulsa.
  - A rampa, o chão e os personagens pegam a cor da luz do horário.
  - Rampa: madeira azul, pista de compensado, deck, corrimão e borda de metal. O chão é de concreto.
- **Pouso:** cai com giro mais de 35° fora ou faltando mais de 20% da manobra; desequilibra acima de 10° ou faltando mais de 4%.
- **Bônus por segurar:** +60% da manobra por segundo segurado, até dobrar. O nome mostra o tempo.
- **Pendente:** o dono testar melhor os pontos das manobras combinadas.

## Onde estão os arquivos
- As fontes estão em `jogos/jogos-de-verao/`: o jogo base, os programas, os quadros das pranchas aprovadas, a ficha, o cenário e as páginas de pedidos. O `README.md` dessa pasta explica como montar o jogo e como incluir uma prancha nova.
- Os montados grandes (`mv5.js`, `mvsk.js`…) não ficam no repositório. Eles saem de novo dos quadros.
- **Toda prancha aprovada nova** precisa ir para essa pasta, com o recorte em `cart2/mv2/` e a prancha original quando for do skate, no mesmo commit em que entra no jogo.

## Editor do jogo (31/10)
- **Pedido do dono:** um editor completo para mudar visual, fases, mecânicas e textos sem depender do Claude. Escolhas dele: editar tudo (mecânicas, fases e pistas, visual e artes, textos e falas; e ainda a posição dos rostos no visor e os movimentos), "Rascunho + Aplicar" e página separada.
- **Onde fica:** dentro da página do jogo, num botão "Editor" no canto de baixo à esquerda que só aparece para o dono (quem só joga não vê). Abre uma tela inteira por cima do jogo. Não ficou numa página com link próprio porque outra página teria um banco de dados próprio e as mudanças não chegariam ao jogo.
- **Como guarda:** no banco da página do jogo (capacidade `db`, regra: todos leem, só o dono escreve), em `wz/rascunho` (salvo sozinho 1,2 s depois de cada mudança), `wz/aplicado` (o que vale para todo mundo) e `wz/v<data>` (uma versão por "Aplicar", com nome). O jogo lê `wz/aplicado` ao abrir. Nos testes locais (`?wzlocal=1` ou localhost) guarda no navegador.
- **Abas:**
  - Mecânicas: por prova, duração e medalhas + as constantes de cada prova (lista `WZ_REG` em `cart2/editor.js`), com controle deslizante, número e ↺; nomes em português em `WZ_NOMES`/`WZ_DESC` (os que faltam aparecem com o nome técnico);
  - Pistas do bugue: mapa de cada pista; mexe nos pontos da pista (arrastar, duplo clique põe, Shift+clique tira; as peças acompanham), caixas, rampas, esteiras (arrastar de lado muda a faixa), areia fofa, atalhos (água ou areia, com ou sem rampa), ladeiras (descida ou subida), farol, nome e fala da pista; desfazer;
  - Rostos e quadros: para cada personagem pintado (IAmiguinho do vôlei, Amiguinho, skate, embaixadinha, bocha), cada movimento e quadro: posição, tamanho e giro do rosto no visor (dá para arrastar) e o encaixe do quadro; copiar para todos os quadros; tocar o movimento; trocar a expressão;
  - Textos e falas: nome e subtítulo das provas e todas as falas do IAmiguinho (uma por linha);
  - Versões e cópia: voltar a uma versão aplicada, copiar/colar tudo como texto, limpar o rascunho.
- **Botões:** Testar (joga a prova escolhida com o rascunho, só para o dono), Aplicar no jogo (vale para todos e guarda versão), Fechar (volta ao aplicado).
- **Como funciona por dentro:** `WZ.apply(cfg)` volta tudo ao original e aplica a configuração (números e textos por caminho, pistas recalculadas, rostos e encaixes nas medidas de cada quadro e no quadro do meio). `cfg = { mec, pistas, rostos, textos }`.
- **Próximas etapas (ainda não feitas):** trocar artes subindo pranchas (recortar o verde e os quadros no próprio editor), velocidade dos movimentos, editar as outras fases (cancha da bocha, séries da embaixadinha etc.) no mesmo estilo do mapa das pistas.
- **Correções e mudanças de 31/10 (o dono: "abriu uma vez e não abre mais"; "tudo que eu puder editar arrastando, melhor"):**
  - o editor pausava o jogo e a tela de pausa ficava por cima do botão: o botão e o editor agora ficam acima de tudo; o editor não abre duas vezes, não fica esperando o banco para sempre (desiste em 8 s e abre com o que tiver) e mostra o erro na barra de cima se algo falhar;
  - a configuração vai guardada no banco como texto (campo `json`), porque o banco pode recusar nomes com ponto e listas dentro de listas (os pontos das pistas);
  - as perguntas (nome da versão, confirmar) são janelas do próprio editor: a página do jogo não pode abrir as janelas de pergunta do navegador (antes, "Aplicar" podia não fazer nada);
  - rostos e quadros: tudo arrastando no desenho, com 4 modos (mover o rosto, tamanho ↕, girar ↔, mover o desenho), rodinha do mouse para o tamanho e o quadro anterior clarinho por baixo para encaixar;
  - aba nova "Cancha da bocha": a cena da bocha com os 4 cantos da cancha e o ponto de lançamento para arrastar (a vila pintada acompanha a cancha), sortear o relevo de novo e voltar ao original.
- **Ajustes de 31/10 (pedido do dono):**
  - mecânicas: cada linha tem um "?" e mostra, com o mouse em cima, o que aquele número faz (e o valor original); as explicações ficam em `WZ_EXPL` (`cart2/editor.js`), por "OBJ.campo" ou "OBJ.*.campo"; todos os números listados têm explicação (conferido no teste);
  - rostos e quadros: mudar o número já muda o desenho na hora, enquanto digita (e com as setinhas do campo), sem precisar clicar no quadro de novo; os números acompanham o arraste ao vivo.
- **Botão sumido (31/10, relato do dono):** a ponte da página (`window.claude`) pode chegar depois do jogo começar e o editor verificava só uma vez; agora espera até 12 s por ela e aceita dono ou quem pode editar (`isOwner`, depois `canEdit`). Reserva: digitar e-d-i-t-o-r no teclado (fora de um campo) abre o editor sem o botão; se não reconhecer o dono, a barra de cima mostra o que faltou (ponte, banco, usuário). Não deu para conferir no navegador do Claude porque ele não está com a conta do dono.
- **Rosto ainda não atualizava ao vivo para o dono (31/10):** aqui atualizava; a causa provável era uma mudança de pista com uma peça fora da pista (ex.: atalho arrastado para depois do fim da linha), que fazia a aplicação parar no meio e o desenho do rosto não era refeito. Agora cada mudança é aplicada sozinha (uma com problema não impede as outras), as peças das pistas são sempre trazidas para dentro da pista (`wzPistaOk`) e o desenho é refeito mesmo se algo falhar. O botão "Editor" também confere de novo quem é o dono depois de 2, 5, 10 e 20 s (para o dono, o botão não aparecia; digitar "editor" funcionou).
- **Rostos não voltavam ao reabrir e não valiam no jogo (01/11, relato do dono):** o banco tinha guardado tudo certo (o rascunho e o aplicado com os rostos do IAmiguinho do vôlei); o problema era na leitura. Correções no `cart2/editor.js`:
  - a leitura agora espera a resposta confirmada do banco (até 8 s) em vez de aceitar a primeira resposta, que pode ser uma cópia antiga guardada no navegador; entre o que veio do banco e o que foi salvo na mesma visita, fica sempre o mais novo;
  - o editor abre com o mais novo entre o rascunho e o aplicado; se o banco não responder, a barra de cima avisa que abriu a última cópia guardada;
  - se o banco responder com uma prova em andamento, o aplicado entra quando a prova acaba (antes, ficava sem valer até recarregar a página);
  - as gravações do rascunho saem uma de cada vez e na ordem; fechar o editor, trocar de aba ou fechar a página logo depois de mexer grava na hora (antes, a última mudança podia se perder);
  - "Aplicar" grava o rascunho antes.
  - Teste novo: `testes/wzbanco.cjs` (banco de mentira que responde primeiro com uma cópia velha e depois com a confirmada; prova em andamento; fechar e abrir logo depois de mexer). O `wzeditor.cjs` agora espera 13,5 s depois de recarregar (no teste local, sem banco, o editor espera 12 s pela ponte).
- **Continuou igual para o dono (01/11, 00h59):** o banco tem a configuração inteira (187 quadros de rosto do IAmiguinho, aplicada de novo às 00h57); aqui, com essa mesma configuração num banco de mentira, o jogo e o editor mostram as mudanças (`testes/wzdono.cjs`; imagem de antes e depois em `testes/wzcomparar.cjs`). A falha está na leitura do banco de verdade, que não dá para abrir daqui (a página é só do dono e o navegador do Claude não está com a conta dele). Feito:
  - a leitura agora usa três caminhos ao mesmo tempo (acompanhando o documento, lendo o documento e lendo a lista `wz`, a mesma que a aba Versões usa) e fica com o mais novo;
  - linha de conferência no editor, embaixo do título: data da página, banco e dono, de onde veio o aplicado e quantos quadros, quantos quadros entraram no jogo e quando, o rascunho, o editor e os últimos erros de leitura. Pedido ao dono: foto dessa linha.
- **Causa achada (01/11, 01h21, com as fotos do dono):** os números salvos estavam certos (o run 1 voltava com -1, 5, 1, 6), mas o desenho do rosto mudava. O rosto do vôlei andava dentro do visor para "olhar para a bola" (até 12% da largura e 13% da altura do visor), e esse olhar ficava guardado depois de jogar: no jogo o rosto saía do lugar posto pelo dono e, ao reabrir o editor, o desenho vinha com o último olhar do jogo. Correção:
  - o editor desenha sempre com o rosto parado (sem olhar);
  - novo número em Mecânicas > Vôlei: "Rosto olhando para a bola" (`ROSTO.olhar`), 0 por padrão = o rosto fica exatamente onde o dono pôs; 1 = olha para a bola como antes. Vale para o IAmiguinho e o Amiguinho (`anim5.js` e `animb2.js`).
  - Teste: `testes/wzolhar.cjs` (editor igual antes e depois de jogar; no jogo o rosto igual ao do editor; com 1 o rosto se mexe).
- **Dificuldade dos adversários do vôlei (01/11, pedido do dono):** em Mecânicas > Vôlei, seção "Dificuldade dos adversários": partida rápida, as 4 fases do Torneio (`OPP.*.lvl`) e as 7 fases da Copa (`COPA_LVL`), cada uma com uma barra de 0 até 1,2 e o nome ao lado (fácil < 0,2, médio < 0,5, difícil < 0,8, muito difícil < 1, extremo, e IMPOSSÍVEL no máximo). Não dá para passar do máximo.
  - **Impossível (`cart2/impossivel.js`, `VOLEI_IMP = 1.2`):** decide sempre certo, reage na hora, anda mais rápido (1,7x), sem humor; todo toque dele que não iria cair do seu lado vira uma bola certa do seu lado e longe de você; se a bola for cair do lado dele (ou no 4º toque), ele pega no último instante e devolve. Na Copa, a fase no máximo deixa todas as seleções no impossível; abaixo disso nenhuma passa de 1,19.
  - Medido (`testes/vimpossivel.cjs`, jogador = cérebro antigo no melhor nível): no 1,02 (extremo) o jogador fez 15 pontos em 12 partidas; no impossível, 0 pontos em 12 partidas (2 defesas no último instante).
  - Teste do editor: `testes/wzdificuldade.cjs`.
- **Teste:** `testes/wzeditor.cjs` (abre, muda número, rosto (arrastando o tamanho) e fala, aplica com nome, abre de novo depois de jogar e pausar e pela terceira vez, arrasta o lançamento da bocha, recarrega e confere); `testes/wzaovivo.cjs` (explicações, rosto ao vivo digitando, números acompanhando o arraste); `testes/wzrostos_vivo.cjs` (os 6 números em cada um dos 5 personagens mudam o desenho na hora); `testes/wzpista_estragada.cjs` (rascunho com atalho fora da pista não trava o rosto nem o jogo).

## Teco-teco d'Água (01/11, ideia do dono)
- **Pedido do dono:** um jogo de avião no estilo navinha, atirando água com uma pistola presa no teco-teco e jogando bexigas d'água; alvos como balões e drones; os Amiguinhos na tela atirando nos mesmos alvos (quem estoura primeiro leva); argolas e outras formas de pontuar; bexigas nos adversários deixam eles tontos sem pontuar.
- **Como é** (`cart2/ev_teco.js`, entre a Canoagem e o Futebol):
  - de lado, o cenário passa sozinho; quatro teco-tecos voam livres (◀ ▶ ▲ ▼ ou analógico): o IAmiguinho (azul) e os Amiguinhos Rosa, Amarelo e Verde;
  - água: segurar ✕ / Espaço / "Água" atira gotas da pistola; o tanque esvazia e enche num rasante no mar (bem baixo, espirrando água); no alto enche bem devagar; o nível aparece na bolha em cima do nariz e no canto da tela;
  - bexiga: ○ / X / "Bexiga" joga uma bexiga que cai em curva; acertou um teco-teco, o piloto fica tonto 2,8 s (rodopia, não atira, não pontua) e quem jogou ganha 100; depois fica 1,3 s sem poder levar outra; acertou alvos, estoura tudo em volta; começa com 3, máximo 5; cestas de bexigas descem de paraquedas (+3);
  - alvos (quem dá o último acerto leva): balão de festa 100 (sobem da praia, cachos de 5), pipa presa num barco 150 (2 acertos), drone 250 (3), patinho inflável preso em balões 350 (4) e o dirigível da Costa WinnerZ (aos 52 s e aos 100 s) com 4 alvos de 200 (3 acertos cada) e bônus de 600 para quem fizer o último;
  - argolas douradas em arco de 5: a primeira passagem leva 120, argolas seguidas (até 4 s entre uma e outra) +40 cada (antes 150 e +60);
  - estouros seguidos rápidos (1,2 s) fazem sequência: ×1,25, ×1,5… até ×2;
  - 2 minutos, com 3, 2, 1 e "Vai!"; no fim, a colocação dos quatro pelo placar decide a medalha (1º ouro, 2º prata, 3º bronze). A pontuação da prova é 3.000 / 2.200 / 1.600 / 400 pela colocação mais os pontos ÷ 10 (até 599);
  - os Amiguinhos escolhem o melhor alvo à frente (pontos, distância, quantos acertos faltam), alinham a altura e atiram; pegam argolas e cestas; enchem o tanque no mar; jogam bexiga em quem está à frente e mais abaixo, de preferência em quem está ganhando; às vezes desviam de bexigas. Acerto 0,86, 0,91 e 0,96 (veja "Mais difícil").
- **Na tela:** o tempo no alto, o placar dos quatro no canto direito, o tanque e as bexigas no canto esquerdo; no fim, a colocação. Céu nos 4 horários pelo relógio, morro, cidade e farol (com luz girando à noite), gaivotas ao longe e o mar com ondas.
- **Celular:** setas e os botões "Água" e "Bexiga". **Controle:** analógico, ✕ água, ○ bexiga.
- **Editor:** Mecânicas > Teco-teco d'Água > "Voo, água e bexigas" (duração, velocidades, gasto e enchimento do tanque, bexigas, tempo tonto, pontos das argolas, acerto dos Amiguinhos, tamanho dos teco-tecos).
- **Música:** usa o Turbo Jet até chegar uma faixa própria.
- **Arte:** provisória, toda desenhada pelo jogo. Os pedidos estão na página de pedidos (Teco-teco d'Água: teco-tecos do IAmiguinho e do Amiguinho, atirando e jogando bexiga, tonto, folha dos alvos, dirigível, argola e água, e o céu com o mar nos 4 horários, que também aparece em "Todos os cenários").
- **Ajustes do dono (01/11):** aviões menores (tamanho 0,85, antes 1,2), para sobrar mais céu livre; com o tanque vazio a pistola não atira mais: só volta quando o tanque chega a 25% (no rasante isso leva meio segundo; no alto, uns 12 s). O "Tanque vazio!" aparece uma vez e a barra do tanque pisca. Os dois números estão no editor ("Tamanho dos teco-tecos" e "Água no tanque para a pistola voltar a atirar").
- **Mais difícil (01/11, pedido do dono: estava fácil, os Amiguinhos ficavam colados brigando pelas mesmas coisas, e dava para ficar na frente de todo mundo atirando):**
  - cadência da pistola caiu à metade (4,5 gotas por segundo, antes 9) e cada gota gasta quase o dobro de água (o tanque cheio dura uns 11 s de tiro);
  - as gotas vão só até uns 240 px (somem antes); ninguém passa de 60% da largura da tela (não dá mais para ficar colado na borda da direita);
  - cada Amiguinho tem um jeito: **Rosa** voa alto e fica mais atrás, de longe, atrás de drones, patinhos e do dirigível; **Amarelo** fica no meio da altura e no meio da tela, caça argolas, balões e cestas; **Verde** voa baixo e na frente, pega o que acabou de entrar na tela, rouba o último acerto dos alvos que os outros quase estouraram e joga muita bexiga em quem está ganhando;
  - eles se espalham: um alvo ou uma fileira de argolas que outro Amiguinho já foi buscar vale bem menos para os outros, e eles desviam uns dos outros (colados passou de 31% para uns 12% do tempo);
  - quando você abre mais de 900 pontos sobre o melhor Amiguinho, eles apertam: jogam melhor e saem para te caçar com bexigas (ficam atrás e acima de você);
  - acerto dos Amiguinhos 0,74, 0,8 e 0,86.
  - No teste, o jogador que fica na frente segurando a água ganhou 2 de 6 partidas (antes ganhava todas, longe), levando 4 a 7 bexigas por partida.
- **Mais difícil, segunda rodada (01/11, o dono fez 19.310 contra 9.160 e achou fácil):**
  - descoberto: os Amiguinhos miravam na altura do alvo sem contar que a gota cai no caminho, e por isso quase não atiravam de longe; agora compensam a queda;
  - atiram em qualquer alvo que estiver na linha, não só no que escolheram; descem para encher o tanque só quando está quase vazio e só voltam com ele pela metade;
  - argolas valiam demais para quem ficava na frente (um jogador bom fazia 6 a 8 mil só nelas, os Amiguinhos 1 mil): agora 120 a primeira e +40 cada seguida (antes 150 e +60), e os três vão mais atrás delas (Amarelo principalmente);
  - acerto dos Amiguinhos 0,86, 0,91 e 0,96; desviam mais das bexigas;
  - quando você abre mais de 600 pontos (antes 900), eles apertam: voam um pouco mais rápido, saem da altura preferida para disputar tudo, atiram com mais folga e te caçam com bexigas;
  - no teste `teco_humano.cjs`, um "jogador bom" simulado (que antes fazia uns 20 mil contra 7 a 12 mil) ganhou 3 de 8 partidas, por pouco; o jogador "na frente atirando" não ganhou nenhuma de 4.
- **Teste:** `testes/teco_humano.cjs` (um jogador bom simulado contra os Amiguinhos, com os pontos de cada um por origem) e `testes/teco.cjs` (partidas simuladas, o jogador "na frente segurando a água", quanto tempo os Amiguinhos ficam colados, tanque vazio sem atirar, rasante enchendo e fotos de uma partida com o teclado).

## Atalhos das pistas do bugue (01/11)
- Atalho (lagoa ou areia fofa) precisa ter pelo menos uns 160 px de comprimento. Mais curto que isso, a corrida ignora e o editor não deixa criar (nem guarda). Antes, um atalho curto quebrava o desenho da corrida inteira.

## Trilha sonora gravada (01/11)
- **O dono mandou:** 22 músicas (7 primeiro e mais 15 no mesmo dia); "Carnaval na Areia" é a música tema. Cada prova tem a sua.
- **Onde cada uma toca:**
  - Carnaval na Areia (tema): a abertura, até a 1ª prova começar;
  - Disco do Caranguejo: os menus e as telas de resultado depois da 1ª prova (volta do ponto onde parou);
  - Mambo do Pódio: o pódio do fim da semana (sem a vinheta de código por cima);
  - provas: vôlei Forró do Coqueiro; surfe Onda Gigante; half-pipe Skate no Calçadão; embaixadinha Samba da Embaixadinha; patins Rinque Neon; basquete Cesta de Três; pingue-pongue Tic-Tac Swing; BMX Manobra Radical; corrida na areia Kuduro na Areia; frisbee Disco Voador; tiro com arco Na Mosca; duelo de água Guerra de Água; canoagem Remada Polinésia; futebol Gol de Bicicleta; bocha Tarantela da Bocha; natação Braçada Turbo; jet ski Turbo Jet; bugue Bugue Turbo;
  - Soca do Coco (`festa.mp3`): ficou sem lugar depois que cada prova ganhou a sua faixa; o arquivo continua na pasta.
- **Volume (pedido do dono: a música não pode cobrir os sons e efeitos):** todas as faixas igualadas em -18 LUFS (`musica.py`); no jogo tocam a 25% no volume padrão (cerca de -30 LUFS), e os efeitos sonoros ficaram 2x mais altos (`SFX_GANHO` em `musica.js`). Antes a música ficava uns 12 dB acima dos efeitos. O volume de música das opções (0 a 10) agora vale também para as faixas gravadas (5 = padrão, 10 = o dobro).
- **Como funciona:** as faixas ficam em `jogos_verao/musica/` (publicadas junto com a página). `cart2/musica.py` prepara as originais do dono (`cart2/musica_src/<prova>.mp3`): tira o silêncio do fim (para emendar sem buraco), iguala o volume e reduz para 128 kbps (~1 a 2 MB cada). `cart2/musica.js` (entra no `build3.py` logo depois do sistema de música) troca a música de código pelas faixas: troca suave entre faixas, a pausa abaixa, o botão de música liga e desliga, e a música para quando a aba fica escondida. As vinhetas de medalha continuam as de código, por cima. Se uma faixa não carregar, volta a música de código.
- **A tabela prova -> faixa** fica no começo de `cart2/musica.js` (`PROVA`). Ao trocar o arquivo de uma faixa, mudar `V` para o navegador baixar de novo (está em '2').
- **iPhone e iPad:** lá o volume de uma faixa não muda pelo código: a troca de faixa é seca, a pausa não abaixa a música e a faixa toca no volume do aparelho (a música fica mais alta em relação aos efeitos do que no computador).
- Cópia das faixas prontas no repositório: `jogos/jogos-de-verao/musica/` (as originais em 320 kbps ficam com o dono).
- **Teste:** `testes/trilha.cjs` (abertura com o tema, as 18 provas com a sua faixa, pausa, resultado, botão desligado e ligado, pódio, os 22 arquivos carregando).
## No site do WinnerZ (01/11, pedido do dono)
- **Endereços:** `/jogos-de-verao` (o jogo em tela inteira, para quem tem acesso ao site) e `/studio/jogos-de-verao` (o mesmo jogo com o editor já aberto; só a administração; cartão "Jogos de Verão" no Studio). O link discreto "WinnerZ" no canto de baixo volta para o site.
- **Como funciona:** a página pronta do jogo fica em `public/demo/jogos-verao/` (cópia da pasta `jogos_verao` que o `build3.py` monta: `index.html`, `img/`, `musica/`). A página do site (`src/pages/JogosVerao.tsx`) mostra o jogo numa moldura e liga nele a ponte `src/lib/jogosPonte.ts`, que faz o papel do banco da página do Claude: o editor não muda nada e funciona nos dois lugares.
- **Onde fica guardado no site:** tabela `jogo_dados` (caminhos `verao/wz/rascunho`, `verao/wz/aplicado`, `verao/wz/v<data>`) e pasta `jogos` do Storage (imagens pintadas, `verao/<arquivo>-<código>.webp`). Todo mundo lê; só a administração grava (migração `0097_jogos_de_verao.sql`). **O dono precisa rodar a 0097 no Supabase (SQL Editor) uma vez**; até lá, a página avisa a administração no alto.
- **Começo igual ao da página do Claude:** na primeira vez, com o banco do site vazio, o editor e o jogo usam a "semente" (`cart2/semente.json`, o rascunho e o aplicado do dono em 01/11, 01h42/01h28, 187 quadros de rosto). O primeiro "Aplicar" no site passa a valer dali em diante. Os dois lugares não se misturam depois disso: o que for feito no site fica no site.
- **Atualizar o jogo no site:** depois do `build3.py`, copiar `jogos_verao/` para `public/demo/jogos-verao/` e enviar (o Vercel publica sozinho).
- **Achado no caminho:** o jogo aplicava o que foi salvo assim que o banco respondia; com o banco rápido, isso acontecia antes de os desenhos dos personagens terminarem de carregar, e os rostos não entravam. Agora espera a página montar. Pode ter sido parte do problema dos rostos de 01/11 de madrugada.
- **Teste:** `testes/wzsite.cjs` com `testes/wzsite_host.html` (moldura igual à do site, com um Supabase de mentira).

## Desenho inteiro e pintura no editor (01/11, pedido do dono)
- **Desenho inteiro de cada quadro** (Rostos e quadros > "Desenho inteiro neste quadro"): mover (já existia), tamanho e giro em volta dos pés, em número ou arrastando ("Tamanho do desenho" e "Girar o desenho"). Vale para todos os personagens (`f.ks` e `f.kr` nos quadros; desenhados em `anim5.js`, `animb2.js`, `skp.js`, `ebp.js`, `bcp.js`).
- **Aba Pintura, escolha do dono: pintura própria, sem anúncios (o Photopea foi descartado).** Pincéis e importação em `cart2/pintura.js`; a tela em `cart2/pintura2.js`.
- **3ª etapa (01/11): a cara e os gestos do Procreate, pedido do dono para achar os botões com facilidade.** Abre em tela cheia, escura, por cima do editor.
  - **Galeria:** personagem, movimento, quadros (miniaturas; • = pintado e não salvo), "o desenho" ou "o visor"; cenários ("só as grandes" ou "todas"). Em cima: "‹ Editor" (volta à aba de antes), "Salvar (N)" e "Aplicar no jogo".
  - **Barra de cima, como no Procreate:** à esquerda Galeria, Ações (chave), Ajustes (varinha), Seleção, Transformar; à direita Pincel, Borrar, Borracha, Camadas e a bolinha de cor. Tocar de novo no Pincel, Borrar ou Borracha abre a **biblioteca de pincéis** daquela ferramenta (cada uma guarda o seu); tocar no pincel escolhido abre o **estúdio do pincel**.
  - **Barra do lado:** tamanho, quadradinho do conta-gotas, opacidade, desfazer e refazer (canhoto: vai para a direita, em Ações > Preferências).
  - **Biblioteca:** coleções à esquerda (Prontos e uma por arquivo importado), pincéis com o traço de amostra; "+" importa.
  - **Camadas:** miniaturas; "N" abre mistura (16 modos) e opacidade; tocar na camada escolhida abre as opções: copiar para outros quadros, renomear, selecionar, copiar, colar, preencher, limpar, travar a transparência, máscara de recorte, inverter as cores, duplicar, juntar com a de baixo, subir, descer, apagar.
  - **Cor:** Disco (anel de matiz com quadrado), Clássico (barras), Paletas, código, cor atual e anterior, histórico. Arrastar a bolinha de cor até a imagem enche a área (como o ColorDrop).
  - **Ações:** Adicionar (inserir imagem, recortar, copiar, colar), Tela (espelhar a imagem, simetria, assistente de animação, ver inteira), Imagem (salvar, voltar à original, baixar PNG), Preferências (canhoto, o dedo pinta sem caneta, contorno do pincel, pressão), Ajuda (gestos).
  - **Ajustes:** matiz/saturação/brilho, desfoque gaussiano, de movimento, ruído, nitidez, liquefazer (empurrar). Barra embaixo com Aplicar/Cancelar; arrastar na imagem para os lados muda o primeiro número.
  - **Seleção:** automática (por cor; arrastar para os lados muda a tolerância), mão livre, retângulo, elipse; nova/somar/tirar; inverter, copiar e colar, difusão, preencher, limpar. Listras azuis andando por fora do selecionado.
  - **Transformar:** livre ou uniforme, espelhar, girar 45°, encaixar, restaurar; bolinha verde gira.
  - **Linha reta/elipse (QuickShape):** segurar a caneta parada 0,6 s no fim do traço.
  - **Assistente de animação (personagens):** quadros embaixo (tocar troca de quadro, mantendo a vista), tocar a animação, cebola (0 a 3 quadros antes em vermelho e depois em verde, alinhados pelos pés) e opacidade, "Copiar camada…".
  - **Copiar camada para outros quadros (pedido do dono):** escolhe os quadros (ou "Todos os quadros deste movimento"); "Alinhar pelos pés" põe o desenho no mesmo lugar do corpo em cada quadro (diferença dos pontos de apoio). Cada quadro fica aberto com a camada nova até salvar; "Salvar (N)" leva todos de uma vez (uma imagem nova por folha).
  - **Gestos (corrigido o problema do iPad):** um dedo só começa a pintar depois de um instante (0,12 s) ou de andar um pouco; se chegar o segundo dedo, o traço é cancelado e vira gesto (pinça aproxima, gira e move; pinça rápida para dentro encaixa). Toque com 2 dedos desfaz, 3 refaz, 4 esconde a interface; 3 dedos para baixo abre copiar e colar; dedo parado é conta-gotas. Depois que a caneta encosta uma vez, o dedo nunca mais pinta (só gestos); a mão encostando enquanto a caneta pinta é ignorada.
  - **Importar pincéis do Procreate (corrigido):** o campo de arquivo não filtra mais o tipo (no iPad o filtro escondia os .brush e .brushset no app Arquivos); o tipo é reconhecido pelo conteúdo; lê zip com descritores de dados e zip64; ignora as pastas Reset/ e QuickLook/ do Procreate; pincel sem Shape.png (forma da biblioteca do Procreate) entra com ponta redonda. Também .abr do Photoshop e imagens. Ficam no navegador (IndexedDB); saem com o ×.
  - **Ainda não tem:** texto, régua de perspectiva, dinâmica fina dos pincéis do Procreate (velocidade, afinar pontas, cor que varia), linha do tempo para criar quadros novos.
- "Salvar" junta as camadas, monta a folha com os quadros pintados e guarda a imagem; o jogo troca na hora (registro de imagens `cart2/imgreg.js`) e refaz as versões coloridas dos Amiguinhos. Vale para todo mundo depois do "Aplicar no jogo". O visor salvo troca a máscara do rosto daquele quadro.
- Onde a imagem fica: no site, na pasta `jogos` do Storage. Na página do Claude não há onde guardar imagens: a pintura vale só até recarregar (o editor avisa).
- Testes: `testes/wzpintura3.cjs` (dedos, pinça, caneta, importar, camadas, copiar para quadros, salvar, ajustes, seleção, transformar, celular) e `testes/wzsite.cjs`; pincéis de teste em `testes/pinceis/` (`Real.brushset` imita um de verdade, com Reset/ e QuickLook/). Os testes da 1ª e 2ª etapas saíram (a tela mudou).

