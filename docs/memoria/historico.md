# Histórico

A entrada mais nova fica em cima. Cada entrada traz o que foi feito, o que foi decidido e o que ficou pendente.

---

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
