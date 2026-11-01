/* ============================================================ EDITOR DO JOGO (só para o dono)
   Uma tela própria, por cima do jogo, que só aparece para quem é dono da página. Tudo o que muda fica num RASCUNHO
   (salvo sozinho); "Testar" joga com o rascunho só nesta tela; "Aplicar" leva o rascunho para o jogo de todo mundo
   e guarda uma versão (dá para voltar). Partes:
   - Mecânicas: os números de cada prova (duração, medalhas e as constantes de física e dificuldade);
   - Pistas: as 3 pistas da corrida de bugue (pontos da pista, caixas, rampas, esteiras, areia fofa, atalhos, ladeiras, farol);
   - Rostos e quadros: posição, tamanho e giro do rosto no visor e o encaixe de cada quadro, em todos os desenhos pintados;
   - Textos: falas do IAmiguinho e nomes das provas;
   - Versões: voltar a uma versão aplicada, copiar e colar tudo (cópia de segurança).
   Onde fica guardado: no banco da própria página (db), em wz/rascunho, wz/aplicado e wz/v<data> (versões). */
// o rosto acompanhar a bola com o olhar (vôlei): 0 = fica exatamente onde o dono colocou nos Rostos e quadros
const ROSTO = window.ROSTO = { olhar: 0 };
const WZ_OBJS = { ROSTO, COPA_LVL, SF_MAN, SOBJ, HP_AIR, HP_BTN, HP_LIP, EB_BOLAS, PT_MAN, PT_GRIND, BQ, BX, BX_MAN, OB, OB_TIPO, FR, AR, DU, CN, FU, NT, JS, JS_MAN, DIVE, SERVE, SPEC, SPK, SPK_F, SPKG, OPP, PP, BC, BG };
const WZ_REG = {
  surfe: ['SF_MAN', 'SOBJ'], halfpipe: ['HP_AIR', 'HP_BTN', 'HP_LIP'], embaixadinha: ['EB_BOLAS'], patins: ['PT_MAN', 'PT_GRIND'], basquete: ['BQ'],
  pingue: ['PP'], bmx: ['BX', 'BX_MAN'], obstaculos: ['OB', 'OB_TIPO'], frisbee: ['FR'], arco: ['AR'], duelo: ['DU'], canoagem: ['CN'], futebol: ['FU'],
  bocha: ['BC'], natacao: ['NT'], jetski: ['JS', 'JS_MAN'], bugue: ['BG'], volei: ['ROSTO', 'DIVE', 'SERVE', 'SPEC', 'SPK', 'SPK_F', 'SPKG', 'OPP'],
};
// nomes em português dos números (os que não estão aqui aparecem com o nome técnico)
const WZ_NOMES = {
  G: 'Gravidade', GY: 'Gravidade (vertical)', BG: 'Gravidade da bola', VMAX: 'Velocidade máxima', VMIN: 'Velocidade mínima', SPD: 'Velocidade de andar', DSPD: 'Velocidade do pique',
  JV: 'Força do pulo', JH: 'Altura do pulo', JT: 'Tempo do pulo', R: 'Raio da bola', RR: 'Raio do aro', ACC: 'Aceleração', DRAG: 'Resistência do ar', CHG: 'Tempo para carregar a força',
  KICK: 'Força do chute', KMAX: 'Chute máximo', REACH: 'Alcance', BOUNCE: 'Quique', GH: 'Altura do gol', GW: 'Largura do gol', PXM: 'Pixels por metro', LEN: 'Comprimento da piscina',
  GLIDE: 'Deslize', PERF: 'Janela do perfeito', GOOD: 'Janela do bom', AIR: 'Tempo no ar', BREATH: 'Fôlego', FLOW: 'Correnteza', CAMX: 'Posição da câmera', LAPS: 'Voltas',
  VBOOST: 'Velocidade no turbo', ISL: 'Tamanho da ilha', CP: 'Raio da boia', WW: 'Largura do mundo', WH: 'Altura do mundo', CX: 'Centro x', CY: 'Centro y',
  SPR: 'Velocidade correndo', JOG: 'Velocidade trotando', WALK: 'Velocidade andando', DRAIN: 'Cansaço', REC: 'Recuperação', RECW: 'Recuperação andando', SX: 'Posição na tela',
  PED: 'Força da pedalada', VPED: 'Velocidade da pedalada', PUMP: 'Força do bombeado', ROT: 'Velocidade do giro', CLEAN: 'Margem do pouso limpo', DRAW: 'Tempo para puxar o arco',
  X0: 'Posição de saída', AMIN: 'Ângulo mínimo', AMAX: 'Ângulo máximo', AV: 'Velocidade da mira', CATCH: 'Distância para pegar', KL: 'Sustentação', KD: 'Arrasto',
  DT: 'Duração do pique', DCD: 'Espera entre piques', RATE: 'Tiros por segundo', GOTA: 'Tamanho da gota', WETG: 'Molhado para perder', STUN: 'Tempo atordoado', REF: 'Recarga',
  VMAXS: 'Velocidade máxima', TRES: 'Distância da linha de 3', CD: 'Espera', NEAR: 'Distância de perto', PR: 'Raio do jogador', YT: 'Margem de cima', YB: 'Margem de baixo',
  vx: 'Velocidade x', vy: 'Velocidade y', fric: 'Atrito', rest: 'Quique', v0: 'Força mínima', v1: 'Força máxima', max: 'Máximo', back: 'Recuo', h: 'Altura', w: 'Largura', f: 'Quadros', x: 'Multiplicador', v: 'Valor', d: 'Duração', nota: 'Nota',
};
const WZ_DESC = {
  ROSTO: { olhar: 'Rosto olhando para a bola' },
  BG: { padW: 'Meia largura da esteira de turbo', kr: 'Tamanho do corpo do bugue na batida (raio)', kf: 'Distância do centro até a frente e a traseira na batida', boxR: 'Raio da caixa de item', boxT: 'Segundos para a caixa voltar',
    voltas: 'Voltas por corrida', hw: 'Meia largura da pista', r: 'Raio do bugue na mureta', vmax: 'Velocidade máxima', eng: 'Força do motor', brake: 'Força do freio', grip: 'Aderência', gripD: 'Aderência derrapando',
    wb: 'Distância entre os eixos (curva)', water: 'Freio na água', boostV: 'Ganho do turbo', sw: 'Meia largura do atalho', Z: 'Zoom da câmera', g: 'Gravidade dos saltos' },
  BC: { x0: 'Cancha: esquerda (casada com o desenho da vila)', x1: 'Cancha: direita', y0: 'Cancha: em cima', y1: 'Cancha: embaixo', sx: 'Linha de lançamento (x)', sy: 'Linha de lançamento (y)', rb: 'Raio da bola',
    rj: 'Raio do bolim', fc: 'Atrito da areia', fv: 'Atrito que cresce com a velocidade', G: 'Força dos montinhos e buracos', meter: 'Escala da medida', fofa: 'Freio da areia fofa' },
};
// explicação de cada número (aparece ao parar o mouse em cima da linha). Chave: "OBJ.campo" ou "OBJ.*.campo" (vale para todos os itens).
const WZ_EXPL = {
  'COPA_LVL.*': 'Dificuldade do Amiguinho nesta fase da Copa. 0 = bem fácil; o máximo é impossível (ele não erra).',
  'ROSTO.olhar': 'Quanto o rosto anda dentro do visor para olhar a bola durante o vôlei. 0 = o rosto fica parado exatamente onde você colocou em Rostos e quadros. 1 = anda um pouco, olhando para a bola (era assim antes de 01/11). Vale para o IAmiguinho e o Amiguinho.',
  'ev.dur': 'Quanto tempo dura a partida, em segundos. 0 quer dizer que a prova acaba por tentativas ou pontos, não pelo relógio.',
  'ev.med.0': 'Pontos que a pessoa precisa fazer para ganhar a medalha de bronze.', 'ev.med.1': 'Pontos para ganhar a medalha de prata.', 'ev.med.2': 'Pontos para ganhar a medalha de ouro.',
  'SF_MAN.*.v': 'Pontos que a manobra vale quando o pouso dá certo.', 'SF_MAN.*.d': 'Quanto tempo a manobra leva no ar (segundos). Maior = precisa de um voo mais longo; pousar antes de acabar é queda.',
  'SOBJ.*.r': 'Tamanho do objeto na colisão (raio). Maior = mais fácil de pegar ou de bater.', 'SOBJ.*.v': 'Pontos que o objeto dá ao ser pego.',
  'HP_AIR.*.v': 'Pontos da manobra no ar.', 'HP_AIR.*.d': 'Tempo que a manobra leva (segundos). Maior = precisa de mais altura.',
  'HP_BTN.*.v': 'Pontos da manobra.', 'HP_BTN.*.d': 'Tempo que a manobra leva (segundos).', 'HP_BTN.*.f': 'Qual desenho a manobra usa (número do quadro).', 'HP_BTN.*.tmp': 'Ordem da manobra no tutorial/lista.',
  'HP_LIP.*.v': 'Pontos da manobra na borda.', 'HP_LIP.*.T': 'Quanto tempo dá para ficar na borda antes de cair (segundos).',
  'EB_BOLAS.*.g': 'Peso da bola (gravidade). Maior = cai mais rápido; menor = flutua.', 'EB_BOLAS.*.ar': 'Resistência do ar. Maior = a bola freia mais no ar (bola de praia).',
  'EB_BOLAS.*.vento': 'Quanto o vento empurra a bola. Maior = mais difícil com vento.', 'EB_BOLAS.*.sobe': 'Força do toque para cima. Maior = a bola sobe mais a cada toque.',
  'EB_BOLAS.*.espalha': 'Quanto o toque joga a bola para os lados.', 'EB_BOLAS.*.curva': 'Quanto a bola faz curva depois da firula.',
  'EB_BOLAS.*.quica': 'Quanto a bola quica no chão (0 = não quica, 1 = quica igual).', 'EB_BOLAS.*.rola': 'Quanto a bola continua rolando no chão.',
  'EB_BOLAS.*.giro': 'Velocidade do giro do desenho da bola (só visual).', 'EB_BOLAS.*.danca': 'Desvio de lado a cada toque (a bola "dança"). Maior = mais imprevisível.', 'EB_BOLAS.*.r': 'Tamanho da bola (raio). Maior = mais fácil de acertar.',
  'PT_MAN.*.v': 'Pontos da manobra no ar.', 'PT_MAN.*.d': 'Tempo que a manobra leva (segundos).', 'PT_GRIND.*.f': 'Qual desenho o estilo usa no corrimão.', 'PT_GRIND.*.x': 'Multiplicador de pontos do estilo no corrimão.',
  'BQ.G': 'Gravidade da bola. Maior = arremesso mais "reto" e rápido.', 'BQ.VMIN': 'Força do arremesso mais fraco.', 'BQ.VMAX': 'Força do arremesso mais forte.',
  'BQ.CHG': 'Tempo segurando o botão até a força máxima (segundos).', 'BQ.R': 'Tamanho da bola.', 'BQ.RR': 'Tamanho do aro. Maior = mais fácil de acertar.', 'BQ.PR': 'Folga na beira do aro: quanto a bola pode raspar e ainda entrar.',
  'BQ.TRES': 'Distância da linha de 3 pontos.', 'BQ.CD': 'Espera entre um arremesso e outro (segundos).', 'BQ.SPD': 'Velocidade de andar.', 'BQ.NEAR': 'O mais perto da cesta que dá para chegar.',
  'PP.g': 'Gravidade da bolinha.', 'PP.k': 'Resistência do ar na bolinha.', 'PP.cm': 'Força do efeito (quanto o efeito curva a bola).', 'PP.r': 'Tamanho da bolinha.',
  'PP.tx0': 'Começo da mesa (esquerda).', 'PP.tx1': 'Fim da mesa (direita).', 'PP.nx': 'Posição da rede.', 'PP.netH': 'Altura da rede. Maior = mais bolas na rede.', 'PP.half': 'Metade do comprimento da mesa.',
  'PP.sweet': 'Tamanho do ponto bom da raquete. Maior = mais fácil acertar em cheio.', 'PP.reachF': 'Alcance da raquete para a frente.', 'PP.reachB': 'Alcance da raquete para trás.',
  'PP.hMin': 'Altura mais baixa que dá para rebater.', 'PP.hMax': 'Altura mais alta que dá para rebater.', 'PP.spd': 'Velocidade de andar.', 'PP.armSpd': 'Velocidade andando com a raquete preparada.',
  'PP.accel': 'Aceleração ao andar.', 'PP.ts': 'Multiplicador da velocidade da batida.', 'PP.home.0': 'Posição de espera do lado esquerdo.', 'PP.home.1': 'Posição de espera do lado direito.', 'PP.arm': 'Força extra ao preparar o golpe com antecedência.', 'PP.sw': 'Duração do movimento da raquete (segundos).',
  'BX.G': 'Gravidade. Maior = voos mais curtos.', 'BX.GY': 'Altura do chão na tela.', 'BX.PED': 'Força da pedalada.', 'BX.VPED': 'Velocidade máxima só pedalando.', 'BX.PUMP': 'Força do bombeado nas rampas.',
  'BX.DRAG': 'Resistência (freio natural).', 'BX.VMAX': 'Velocidade máxima.', 'BX.VMIN': 'Velocidade mínima.', 'BX.ROT': 'Velocidade do giro no ar.', 'BX.SX': 'Posição da bicicleta na tela.', 'BX.CLEAN': 'Margem do pouso limpo: quanto a bike pode estar torta e ainda contar como pouso limpo.', 'BX.WOB': 'Margem do pouso "ufa" (torto, mas sem cair).',
  'BX_MAN.*.v': 'Pontos da manobra.', 'BX_MAN.*.d': 'Tempo que a manobra leva (segundos).',
  'OB.PXM': 'Pixels por metro (escala da pista).', 'OB.SPR': 'Velocidade correndo no máximo (metros por segundo).', 'OB.JOG': 'Velocidade trotando.', 'OB.WALK': 'Velocidade poupando.', 'OB.ACC': 'Aceleração.',
  'OB.DRAIN': 'Quanto o fôlego cai correndo. Maior = cansa mais rápido.', 'OB.REC': 'Quanto o fôlego volta trotando.', 'OB.RECW': 'Quanto o fôlego volta poupando.', 'OB.JT': 'Duração do pulo (segundos).', 'OB.JH': 'Altura do pulo.', 'OB.SX': 'Posição da pessoa na tela.',
  'OB_TIPO.*.h': 'Altura do obstáculo (precisa pular mais alto que isso).', 'OB_TIPO.*.w': 'Largura do obstáculo.',
  'FR.G': 'Gravidade do frisbee.', 'FR.KL': 'Sustentação: quanto o frisbee plana. Maior = voa mais longe.', 'FR.KD': 'Arrasto: quanto o ar freia o frisbee.', 'FR.VMIN': 'Força do lançamento mais fraco.', 'FR.VMAX': 'Força do lançamento mais forte.',
  'FR.CHG': 'Tempo segurando até a força máxima (segundos).', 'FR.X0': 'De onde o frisbee sai.', 'FR.AMIN': 'Ângulo mais baixo de mira.', 'FR.AMAX': 'Ângulo mais alto de mira.', 'FR.AV': 'Velocidade da mira subindo e descendo.', 'FR.CATCH': 'Distância para o alvo/pessoa pegar o frisbee.',
  'AR.G': 'Gravidade da flecha.', 'AR.VMIN': 'Força da flecha mais fraca.', 'AR.VMAX': 'Força da flecha mais forte.', 'AR.DRAW': 'Tempo puxando o arco até a força máxima.', 'AR.X0': 'De onde a flecha sai.', 'AR.AMIN': 'Ângulo mais baixo de mira.', 'AR.AMAX': 'Ângulo mais alto de mira.',
  'DU.G': 'Gravidade.', 'DU.JV': 'Força do pulo.', 'DU.SPD': 'Velocidade de andar.', 'DU.DSPD': 'Velocidade do pique.', 'DU.DT': 'Duração do pique (segundos).', 'DU.DCD': 'Espera para dar outro pique.',
  'DU.RATE': 'Intervalo entre tiros de água (segundos). Menor = atira mais rápido.', 'DU.GOTA': 'Tamanho da gota.', 'DU.WETG': 'Quanto molhado alguém aguenta.', 'DU.STUN': 'Tempo atordoado depois de encharcar.', 'DU.REF': 'Água no reservatório (quantos tiros cabem).', 'DU.DRY': 'Velocidade que seca.',
  'CN.YT': 'Margem de cima do rio.', 'CN.YB': 'Margem de baixo do rio.', 'CN.FLOW': 'Força da correnteza.', 'CN.DRAG': 'Freio da água na canoa.', 'CN.VMAX': 'Velocidade máxima da canoa.', 'CN.CAMX': 'Posição da canoa na tela.', 'CN.PXM': 'Pixels por metro.',
  'FU.G': 'Gravidade das pessoas.', 'FU.BG': 'Gravidade da bola.', 'FU.JV': 'Força do pulo.', 'FU.SPD': 'Velocidade de correr.', 'FU.R': 'Tamanho da bola.', 'FU.GH': 'Altura do gol.', 'FU.GW': 'Largura (fundo) do gol.',
  'FU.KICK': 'Força do chute normal.', 'FU.KMAX': 'Força do chute carregado.', 'FU.REACH': 'Alcance do pé (distância para chutar).', 'FU.BOUNCE': 'Quanto a bola quica (0 a 1).',
  'NT.PXM': 'Pixels por metro.', 'NT.LEN': 'Comprimento da piscina/raia (metros).', 'NT.VMAX': 'Velocidade máxima nadando.', 'NT.GLIDE': 'Quanto a pessoa desliza entre as braçadas.',
  'NT.PERF': 'Janela da braçada perfeita (segundos). Maior = mais fácil.', 'NT.GOOD': 'Janela da braçada boa (segundos).', 'NT.AIR': 'Tempo no ar no mergulho da saída.', 'NT.BREATH': 'Braçadas entre uma respiração e outra.',
  'JS.WW': 'Largura do mar (mundo).', 'JS.WH': 'Altura do mar (mundo).', 'JS.CX': 'Centro da ilha (x).', 'JS.CY': 'Centro da ilha (y).', 'JS.ISL': 'Tamanho da ilha.', 'JS.VMAX': 'Velocidade máxima do jet ski.',
  'JS.VBOOST': 'Velocidade no turbo.', 'JS.ACC': 'Aceleração.', 'JS.LAPS': 'Voltas da corrida.', 'JS.CP': 'Distância da boia que conta como contornar.', 'JS_MAN.*.v': 'Pontos da manobra.', 'JS_MAN.*.d': 'Tempo que a manobra leva no ar (segundos).',
  'DIVE.vx': 'Velocidade do peixinho (mergulho).', 'DIVE.vy': 'Pulinho do peixinho (negativo = para cima).', 'DIVE.fric': 'Atrito da areia no mergulho. Maior = para mais rápido.', 'DIVE.rest': 'Tempo deitado antes de levantar.',
  'SERVE.v0': 'Força do saque mais fraco.', 'SERVE.v1': 'Força do saque mais forte.', 'SERVE.max': 'Tempo segurando até a força máxima.', 'SERVE.back': 'Quanto o personagem recua para sacar.',
  'SPEC.v': 'Força do golpe especial.', 'SPEC.min': 'Ângulo mais alto do especial.', 'SPEC.max': 'Ângulo mais baixo do especial.', 'SPEC.maxT': 'Tempo máximo mirando o especial.', 'SPEC.reach': 'Alcance da mão no especial.',
  'SPK.T': 'Duração do giro do braço na cortada.', 'SPK.L': 'Comprimento do braço.', 'SPK.sx': 'Posição do ombro (x).', 'SPK.sy': 'Posição do ombro (y).', 'SPK.e': 'Quanto da força do braço passa para a bola.', 'SPK.grip': 'Quanto a mão "segura" e direciona a bola.',
  'SPK.vmax': 'Força máxima da cortada.', 'SPK.ph0': 'Ângulo em que o braço começa o giro.', 'SPK.hand': 'Tamanho da mão (área que acerta).', 'SPK.chMax': 'Tempo segurando o botão para a cortada mais forte.', 'SPK.Lmin': 'Braço mais curto.', 'SPK.Lmax': 'Braço mais esticado.',
  'SPK_F.x': 'Ponto ideal da bola para a cortada perfeita (à frente).', 'SPK_F.y': 'Ponto ideal da bola para a cortada perfeita (altura).',
  'SPKG.T': 'Duração do golpe de baixo para cima.', 'SPKG.L': 'Comprimento do braço.', 'SPKG.sx': 'Posição do ombro (x).', 'SPKG.sy': 'Posição do ombro (y).', 'SPKG.ph0': 'Ângulo em que o braço começa.', 'SPKG.vmax': 'Força máxima.', 'SPKG.hand': 'Tamanho da mão.', 'SPKG.Lmin': 'Braço mais curto.', 'SPKG.Lmax': 'Braço mais esticado.',
  'OPP.*.lvl': 'Dificuldade deste adversário: 0 = bem fácil; quanto maior, menos ele erra e mais rápido reage. O máximo é impossível: ele não erra nenhuma bola.', 'OPP.*.pts': 'Pontos para vencer a partida contra este adversário.',
  'BG.padW': 'Metade da largura da esteira de turbo. Maior = esteira mais larga.', 'BG.kr': 'Tamanho do corpo do bugue nas batidas entre bugues.', 'BG.kf': 'Distância do centro do bugue até a frente e a traseira nas batidas.',
  'BG.boxR': 'Tamanho da caixa de item para pegar. Maior = mais fácil pegar.', 'BG.boxT': 'Segundos até a caixa reaparecer depois de pega.', 'BG.voltas': 'Quantas voltas tem cada corrida.',
  'BG.hw': 'Metade da largura da pista. Maior = pista mais larga (muda o desenho também).', 'BG.r': 'Tamanho do bugue na batida com a mureta.', 'BG.vmax': 'Velocidade máxima dos bugues.', 'BG.eng': 'Força do motor (aceleração).',
  'BG.brake': 'Força do freio.', 'BG.grip': 'Aderência nas curvas. Maior = escorrega menos.', 'BG.gripD': 'Aderência derrapando. Menor = derrapa mais.', 'BG.wb': 'Distância entre os eixos. Maior = curva mais aberta.',
  'BG.water': 'Quanto a água freia o bugue (atalho da lagoa).', 'BG.boostV': 'Velocidade a mais no turbo.', 'BG.sw': 'Metade da largura dos atalhos.', 'BG.Z': 'Zoom da câmera. Menor = vê mais longe.', 'BG.g': 'Gravidade nos saltos. Maior = voos mais curtos.',
  'BC.x0': 'Lado esquerdo da cancha (o desenho da vila acompanha).', 'BC.x1': 'Lado direito da cancha.', 'BC.y0': 'Lado de cima da cancha.', 'BC.y1': 'Lado de baixo da cancha.', 'BC.sx': 'De onde as bolas saem (x).', 'BC.sy': 'De onde as bolas saem (y).',
  'BC.rb': 'Tamanho das bolas.', 'BC.rj': 'Tamanho do bolim.', 'BC.fc': 'Atrito da areia. Maior = as bolas param antes.', 'BC.fv': 'Atrito que aumenta com a velocidade (bola rápida freia mais).',
  'BC.G': 'Força dos montinhos e buracos sobre a bola. Maior = desviam mais.', 'BC.meter': 'Escala usada na medida da distância.', 'BC.L': 'Comprimento útil da cancha (calculado sozinho).',
};
function wzExpl(path) {
  if (path.startsWith('ev:')) { const k = path.split('.').slice(1).join('.'); return WZ_EXPL['ev.' + k] || ''; }
  const p = path.split('.'), o = p[0];
  return WZ_EXPL[path] || (p.length === 2 && WZ_EXPL[`${o}.*`]) || WZ_EXPL[`${o}.*.${p[p.length - 1]}`] || WZ_EXPL[`${o}.*.${p.slice(2).join('.')}`] || '';
}
const WZ_EVF = { dur: 'Duração (segundos; 0 = por tentativas)', 'med.0': 'Pontos para o bronze', 'med.1': 'Pontos para a prata', 'med.2': 'Pontos para o ouro', ia: 'Pontos do IAmiguinho (rival)' };
// conjuntos de desenhos pintados com rosto (o mesmo desenho do jogo, chamado pela função do próprio jogo)
const WZ_SETS = [
  { id: 'ia', nome: 'IAmiguinho (vôlei e geral)', atl: () => window.MV5, fn: (an, k, ex) => window.__fr.ia(an, k, 'g', ex, false), esc: () => 56 / 325 / (window.MV5 ? window.MV5.q : .5) },
  { id: 'bl', nome: 'Amiguinho (vôlei e bocha)', atl: () => window.MVB, fn: (an, k, ex) => window.__fr.bl(an, k, 'g', ex, false), esc: () => 34.8 / 152 },
  { id: 'sk', nome: 'IAmiguinho no skate', atl: () => window.MVSK, fn: (an, k, ex) => window.__fr.sk(an, k, ex, false), esc: () => 50.5 / 177 },
  { id: 'eb', nome: 'IAmiguinho na embaixadinha', atl: () => window.MVEB, fn: (an, k, ex) => window.__fr.eb(an, k, ex, false), esc: () => (window.MVEB ? 52 / window.MVEB.a.espera.f[0].ay : 1) },
  { id: 'bc', nome: 'IAmiguinho na bocha', atl: () => window.MVBC, fn: (an, k, ex) => window.__fr.bc(an, k, ex, false), esc: () => 56 / 325 / (window.MVBC ? window.MVBC.q : .5) },
];
const WZ_PISTA_CAMPOS = ['name', 'fala', 'pts', 'sc', 'ramps', 'boxes', 'pads', 'fofa', 'slopes', 'farol'];

// as peças da pista apontam para pedacinhos da linha (24 por ponto): ficam sempre dentro da pista
function wzPistaOk(T) {
  const n = T.pts.length * 24, w = (i) => ((Math.round(i) % n) + n) % n;
  T.boxes = T.boxes.map(w); T.ramps = T.ramps.map(w); T.fofa = T.fofa.map(w); T.pads.forEach((p) => { p.i = w(p.i); });
  for (const c of [...T.sc, ...T.slopes]) { c.a = w(c.a); c.b = Math.min(n - 1, Math.max(c.a + 2, Math.round(c.b))); }
}
const WZ = (() => {
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  // ---------- caminhos ("BG.vmax", "ev:bugue.med.1", "fala:intro.bugue", "pista:0.pts", "rosto:ia.idle.3")
  const ORIG = new Map();
  function rootOf(path) {
    const i = path.indexOf(':'); if (i > 0) { const kind = path.slice(0, i), rest = path.slice(i + 1); return { kind, rest }; }
    return { kind: 'obj', rest: path };
  }
  function getSet(path, val, write) {
    const { kind, rest } = rootOf(path), parts = rest.split('.');
    let o;
    if (kind === 'obj') o = WZ_OBJS[parts.shift()];
    else if (kind === 'ev') { const id = parts.shift(); o = EVENTS.find((e) => e.id === id); }
    else if (kind === 'fala') o = FALA;
    else if (kind === 'pista') o = BG_TRACKS[+parts.shift()];
    if (!o) return undefined;
    for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]]; if (o == null) return undefined; }
    const k = parts[parts.length - 1];
    if (!write) return o[k];
    if (!ORIG.has(path)) ORIG.set(path, clone(o[k]));
    o[k] = clone(val); return true;
  }
  const get = (p) => getSet(p, null, false);
  // rostos e encaixes: mexem nas medidas de cada quadro (e no quadro do meio que vem depois dele)
  const RORIG = new Map();
  function metas(set, an, k) {
    const S = WZ_SETS.find((s) => s.id === set), A = S && S.atl() && S.atl().a[an]; if (!A || !A.f[k]) return [];
    return [A.f[k], A.m && A.m[k]].filter(Boolean);
  }
  function applyRosto(set, an, k, o) {
    const ms = metas(set, an, k);
    for (const f of ms) {
      if (!RORIG.has(f)) RORIG.set(f, { s: f.s ? f.s.slice() : null, r: f.r, ax: f.ax, ay: f.ay });
      const g = RORIG.get(f);
      if (g.s && f.s) { const cx = g.s[4] ?? (g.s[0] + g.s[2]) / 2, cy = g.s[5] ?? (g.s[1] + g.s[3]) / 2; f.s[4] = cx + (o.fx || 0); f.s[5] = cy + (o.fy || 0);
        const L1 = g.s[6] || (f.sz ? f.sz[0] : 0), L2 = g.s[7] || (f.sz ? f.sz[1] : 0); f.s[6] = L1 * (o.fs || 1); f.s[7] = L2 * (o.fs || 1); }
      f.r = (g.r || 0) + (o.fr || 0) * Math.PI / 180; f.ax = g.ax - (o.ax || 0); f.ay = g.ay - (o.ay || 0);
    }
    return ms.length > 0;
  }
  function restoreAll() {
    for (const [p, v] of ORIG) { const { kind, rest } = rootOf(p); const parts = rest.split('.'); let o = kind === 'obj' ? WZ_OBJS[parts.shift()] : kind === 'ev' ? EVENTS.find((e) => e.id === parts.shift()) : kind === 'fala' ? FALA : BG_TRACKS[+parts.shift()];
      for (let i = 0; i < parts.length - 1 && o; i++) o = o[parts[i]]; if (o) o[parts[parts.length - 1]] = clone(v); }
    ORIG.clear();
    for (const [f, g] of RORIG) { if (g.s && f.s) for (let i = 0; i < g.s.length; i++) f.s[i] = g.s[i]; f.r = g.r; f.ax = g.ax; f.ay = g.ay; }
  }
  // aplica uma configuração inteira (sempre a partir do original)
  function apply(cfg) {
    // cada mudança é aplicada sozinha: uma que der problema não impede as outras (antes, um atalho de pista fora do lugar
    // travava tudo e o rosto só aparecia ao clicar de novo no quadro)
    const tenta = (fn, onde) => { try { fn(); } catch (e) { console.warn('editor: não deu para aplicar', onde, e); } };
    tenta(restoreAll, 'volta ao original'); cfg = cfg || {};
    for (const sec of ['mec', 'textos', 'pistas']) for (const [p, v] of Object.entries(cfg[sec] || {})) tenta(() => getSet(p, v, true), p);
    let nr = 0; for (const [p, o] of Object.entries(cfg.rostos || {})) tenta(() => { const [set, an, k] = p.split('.'); if (applyRosto(set, an, +k, o)) nr++; }, p);
    // contas que dependem dos números
    tenta(() => { BC.L = BC.x1 - BC.sx; }, 'cancha');
    tenta(() => { for (const T of BG_TRACKS) { T.line = null; wzPistaOk(T); } if (typeof BG_T !== 'undefined') { const i = BG_TRACKS.indexOf(BG_T); BG_T = null; bgLoad(Math.max(0, i)); } }, 'pistas');
    return { rostos: nr };
  }
  return { get, apply, clone };
})();
window.WZ = WZ;

// ---------- guardar: banco da página (db); sem ele, só nos testes locais, no navegador
const WZDB = (() => {
  let db = null, user = null, ready = null; const LOCAL = /[?&]wzlocal=1/.test(location.search) || location.hostname === 'localhost';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem('wz_' + k) || 'null'); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('wz_' + k, JSON.stringify(v)); } catch { /* sem espaço */ } };
  function init() {
    if (ready) return ready;
    ready = (async () => {
      // a ponte da página (window.claude) pode chegar depois do jogo começar: espera até 12 s por ela
      for (let i = 0; i < 120 && !(window.claude && window.claude.use); i++) await new Promise((r) => setTimeout(r, 100));
      try { if (window.claude && window.claude.use) { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } } catch { db = null; }
      let owner = LOCAL;
      if (user) { for (const f of ['isOwner', 'canEdit']) { if (owner) break; try { owner = !!(await user[f]()); } catch { /* */ } } if (!owner) { try { owner = (await user.can('data.write')) === true; } catch { /* */ } } }
      WZDB.info = { ponte: !!(window.claude && window.claude.use), db: !!db, user: !!user, owner, s: ((performance.now()) / 1000).toFixed(1) };
      return { db: !!db, owner, local: LOCAL };
    })();
    return ready;
  }
  // o banco não aceita bem nomes com ponto nem listas dentro de listas (as pistas): a configuração vai guardada como texto
  const pack = (v) => { const o = { at: v.at || Date.now(), nome: v.nome || '' }; if (v.cfg !== undefined) o.json = JSON.stringify(v.cfg); return o; };
  const unpack = (d) => { if (!d) return null; const o = { ...d }; if (typeof d.json === 'string') { try { o.cfg = JSON.parse(d.json); } catch { o.cfg = null; } delete o.json; } return o; };
  // nenhuma leitura fica esperando para sempre: depois de 8 s desiste
  const limite = (pr, ms = 8000) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('demorou')), ms))]);
  const MEM = {}, LIDO = {}, DIAG = { erros: [] };
  // leitura confirmada pelo banco: a leitura simples podia devolver uma cópia antiga guardada no navegador
  // (de uma visita anterior), e o editor abria com rostos antigos e o jogo aplicava a versão velha.
  // Espera a resposta confirmada (até 8 s); se não vier, usa a cópia que tiver. Entre a cópia e o que foi salvo nesta
  // visita, fica sempre o mais novo.
  const novo = (a, b) => (!a ? b : !b ? a : (b.at || 0) > (a.at || 0) ? b : a);
  function lerConfirmado(k) {
    return new Promise((res) => {
      let ult = null, fim = false, un = null;
      const acaba = (v) => { if (fim) return; fim = true; clearTimeout(t); try { un && un(); } catch { /* */ } res(v); };
      const t = setTimeout(() => acaba(ult), 8000);
      try {
        un = db.doc('wz/' + k).onSnapshot((s) => { const v = s.exists ? unpack(s.data()) : null; ult = { v, cache: !!(s.metadata && s.metadata.fromCache) }; if (!ult.cache) acaba(ult); }, () => acaba(ult));
      } catch { acaba(null); }
    });
  }
  // lê de três jeitos ao mesmo tempo (acompanhando o documento, lendo o documento e lendo a lista toda) e fica com o mais novo
  async function get(k) {
    await init(); const t0 = Date.now();
    if (db) {
      const jeitos = [
        lerConfirmado(k).then((r) => (r && r.v ? { v: r.v, f: r.cache ? 'cópia' : 'acompanhando' } : null)),
        limite(db.doc('wz/' + k).get()).then((s2) => (s2.exists ? { v: unpack(s2.data()), f: s2.metadata && s2.metadata.fromCache ? 'cópia' : 'leitura' } : null)).catch((e) => { DIAG.erros.push(k + ' leitura: ' + (e && (e.code || e.message))); return null; }),
        limite(db.collection('wz').get()).then((q) => { const d = q.docs.find((x) => x.id === k); return d ? { v: unpack(d.data()), f: 'lista' } : null; }).catch((e) => { DIAG.erros.push(k + ' lista: ' + (e && (e.code || e.message))); return null; }),
      ];
      const rs = (await Promise.all(jeitos)).filter((r) => r && r.v);
      let melhor = null; for (const r of rs) if (!melhor || (r.v.at || 0) > (melhor.v.at || 0) || ((r.v.at || 0) === (melhor.v.at || 0) && melhor.f === 'cópia')) melhor = r;
      const v = novo(melhor ? melhor.v : null, MEM[k]); MEM[k] = v;
      LIDO[k] = melhor ? (melhor.f === 'cópia' ? 'cópia do navegador' : 'banco') : 'nada';
      DIAG[k] = { fontes: rs.map((r) => r.f + ' ' + (r.v.at ? new Date(r.v.at).toLocaleTimeString('pt-BR') : '?')).join(', ') || 'nenhuma', quadros: v && v.cfg ? Object.keys(v.cfg.rostos || {}).length : 0, ms: Date.now() - t0 };
      return v;
    }
    return LOCAL ? novo(lsGet(k), MEM[k]) : (MEM[k] ?? null);
  }
  // uma gravação de cada vez por documento, na ordem (uma antiga não chega depois de uma nova)
  const FILA = {};
  async function set(k, v) {
    await init(); v = v && v.cfg !== undefined ? { ...v, cfg: JSON.parse(JSON.stringify(v.cfg)) } : v; MEM[k] = v;
    const vez = (FILA[k] || Promise.resolve()).catch(() => {}).then(() => {
      if (MEM[k] !== v) return; // já veio uma mais nova: ela é que vai ser gravada
      if (db) return limite(db.doc('wz/' + k).set(pack(v)), 15000);
      if (LOCAL) return lsSet(k, v); throw new Error('sem banco');
    });
    FILA[k] = vez; return vez;
  }
  async function del(k) { await init(); if (db) return db.doc('wz/' + k).delete(); if (LOCAL) try { localStorage.removeItem('wz_' + k); } catch { /* */ } }
  async function versions() {
    await init();
    if (db) { try { const q = await limite(db.collection('wz').get()); return q.docs.filter((d) => d.id.startsWith('v')).map((d) => ({ id: d.id, ...unpack(d.data()) })).sort((a, b) => b.at - a.at); } catch { return []; } }
    return LOCAL ? (lsGet('versoes') || []) : [];
  }
  async function addVersion(v) {
    await init(); const id = 'v' + v.at;
    if (db) return limite(db.doc('wz/' + id).set(pack(v)), 15000);
    if (LOCAL) { const L = lsGet('versoes') || []; L.unshift({ id, ...v }); lsSet('versoes', L.slice(0, 30)); }
  }
  return { init, get, set, del, versions, addVersion, LIDO, DIAG };
})();

// ---------- o jogo carrega a configuração aplicada assim que o banco responde
// Se o banco responder com uma prova já em andamento, a mudança fica guardada e entra quando a prova acabar
// (antes ela era perdida até recarregar a página). Enquanto o dono testa o rascunho, vale o rascunho.
let WZ_APLICADO = null, WZ_PEND = false, WZ_TESTE = false;
function wzAplicaSalvo() {
  if (WZ_TESTE || document.getElementById('wz')) { WZDB.DIAG.jogo = { adiado: 'editor aberto ou testando' }; return; }
  if (typeof mode !== 'undefined' && (mode === 'play' || mode === 'pause')) { WZ_PEND = true; return; }
  WZ_PEND = false; try { const r = WZ.apply(WZ_APLICADO); WZDB.DIAG.jogo = { quando: new Date().toLocaleTimeString('pt-BR'), quadros: r ? r.rostos : '?' }; } catch (e) { console.warn('editor: não deu para aplicar', e); WZDB.DIAG.jogo = { erro: String(e) }; }
}
setInterval(() => { if (WZ_PEND) wzAplicaSalvo(); }, 500);
WZDB.init().then(async (st) => {
  const ap = await WZDB.get('aplicado'); if (ap && ap.cfg) { WZ_APLICADO = ap.cfg; wzAplicaSalvo(); }
  if (st.owner) { wzBotao(); return; }
  // a resposta de quem é o dono pode chegar atrasada: confere de novo algumas vezes
  const u = window.claude && window.claude.use ? await window.claude.use('user').catch(() => null) : null; if (!u) return;
  for (const ms of [2000, 5000, 10000, 20000]) { await new Promise((r) => setTimeout(r, ms)); let ok = false; for (const f of ['isOwner', 'canEdit']) { try { ok = ok || !!(await u[f]()); } catch { /* */ } } if (ok) { wzBotao(); return; } }
});

// atalho de reserva: digitar e-d-i-t-o-r no teclado (fora de um campo) abre o editor mesmo sem o botão.
// Quem não é dono pode até abrir, mas o banco não aceita salvar (só o dono escreve); a barra de cima avisa.
{ let buf = ''; addEventListener('keydown', (e) => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || e.key.length !== 1) return; buf = (buf + e.key.toLowerCase()).slice(-6); if (buf === 'editor') { buf = ''; wzBotao(); wzAbrir(); } }); }
// ---------- botão do editor (só para o dono) e a tela do editor
function wzBotao() {
  if (document.getElementById('wz-abrir')) return;
  const b = document.createElement('button'); b.id = 'wz-abrir'; b.type = 'button'; b.textContent = 'Editor';
  b.title = 'Editor do jogo (só você vê)'; b.addEventListener('click', () => wzAbrir()); document.body.appendChild(b);
}
const WZ_CSS = `
#wz-abrir{position:fixed;left:10px;bottom:10px;z-index:9999;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:2px solid #1b1f4f;background:#fff6d6;color:#1b1f4f;cursor:pointer}
#wz{position:fixed;inset:0;z-index:10000;background:#f4efe4;color:#1b1f4f;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;grid-template-rows:auto auto 1fr;}
#wz *{box-sizing:border-box}
#wz header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;background:#1b1f4f;color:#fff6d6}
#wz header h1{font-size:15px;margin:0 10px 0 0;font-weight:700;letter-spacing:.02em}
#wz #wz-diag{font-size:11px;padding:3px 12px;background:#e9e0c8;color:#3a3a52;border-bottom:1px solid #cfc3a5}
#wz .lin .rot{display:inline-block;margin-left:6px;font-size:11px;padding:1px 6px;border-radius:9px;background:#1b1f4f;color:#fff6d6}
#wz header .st{font-size:12px;opacity:.85;margin-right:auto}
#wz button{font:inherit;font-weight:600;font-size:13px;padding:6px 11px;border-radius:7px;border:1.5px solid #1b1f4f;background:#fffaf0;color:#1b1f4f;cursor:pointer}
#wz button.pri{background:#ffd166}
#wz button.dang{background:#ffe1e1}
#wz header button{border-color:#fff6d6}
#wz button:disabled{opacity:.45;cursor:default}
#wz .corpo{display:grid;grid-template-columns:190px 1fr;min-height:0}
#wz nav{background:#e9e1cf;padding:8px;display:flex;flex-direction:column;gap:4px;overflow:auto;border-right:1.5px solid #d2c6ad}
#wz nav button{text-align:left;border-color:transparent;background:transparent}
#wz nav button.on{background:#fffaf0;border-color:#1b1f4f}
#wz main{overflow:auto;padding:14px 16px;min-width:0}
#wz h2{font-size:16px;margin:4px 0 10px}
#wz h3{font-size:14px;margin:14px 0 6px}
#wz .ajuda{font-size:12.5px;color:#4a4f72;margin:0 0 10px;max-width:760px}
#wz .lin{display:grid;grid-template-columns:minmax(150px,280px) 1fr 92px 28px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #e3d9c3}
#wz .lin.mud{background:#fff3c4}
#wz .lin .q{display:inline-grid;place-items:center;width:16px;height:16px;margin-left:6px;border-radius:50%;background:#1b1f4f;color:#fff6d6;font-size:11px;font-weight:700;cursor:help;vertical-align:1px}
#wz .lin small{display:block;color:#6b6f8f;font-size:11px}
#wz input[type=number],#wz input[type=text],#wz select,#wz textarea{font:inherit;padding:5px 7px;border:1.5px solid #b9ad94;border-radius:6px;background:#fff;color:#1b1f4f;width:100%}
#wz textarea{min-height:64px;resize:vertical}
#wz input[type=range]{width:100%;accent-color:#e8484a}
#wz .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
#wz .chips button.on{background:#1b1f4f;color:#fff6d6}
#wz .pista{display:grid;grid-template-columns:1fr 250px;gap:12px;height:calc(100vh - 130px);min-height:360px}
#wz canvas.pc{width:100%;height:100%;background:#efe6cf;border:1.5px solid #b9ad94;border-radius:8px;touch-action:none}
#wz .lado{overflow:auto;display:flex;flex-direction:column;gap:6px}
#wz .rost{display:grid;grid-template-columns:minmax(260px,1fr) 300px;gap:12px}
#wz canvas.rc{width:100%;max-width:560px;aspect-ratio:1;background:#cfe8ee;border:1.5px solid #b9ad94;border-radius:8px;touch-action:none}
#wz .tira{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}
#wz .tira button{min-width:34px}
#wz .tira button.on{background:#1b1f4f;color:#fff6d6}
#wz .ver{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #e3d9c3}
#wz .aviso{background:#fff3c4;border:1.5px solid #e2c56a;border-radius:8px;padding:8px 10px;font-size:13px;margin:0 0 10px;max-width:760px}
@media (max-width:760px){#wz .corpo{grid-template-columns:1fr}#wz nav{flex-direction:row;flex-wrap:wrap;border-right:0}#wz .pista,#wz .rost{grid-template-columns:1fr}#wz .lin{grid-template-columns:1fr 1fr 70px 28px}}
`;
const WZE = { cfg: { mec: {}, pistas: {}, rostos: {}, textos: {} }, aba: 'mec', ev: 'bugue', salvo: true, hist: [], aplicadoEm: 0 };
let wzTimer = 0;
async function wzSalva() {
  clearTimeout(wzTimer); wzTimer = 0; if (WZE.salvo) return;
  try { await WZDB.set('rascunho', { cfg: WZE.cfg, at: Date.now() }); WZE.salvo = true; wzStatus('Rascunho salvo'); } catch (e) { wzStatus('Não deu para salvar o rascunho agora (' + (e && (e.code || e.message)) + ')'); }
}
function wzMudou() {
  WZE.salvo = false; wzStatus('Salvando rascunho…'); clearTimeout(wzTimer);
  wzTimer = setTimeout(wzSalva, 800);
}
// fechar a página logo depois de mexer não perde a última mudança
addEventListener('pagehide', () => { if (!WZE.salvo) wzSalva(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !WZE.salvo) wzSalva(); });
function wzStatus(t) { const e = document.getElementById('wz-st'); if (e) e.textContent = t; }
const el = (tag, at = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(at)) { if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f); else if (k === 'class') e.className = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };

// linha de conferência (embaixo do título do editor): de onde veio o que está no jogo e no editor
const WZ_BUILD = '__BUILD__';
function wzDiag() {
  const D = WZDB.DIAG || {}, i = WZDB.info || {}, a = D.aplicado, r = D.rascunho, j = D.jogo;
  const nq = (o) => (o && o.cfg ? Object.keys(o.cfg.rostos || {}).length : 0);
  return [`página de ${WZ_BUILD}`, `banco ${i.db ? 'ok' : 'não'} · dono ${i.owner ? 'sim' : 'não'}`,
    `aplicado: ${a ? `${a.quadros} quadros (${a.fontes}, ${a.ms} ms)` : 'não lido'}`,
    `no jogo: ${j ? (j.quadros != null ? `${j.quadros} quadros às ${j.quando}` : j.adiado || j.erro) : 'ainda nada'}`,
    `rascunho: ${r ? `${r.quadros} quadros (${r.fontes})` : 'não lido'}`, `editor com ${nq({ cfg: WZE.cfg })} quadros`,
    D.erros && D.erros.length ? 'erros: ' + D.erros.slice(-3).join('; ') : ''].filter(Boolean).join(' | ');
}
setInterval(() => { const e = document.getElementById('wz-diag'); if (e) e.textContent = wzDiag(); }, 1000);
let wzAbrindo = false;
async function wzAbrir() {
  if (document.getElementById('wz')) return; if (wzAbrindo) return; wzAbrindo = true;
  try {
  if (!document.getElementById('wz-css')) document.head.append(el('style', { id: 'wz-css', textContent: WZ_CSS }));
  try { if (mode === 'play' && typeof pause === 'function') pause(); } catch { /* */ }
  let r = null, ap = null;
  try { [r, ap] = await Promise.all([WZDB.get('rascunho'), WZDB.get('aplicado')]); } catch { /* abre com o que tiver */ }
  // abre com o mais novo: o rascunho, ou o aplicado se ele for mais recente; com mudança ainda não salva nesta visita, fica ela
  const base = (r && r.cfg && ap && ap.cfg) ? (ap.at > r.at ? ap : r) : (r && r.cfg ? r : ap && ap.cfg ? ap : null);
  if (WZE.salvo) WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, WZ.clone(base && base.cfg) || WZ.clone(WZE.cfg) || {});
  WZE.lido = WZDB.LIDO ? (WZDB.LIDO.rascunho || '') : '';
  WZE.aplicadoEm = ap ? ap.at : WZE.aplicadoEm || 0;
  try { WZ.apply(WZE.cfg); } catch (e) { console.warn('editor: configuração com problema', e); } // o editor mostra o rascunho
  const box = el('div', { id: 'wz' },
    el('header', {}, el('h1', {}, 'Editor dos Jogos de Verão'), el('span', { class: 'st', id: 'wz-st' }, (WZE.lido === 'cópia do navegador' || WZE.lido === 'nada' ? 'O banco não respondeu: abri a última cópia guardada. ' : '') + (WZE.aplicadoEm ? `Aplicado pela última vez em ${new Date(WZE.aplicadoEm).toLocaleString('pt-BR')}` : 'Nada aplicado ainda')),
      el('button', { type: 'button', on: { click: wzTestar } }, 'Testar'),
      el('button', { type: 'button', class: 'pri', on: { click: wzAplicar } }, 'Aplicar no jogo'),
      el('button', { type: 'button', on: { click: wzFechar } }, 'Fechar')),
    el('div', { id: 'wz-diag' }, wzDiag()),
    el('div', { class: 'corpo' },
      el('nav', {}, ...[['mec', 'Mecânicas'], ['pistas', 'Pistas do bugue'], ['cancha', 'Cancha da bocha'], ['rostos', 'Rostos e quadros'], ['textos', 'Textos e falas'], ['versoes', 'Versões e cópia']].map(([k, t]) =>
        el('button', { type: 'button', class: WZE.aba === k ? 'on' : '', on: { click: () => { WZE.aba = k; wzRender(); } } }, t))),
      el('main', { id: 'wz-main' })));
  // as teclas digitadas no editor não chegam no jogo (Espaço, setas, Enter)
  for (const t of ['keydown', 'keyup']) box.addEventListener(t, (e) => e.stopPropagation());
  WZDB.init().then((st) => { if (!st.owner && !st.local) { const i = WZDB.info || {}; wzStatus(`Atenção: não reconheci você como dono desta página (ponte ${i.ponte ? 'ok' : 'não'}, banco ${i.db ? 'ok' : 'não'}, usuário ${i.user ? 'ok' : 'não'}). Talvez não dê para salvar.`); } });
  document.body.append(box); try { wzRender(); } catch (e) { wzStatus('Esta aba teve um problema; escolha outra.'); console.warn(e); }
  } finally { wzAbrindo = false; }
}
function wzFechar() { if (!WZE.salvo) wzSalva(); const b = document.getElementById('wz'); if (b) b.remove(); clearInterval(WZE.anim); WZ_TESTE = false; WZ_PEND = false; try { WZ.apply(WZ_APLICADO); } catch (e) { console.warn(e); } }
function wzTestar() {
  // joga com o rascunho (só aqui; o jogo dos outros continua com o aplicado). Ao voltar ao menu, abre o editor de novo pelo botão.
  const ev = EVENTS.find((e) => e.id === WZE.ev) || EVENTS[0]; const b = document.getElementById('wz'); if (b) b.remove(); clearInterval(WZE.anim);
  WZ_TESTE = true; WZ.apply(WZE.cfg); if (ev === bugue && WZE.pista != null) bugue.trackSel = WZE.pista;
  choose(ev); showOv(true); wzAviso('Testando o rascunho. Para voltar a editar, toque em Editor.');
}
function wzAviso(t) { if (typeof say === 'function') say(t); }
// pergunta dentro do editor (a página do jogo não pode abrir as janelas de pergunta do navegador)
function wzPergunta(texto, campo = false) {
  return new Promise((res) => {
    const inp = campo ? el('input', { type: 'text', placeholder: 'Ex.: pista nova da Lagoa' }) : null;
    const fecha = (v) => { fundo.remove(); res(v); };
    const fundo = el('div', { style: 'position:fixed;inset:0;z-index:10001;background:rgba(27,31,79,.45);display:grid;place-items:center;padding:16px' },
      el('div', { style: 'background:#fffaf0;border:2px solid #1b1f4f;border-radius:10px;padding:16px;max-width:420px;width:100%;display:grid;gap:10px' },
        el('div', {}, texto), inp,
        el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
          el('button', { type: 'button', on: { click: () => fecha(null) } }, 'Cancelar'),
          el('button', { type: 'button', class: 'pri', on: { click: () => fecha(inp ? inp.value.trim() : true) } }, 'Confirmar'))));
    (document.getElementById('wz') || document.body).append(fundo); if (inp) inp.focus();
  });
}
async function wzAplicar() {
  const nome = await wzPergunta('Aplicar o rascunho no jogo de todo mundo? Dê um nome para esta versão (opcional):', true); if (nome === null) return; const at = Date.now();
  try {
    await wzSalva();
    await WZDB.set('aplicado', { cfg: WZE.cfg, at, nome });
    await WZDB.addVersion({ cfg: WZE.cfg, at, nome: nome || '' });
    WZ_APLICADO = WZ.clone(WZE.cfg); WZE.aplicadoEm = at; wzStatus(`Aplicado em ${new Date(at).toLocaleString('pt-BR')}: já vale para quem abrir o jogo`);
  } catch (e) { wzStatus('Não deu para aplicar agora (' + (e && (e.code || e.message)) + '). Tente de novo.'); }
}
function wzRender() {
  const m = document.getElementById('wz-main'); if (!m) return; clearInterval(WZE.anim);
  document.querySelectorAll('#wz nav button').forEach((b, i) => b.classList.toggle('on', ['mec', 'pistas', 'cancha', 'rostos', 'textos', 'versoes'][i] === WZE.aba));
  m.replaceChildren(); try { const r = ({ mec: wzMec, pistas: wzPistas, cancha: wzCancha, rostos: wzRostos, textos: wzTextos, versoes: wzVersoes })[WZE.aba](m); if (r && r.catch) r.catch((e) => { m.append(el('p', { class: 'aviso' }, 'Esta parte teve um problema: ' + e.message)); }); } catch (e) { m.append(el('p', { class: 'aviso' }, 'Esta parte teve um problema: ' + e.message)); console.warn(e); }
}

// ---------- MECÂNICAS
function wzFolhas(o, base, out = [], depth = 0) {
  if (depth > 3 || o == null) return out;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number') out.push({ path: base + '.' + k, key: k });
    else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) v.forEach((x, i) => out.push({ path: `${base}.${k}.${i}`, key: `${k} ${i + 1}` }));
    else if (v && typeof v === 'object' && !Array.isArray(v)) wzFolhas(v, base + '.' + k, out, depth + 1);
  }
  return out;
}
function wzLinha(path, rotulo, sub, sec = 'mec', lim = null) {
  const atual = WZE.cfg[sec][path], orig = WZ.get(path), v0 = WZ.clone(orig);
  // valor original: o que o jogo tem sem a mudança
  const base = atual !== undefined ? (() => { const save = WZE.cfg[sec][path]; return save; })() : orig;
  const origVal = atual !== undefined ? wzOrig(path) : orig;
  const inp = el('input', { type: 'number', step: 'any', value: String(atual ?? orig) });
  const rng = el('input', { type: 'range' }); const span = Math.max(Math.abs(origVal) * 2, 1);
  rng.min = String(Math.min(0, origVal * 3, -span * (origVal < 0 ? 1 : 0))); rng.max = String(Math.max(origVal * 3, span)); rng.step = String(Math.abs(origVal) < 2 ? .01 : Math.abs(origVal) < 50 ? .1 : 1); rng.value = String(atual ?? orig);
  // limite próprio (ex.: dificuldade de 0 até "impossível"), com o nome do valor ao lado
  const nomeV = lim && lim.rot ? el('b', { class: 'rot' }, lim.rot(atual ?? orig)) : null;
  if (lim) { rng.min = String(lim.min); rng.max = String(lim.max); rng.step = String(lim.step); inp.min = String(lim.min); inp.max = String(lim.max); inp.step = String(lim.step); rng.value = String(atual ?? orig); }
  const corta = (v) => (lim ? Math.min(lim.max, Math.max(lim.min, v)) : v);
  const ex = sec === 'mec' ? wzExpl(path) : '';
  const linha = el('div', { class: 'lin' + (atual !== undefined ? ' mud' : ''), title: ex ? `${ex}\nOriginal: ${origVal}` : `Original: ${origVal}` }, el('div', {}, rotulo, ex ? el('span', { class: 'q', 'aria-hidden': 'true' }, '?') : null, sub ? el('small', {}, sub) : null), rng, inp,
    el('button', { type: 'button', title: `Voltar ao original (${origVal})`, on: { click: () => { delete WZE.cfg[sec][path]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, '↺'));
  const set = (v) => { if (!isFinite(v)) return; v = corta(v); if (nomeV) nomeV.textContent = lim.rot(v); if (Math.abs(v - origVal) < 1e-12) delete WZE.cfg[sec][path]; else WZE.cfg[sec][path] = v; linha.classList.toggle('mud', WZE.cfg[sec][path] !== undefined); WZ.apply(WZE.cfg); wzMudou(); };
  rng.addEventListener('input', () => { inp.value = rng.value; set(+rng.value); });
  inp.addEventListener('change', () => { if (lim && isFinite(+inp.value)) inp.value = String(corta(+inp.value)); rng.value = inp.value; set(+inp.value); });
  if (nomeV) linha.firstChild.append(nomeV);
  void base; void v0; return linha;
}
// o valor original de um caminho (antes de qualquer mudança)
function wzOrig(path) { const save = WZ.clone(WZE.cfg); const c = WZ.clone(WZE.cfg); for (const s of ['mec', 'textos', 'pistas']) delete c[s][path]; WZ.apply(c); const v = WZ.get(path); WZ.apply(save); return v; }
// dificuldade dos adversários do vôlei: de 0 (bem fácil) até o máximo, que é "impossível" (o Amiguinho não erra)
const WZ_DIF = { min: 0, max: VOLEI_IMP, step: .01, rot: (v) => (v >= VOLEI_IMP - 1e-9 ? 'IMPOSSÍVEL' : v < .2 ? 'fácil' : v < .5 ? 'médio' : v < .8 ? 'difícil' : v < 1 ? 'muito difícil' : 'extremo') };
function wzDificuldade(m) {
  m.append(el('h3', {}, 'Dificuldade dos adversários'),
    el('p', { class: 'ajuda' }, `De 0 (bem fácil) até ${String(VOLEI_IMP).replace('.', ',')} (impossível). No máximo o Amiguinho não erra nenhuma bola e não dá para ganhar dele. Os nomes ao lado: fácil, médio, difícil, muito difícil, extremo, impossível. Na Copa, cada seleção ainda varia um pouquinho em volta do número da fase (menos no impossível).`));
  m.append(el('h3', {}, 'Torneio e partida rápida'));
  m.append(wzLinha('OPP.rapida.lvl', 'Partida rápida', OPP.rapida.name, 'mec', WZ_DIF));
  TOUR.forEach((k, i) => m.append(wzLinha(`OPP.${k}.lvl`, `Torneio, fase ${i + 1}`, OPP[k].name, 'mec', WZ_DIF)));
  m.append(el('h3', {}, 'Copa do Mundo'));
  const FASE = { g0: 'Grupo, 1º jogo', g1: 'Grupo, 2º jogo', g2: 'Grupo, 3º jogo', oitavas: 'Oitavas de final', quartas: 'Quartas de final', semi: 'Semifinal', final: 'Final' };
  for (const k of Object.keys(COPA_LVL)) m.append(wzLinha(`COPA_LVL.${k}`, FASE[k] || k, '', 'mec', WZ_DIF));
}
function wzMec(m) {
  m.append(el('h2', {}, 'Mecânicas'), el('p', { class: 'ajuda' }, 'Escolha a prova e mude os números. A linha fica amarela quando está diferente do original; o ↺ volta ao original. Pare o mouse em cima de uma linha (ou do ?) para ver o que aquele número faz. Use "Testar" lá em cima para jogar a prova com as mudanças. Os nomes técnicos aparecem quando o número ainda não tem nome em português.'));
  m.append(el('div', { class: 'chips' }, ...EVENTS.map((e) => el('button', { type: 'button', class: WZE.ev === e.id ? 'on' : '', on: { click: () => { WZE.ev = e.id; wzRender(); } } }, e.name))));
  const ev = EVENTS.find((e) => e.id === WZE.ev) || EVENTS[0];
  m.append(el('h3', {}, 'Partida e medalhas'));
  for (const k of ['dur', 'med.0', 'med.1', 'med.2']) if (WZ.get(`ev:${ev.id}.${k}`) !== undefined && typeof WZ.get(`ev:${ev.id}.${k}`) === 'number') m.append(wzLinha(`ev:${ev.id}.${k}`, WZ_EVF[k]));
  if (ev.id === 'volei') wzDificuldade(m);
  for (const nm of WZ_REG[ev.id] || []) {
    const o = WZ_OBJS[nm]; if (!o) continue; const folhas = wzFolhas(o, nm).filter((f) => !(nm === 'OPP' && /\.lvl$/.test(f.path))); if (!folhas.length) continue;
    m.append(el('h3', {}, nm === 'BG' ? 'Corrida' : nm === 'BC' ? 'Cancha e física' : `Ajustes (${nm})`));
    for (const f of folhas) { const k0 = f.path.split('.').pop(), desc = (WZ_DESC[nm] || {})[k0]; m.append(wzLinha(f.path, desc || WZ_NOMES[k0] || f.key, desc ? f.path.replace(nm + '.', '') : WZ_NOMES[k0] ? f.path : 'nome técnico: ' + f.path)); }
  }
  if (!(WZ_REG[ev.id] || []).length) m.append(el('p', { class: 'ajuda' }, 'Esta prova ainda não tem números separados para editar aqui (só a partida e as medalhas).'));
}

// ---------- PISTAS DO BUGUE
function wzPistas(m) {
  const ti = WZE.pista ?? 0; WZE.pista = ti; WZE.ev = 'bugue';
  const P = () => { const k = `pista:${ti}.`; const T = BG_TRACKS[ti]; const o = {}; for (const c of WZ_PISTA_CAMPOS) o[c] = WZE.cfg.pistas[k + c] !== undefined ? WZ.clone(WZE.cfg.pistas[k + c]) : WZ.clone(T[c]); return o; };
  let D = P(); const line = () => bgLine(D.pts);
  let L = line();
  const MODOS = [['pts', 'Pontos da pista'], ['boxes', 'Caixas'], ['ramps', 'Rampas'], ['pads', 'Esteiras'], ['fofa', 'Areia fofa'], ['sc', 'Atalhos'], ['slopes', 'Ladeiras'], ['farol', 'Farol']];
  WZE.pmodo = WZE.pmodo || 'pts';
  const salvar = () => { for (const c of WZ_PISTA_CAMPOS) { const k = `pista:${ti}.${c}`; WZE.cfg.pistas[k] = WZ.clone(D[c]); } WZ.apply(WZE.cfg); wzMudou(); };
  const desfazer = () => { const h = WZE.hist.pop(); if (h) { D = h; L = line(); salvar(); desenha(); } };
  const marca = () => { WZE.hist.push(WZ.clone(D)); if (WZE.hist.length > 60) WZE.hist.shift(); };
  m.append(el('h2', {}, 'Pistas do bugue'),
    el('p', { class: 'ajuda' }, 'Escolha a pista e o que quer mexer. Arraste para mover. Clique na pista para pôr uma peça nova; clique numa peça com a tecla Shift (ou o botão "Apagar selecionada") para tirar. Pontos da pista: duplo clique na pista põe um ponto novo ali. Arraste o fundo para andar e use a rodinha do mouse (ou os botões) para aproximar.'),
    el('div', { class: 'chips' }, ...BG_TRACKS.map((T, i) => el('button', { type: 'button', class: i === ti ? 'on' : '', on: { click: () => { WZE.pista = i; WZE.hist = []; wzRender(); } } }, T.name))));
  const cv = el('canvas', { class: 'pc' }), g = cv.getContext('2d');
  const info = el('div', { class: 'ajuda' });
  const lado = el('div', { class: 'lado' },
    el('div', { class: 'chips' }, ...MODOS.map(([k, t]) => el('button', { type: 'button', class: WZE.pmodo === k ? 'on' : '', on: { click: (e) => { WZE.pmodo = k; WZE.sel = null; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); desenha(); } } }, t))),
    info,
    el('button', { type: 'button', on: { click: () => apagaSel() } }, 'Apagar selecionada'),
    el('button', { type: 'button', on: { click: desfazer } }, 'Desfazer'),
    el('button', { type: 'button', on: { click: () => { zoom *= 1.25; desenha(); } } }, 'Aproximar'),
    el('button', { type: 'button', on: { click: () => { zoom /= 1.25; desenha(); } } }, 'Afastar'),
    el('button', { type: 'button', on: { click: () => { enquadra(); desenha(); } } }, 'Ver a pista inteira'),
    el('h3', {}, 'Nome e fala'),
    (() => { const i = el('input', { type: 'text', value: D.name }); i.addEventListener('change', () => { marca(); D.name = i.value; salvar(); }); return i; })(),
    (() => { const i = el('textarea', { value: D.fala }); i.addEventListener('change', () => { marca(); D.fala = i.value; salvar(); }); return i; })(),
    el('button', { type: 'button', class: 'dang', on: { click: async () => { if (!(await wzPergunta('Voltar esta pista ao original?'))) return; for (const c of WZ_PISTA_CAMPOS) delete WZE.cfg.pistas[`pista:${ti}.${c}`]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, 'Voltar a pista ao original'));
  m.append(el('div', { class: 'pista' }, cv, lado));
  let zoom = 1, cx = 0, cy = 0;
  const enquadra = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of L) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; const r = cv.getBoundingClientRect(); zoom = Math.min(r.width / (x1 - x0 + 400), r.height / (y1 - y0 + 400)) || .2; };
  const W2 = () => cv.getBoundingClientRect();
  const toS = (x, y) => { const r = W2(); return [r.width / 2 + (x - cx) * zoom, r.height / 2 + (y - cy) * zoom]; };
  const toW = (sx, sy) => { const r = W2(); return [cx + (sx - r.width / 2) / zoom, cy + (sy - r.height / 2) / zoom]; };
  const near = (x, y) => { let b = 0, bd = 1e18; L.forEach((q, i) => { const d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < bd) { bd = d; b = i; } }); return { i: b, d: Math.sqrt(bd) }; };
  const n = () => L.length;
  const lp = (i) => L[((i % n()) + n()) % n()];
  const ang = (i) => { const p = lp(i), q = lp(i + 2); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  function desenha() {
    const r = W2(), dpr = window.devicePixelRatio || 1; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#efe6cf'; g.fillRect(0, 0, r.width, r.height);
    g.save(); g.translate(r.width / 2, r.height / 2); g.scale(zoom, zoom); g.translate(-cx, -cy);
    const path = () => { g.beginPath(); L.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
    g.lineJoin = 'round'; path(); g.strokeStyle = '#e8484a'; g.lineWidth = BG.hw * 2 + 14; g.stroke(); path(); g.strokeStyle = '#e2c79c'; g.lineWidth = BG.hw * 2; g.stroke();
    path(); g.strokeStyle = 'rgba(27,31,79,.35)'; g.lineWidth = 3 / zoom; g.setLineDash([12 / zoom, 10 / zoom]); g.stroke(); g.setLineDash([]);
    // ladeiras
    for (const z of D.slopes) { g.beginPath(); for (let i = z.a; i <= z.b; i++) { const p = lp(i); i === z.a ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } g.strokeStyle = z.s > 0 ? 'rgba(80,160,255,.45)' : 'rgba(150,80,30,.45)'; g.lineWidth = BG.hw * 1.4; g.stroke(); }
    // atalhos
    for (const c of D.sc) { const A = lp(c.a), B = lp(c.b); g.strokeStyle = c.kind === 'agua' ? 'rgba(47,143,208,.75)' : 'rgba(176,132,78,.75)'; g.lineWidth = BG.sw * 2; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); if (c.ramp) { g.fillStyle = '#7a5233'; const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; g.fillRect(M[0] - 12, M[1] - 12, 24, 24); } }
    const mk = (i, col, s, lab) => { const p = lp(i); g.fillStyle = col; g.strokeStyle = '#1b1f4f'; g.lineWidth = 2 / zoom; g.beginPath(); g.arc(p[0], p[1], s, 0, Math.PI * 2); g.fill(); g.stroke(); if (lab) { g.fillStyle = '#1b1f4f'; g.font = `${14 / zoom}px system-ui`; g.fillText(lab, p[0] + s + 4 / zoom, p[1]); } };
    D.ramps.forEach((i) => { const p = lp(i), a = ang(i); g.save(); g.translate(p[0], p[1]); g.rotate(a); g.fillStyle = '#9b6a3a'; g.fillRect(-12, -BG.hw + 4, 24, BG.hw * 2 - 8); g.restore(); });
    D.boxes.forEach((i) => { const p = lp(i), a = ang(i); for (const j of [-2, -1, 0, 1, 2]) { const x = p[0] - Math.sin(a) * j * 31, y = p[1] + Math.cos(a) * j * 31; g.fillStyle = '#ffd166'; g.fillRect(x - 7, y - 7, 14, 14); } });
    D.pads.forEach((pd) => { const p = lp(pd.i), a = ang(pd.i); g.save(); g.translate(p[0] - Math.sin(a) * pd.o, p[1] + Math.cos(a) * pd.o); g.rotate(a); g.fillStyle = '#2d3350'; g.fillRect(-17, -BG.padW, 34, BG.padW * 2); g.restore(); });
    D.fofa.forEach((i) => mk(i, 'rgba(176,132,78,.9)', 26));
    if (D.farol) { g.fillStyle = '#e8484a'; g.beginPath(); g.arc(D.farol[0], D.farol[1], 44, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(D.farol[0], D.farol[1], 22, 0, Math.PI * 2); g.fill(); }
    mk(0, '#ffffff', 16, 'largada');
    // pontos de controle
    if (WZE.pmodo === 'pts') D.pts.forEach((q, i) => { g.fillStyle = WZE.sel === i ? '#ffd166' : '#ffffff'; g.strokeStyle = '#1b1f4f'; g.lineWidth = 3 / zoom; g.beginPath(); g.arc(q[0], q[1], 9 / zoom + 6, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#1b1f4f'; g.font = `bold ${12 / zoom}px system-ui`; g.fillText(String(i + 1), q[0] - 4 / zoom, q[1] + 4 / zoom); });
    // seleção
    const s = WZE.sel; if (s != null && WZE.pmodo !== 'pts') { const pos = selPos(s); if (pos) { g.strokeStyle = '#ff2d55'; g.lineWidth = 4 / zoom; g.beginPath(); g.arc(pos[0], pos[1], 30, 0, Math.PI * 2); g.stroke(); } }
    g.restore();
    info.textContent = { pts: `Pontos da pista: ${D.pts.length}. Arraste os pontos; duplo clique na pista põe um novo; com a pista mudando, as peças acompanham.`, boxes: `Caixas: ${D.boxes.length} fileiras (5 caixas cada). Clique na pista para pôr.`, ramps: `Rampas: ${D.ramps.length}.`, pads: `Esteiras: ${D.pads.length}. Arraste para os lados para mudar a faixa.`, fofa: `Areia fofa: ${D.fofa.length} (fica por dentro da curva).`, sc: `Atalhos: ${D.sc.length}. Clique na pista na entrada e depois na saída. Selecionado: botões abaixo trocam água/areia e a rampa.`, slopes: `Ladeiras: ${D.slopes.length}. Clique no começo e no fim. Azul desce (embala), marrom sobe (segura).`, farol: D.farol ? 'Arraste o farol.' : 'Esta pista não tem farol. Clique para pôr um.' }[WZE.pmodo];
    extras();
  }
  // botões extras do modo (atalho e ladeira selecionados)
  const extraBox = el('div', { class: 'chips' }); lado.insertBefore(extraBox, lado.children[2]);
  function extras() {
    extraBox.replaceChildren(); const s = WZE.sel;
    if (WZE.pmodo === 'sc' && s != null && D.sc[s]) { const c = D.sc[s]; extraBox.append(el('button', { type: 'button', on: { click: () => { marca(); c.kind = c.kind === 'agua' ? 'fofa' : 'agua'; salvar(); desenha(); } } }, c.kind === 'agua' ? 'Água → areia fofa' : 'Areia fofa → água'), el('button', { type: 'button', on: { click: () => { marca(); c.ramp = !c.ramp; if (!c.ramp) delete c.ramp; salvar(); desenha(); } } }, c.ramp ? 'Tirar a rampa' : 'Pôr rampa (salto)')); }
    if (WZE.pmodo === 'slopes' && s != null && D.slopes[s]) { const z = D.slopes[s]; extraBox.append(el('button', { type: 'button', on: { click: () => { marca(); z.s = -z.s; salvar(); desenha(); } } }, z.s > 0 ? 'Virar subida' : 'Virar descida')); }
  }
  function selPos(s) { const md = WZE.pmodo; if (md === 'boxes' || md === 'ramps' || md === 'fofa') return D[md][s] != null ? lp(D[md][s]) : null; if (md === 'pads') return D.pads[s] ? lp(D.pads[s].i) : null; if (md === 'sc') return D.sc[s] ? lp(D.sc[s].a) : null; if (md === 'slopes') return D.slopes[s] ? lp(D.slopes[s].a) : null; return null; }
  function apagaSel() {
    const s = WZE.sel, md = WZE.pmodo; if (s == null) return; marca();
    if (md === 'pts') { if (D.pts.length <= 4) return; D.pts.splice(s, 1); remap(s, -1); }
    else if (D[md] && Array.isArray(D[md])) D[md].splice(s, 1);
    WZE.sel = null; L = line(); salvar(); desenha();
  }
  // ao pôr ou tirar um ponto da pista, as peças depois dele andam junto (cada ponto vira 24 pedacinhos da linha)
  function remap(at, dir) {
    const cut = at * 24, f = (i) => (i >= cut ? Math.max(0, i + dir * 24) : i);
    D.boxes = D.boxes.map(f); D.ramps = D.ramps.map(f); D.fofa = D.fofa.map(f); D.pads.forEach((p) => { p.i = f(p.i); }); D.sc.forEach((c) => { c.a = f(c.a); c.b = f(c.b); }); D.slopes.forEach((z) => { z.a = f(z.a); z.b = f(z.b); });
  }
  let drag = null, pend = null;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top), md = WZE.pmodo, tol = 22 / zoom;
    const hit = (pts) => { let b = -1, bd = 1e18; pts.forEach((p, i) => { if (!p) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = i; } }); return bd < Math.max(tol, 40) ? b : -1; };
    let h = -1;
    if (md === 'pts') h = hit(D.pts.map((q) => q));
    else if (md === 'boxes' || md === 'ramps' || md === 'fofa') h = hit(D[md].map((i) => lp(i)));
    else if (md === 'pads') h = hit(D.pads.map((p) => { const q = lp(p.i), a = ang(p.i); return [q[0] - Math.sin(a) * p.o, q[1] + Math.cos(a) * p.o]; }));
    else if (md === 'sc') h = hit(D.sc.map((c) => lp(c.a)));
    else if (md === 'slopes') h = hit(D.slopes.map((z) => lp(z.a)));
    else if (md === 'farol' && D.farol && Math.hypot(D.farol[0] - x, D.farol[1] - y) < 80) h = 0;
    if (h >= 0 && e.shiftKey && md !== 'farol') { WZE.sel = h; apagaSel(); return; }
    if (h >= 0) { marca(); WZE.sel = h; drag = { md, h, moved: false }; desenha(); return; }
    const nr = near(x, y);
    if (md !== 'pts' && md !== 'farol' && nr.d < BG.hw * 1.3) {
      marca();
      if (md === 'boxes' || md === 'ramps' || md === 'fofa') { D[md].push(nr.i); D[md].sort((a, b) => a - b); WZE.sel = D[md].indexOf(nr.i); }
      else if (md === 'pads') { D.pads.push({ i: nr.i, o: 0 }); WZE.sel = D.pads.length - 1; }
      else if (md === 'sc' || md === 'slopes') { if (!pend) { pend = { md, a: nr.i }; info.textContent = 'Agora clique onde termina.'; return; } const a = pend.a, b = nr.i; pend = null; if (md === 'sc') D.sc.push({ a: Math.min(a, b), b: Math.max(a, b), kind: 'agua' }); else D.slopes.push({ a: Math.min(a, b), b: Math.max(a, b), s: 1 }); WZE.sel = D[md].length - 1; }
      salvar(); desenha(); return;
    }
    if (md === 'farol' && !D.farol) { marca(); D.farol = [Math.round(x), Math.round(y)]; salvar(); desenha(); return; }
    drag = { pan: true, sx: e.clientX, sy: e.clientY, cx, cy };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return; const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top);
    if (drag.pan) { cx = drag.cx - (e.clientX - drag.sx) / zoom; cy = drag.cy - (e.clientY - drag.sy) / zoom; desenha(); return; }
    drag.moved = true; const md = drag.md, h = drag.h;
    if (md === 'pts') { D.pts[h] = [Math.round(x), Math.round(y)]; L = line(); }
    else if (md === 'farol') D.farol = [Math.round(x), Math.round(y)];
    else { const nr = near(x, y);
      if (md === 'boxes' || md === 'ramps' || md === 'fofa') D[md][h] = nr.i;
      else if (md === 'pads') { const p = D.pads[h], q = lp(nr.i), a = ang(nr.i); p.i = nr.i; p.o = Math.round(Math.max(-BG.hw + BG.padW, Math.min(BG.hw - BG.padW, -(x - q[0]) * Math.sin(a) + (y - q[1]) * Math.cos(a)))); }
      else if (md === 'sc') { const c = D.sc[h], len = c.b - c.a; c.a = nr.i; c.b = nr.i + len; }
      else if (md === 'slopes') { const z = D.slopes[h], len = z.b - z.a; z.a = nr.i; z.b = nr.i + len; } }
    desenha();
  });
  cv.addEventListener('pointerup', () => { if (drag && !drag.pan) { if (drag.moved) salvar(); else WZE.hist.pop(); } drag = null; });
  cv.addEventListener('dblclick', (e) => {
    if (WZE.pmodo !== 'pts') return; const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top), nr = near(x, y); if (nr.d > BG.hw * 1.5) return;
    marca(); const at = Math.floor(nr.i / 24) + 1; D.pts.splice(at, 0, [Math.round(x), Math.round(y)]); remap(at, 1); L = line(); WZE.sel = at; salvar(); desenha();
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom *= e.deltaY < 0 ? 1.12 : 1 / 1.12; desenha(); }, { passive: false });
  requestAnimationFrame(() => { enquadra(); desenha(); });
  WZE.redesenha = desenha;
}

// ---------- CANCHA DA BOCHA (arrastando): os cantos da cancha (a vila pintada acompanha) e o ponto de lançamento
function wzCancha(m) {
  m.append(el('h2', {}, 'Cancha da bocha'), el('p', { class: 'ajuda' }, 'Arraste os círculos: os 4 cantos mudam o tamanho da cancha (o desenho da vila acompanha) e o círculo azul é de onde as bolas saem. Os montinhos e buracos são sorteados a cada partida; "Sortear de novo" mostra outro sorteio.'));
  const cv = el('canvas', { class: 'pc', style: 'height:auto;aspect-ratio:16/9;max-width:980px' }), g = cv.getContext('2d');
  m.append(cv, el('div', { class: 'chips', style: 'margin-top:8px' },
    el('button', { type: 'button', on: { click: () => { bocha.init(); desenha(); } } }, 'Sortear de novo'),
    el('button', { type: 'button', class: 'dang', on: { click: () => { for (const k of ['x0', 'x1', 'y0', 'y1', 'sx', 'sy']) delete WZE.cfg.mec['BC.' + k]; WZ.apply(WZE.cfg); wzMudou(); desenha(); } } }, 'Voltar a cancha ao original')));
  if (!bocha.T) bocha.init();
  const VW = () => (typeof W === 'number' ? W : 400), VH = () => (typeof H === 'number' ? H : 225);
  const pontos = () => [['x0', 'y0', BC.x0, BC.y0], ['x1', 'y0', BC.x1, BC.y0], ['x0', 'y1', BC.x0, BC.y1], ['x1', 'y1', BC.x1, BC.y1], ['sx', 'sy', BC.sx, BC.sy]];
  let k = 1;
  function desenha() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (!r.width) return; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    k = Math.min(r.width / VW(), r.height / VH());
    const save = ctx; ctx = g; try { g.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); g.clearRect(0, 0, VW(), VH()); const st = bocha.state; bocha.state = 'score'; bocha.res = null; bocha.draw(0); bocha.state = st; } catch (e) { console.warn(e); } finally { ctx = save; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.strokeStyle = '#ff2d55'; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(BC.x0 * k, BC.y0 * k, (BC.x1 - BC.x0) * k, (BC.y1 - BC.y0) * k); g.setLineDash([]);
    pontos().forEach(([, , x, y], i) => { g.fillStyle = i === 4 ? '#3f7fe0' : '#ffffff'; g.strokeStyle = '#1b1f4f'; g.lineWidth = 2.5; g.beginPath(); g.arc(x * k, y * k, 9, 0, Math.PI * 2); g.fill(); g.stroke(); });
  }
  let dr = null;
  cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; const i = pontos().findIndex(([, , px, py]) => Math.hypot(px * k - x, py * k - y) < 16); if (i < 0) return; cv.setPointerCapture(e.pointerId); dr = i; });
  cv.addEventListener('pointermove', (e) => {
    if (dr == null) return; const r = cv.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / k), y = Math.round((e.clientY - r.top) / k), [kx, ky] = pontos()[dr];
    const lim = { x0: [0, BC.x1 - 80], x1: [BC.x0 + 80, VW()], y0: [20, BC.y1 - 50], y1: [BC.y0 + 50, VH()], sx: [BC.x0 + 2, BC.x0 + 60], sy: [BC.y0 + 10, BC.y1 - 10] };
    const cl = (kk, v) => Math.max(lim[kk][0], Math.min(lim[kk][1], v));
    WZE.cfg.mec['BC.' + kx] = cl(kx, x); WZE.cfg.mec['BC.' + ky] = cl(ky, y); WZ.apply(WZE.cfg); desenha();
  });
  cv.addEventListener('pointerup', () => { if (dr != null) { dr = null; wzMudou(); } });
  requestAnimationFrame(desenha);
}

// ---------- ROSTOS E QUADROS
function wzRostos(m) {
  WZE.rset = WZE.rset || 'ia'; const S = WZ_SETS.find((s) => s.id === WZE.rset), A0 = S.atl();
  m.append(el('h2', {}, 'Rostos e quadros'), el('p', { class: 'ajuda' }, 'Escolha o personagem, o movimento e o quadro. Tudo se faz arrastando no desenho: escolha abaixo se o arraste move o rosto, muda o tamanho (para cima aumenta), gira (para os lados) ou move o desenho inteiro (para encaixar um quadro no outro; ligue \"Ver o quadro anterior por baixo\"). A rodinha do mouse também muda o tamanho do rosto. Os números ao lado são para o ajuste fino. O rosto só aparece dentro do visor (a parte escura do desenho). "Tocar" mostra o movimento andando.'));
  m.append(el('div', { class: 'chips' }, ...WZ_SETS.map((s) => el('button', { type: 'button', class: s.id === WZE.rset ? 'on' : '', on: { click: () => { WZE.rset = s.id; WZE.ran = null; WZE.rk = 0; wzRender(); } } }, s.nome))));
  if (!A0 || !window.__fr || !window.__fr[S.id]) { m.append(el('p', { class: 'aviso' }, 'Os desenhos deste personagem ainda estão carregando. Volte nesta aba em alguns segundos.')); return; }
  const anims = Object.keys(A0.a).filter((a) => !/_\d$/.test(a)); WZE.ran = WZE.ran && A0.a[WZE.ran] ? WZE.ran : anims[0]; WZE.rk = Math.min(WZE.rk || 0, A0.a[WZE.ran].f.length - 1);
  const sel = el('select', {}, ...anims.map((a) => el('option', { value: a, selected: a === WZE.ran }, a))); sel.addEventListener('change', () => { WZE.ran = sel.value; WZE.rk = 0; wzRender(); });
  const cv = el('canvas', { class: 'rc' }), g = cv.getContext('2d'), key = () => `${S.id}.${WZE.ran}.${WZE.rk}`;
  const cur = () => WZE.cfg.rostos[key()] || {};
  const setv = (k, v) => { const o = { ...cur(), [k]: v }; if (!o.fx && !o.fy && (o.fs ?? 1) === 1 && !o.fr && !o.ax && !o.ay) delete WZE.cfg.rostos[key()]; else WZE.cfg.rostos[key()] = o; try { WZ.apply(WZE.cfg); } finally { desenha(); marcaTira(); wzMudou(); } };
  // só atualiza as marquinhas dos quadros mudados (sem refazer os campos, para não perder o que está sendo digitado)
  // os números acompanham o arraste ao vivo
  const syncCampos = () => { const o = cur(); ctl.querySelectorAll('input[data-k]').forEach((i) => { if (document.activeElement !== i) i.value = String(o[i.dataset.k] ?? i.dataset.def); }); marcaTira(); };
  const marcaTira = () => tira.querySelectorAll('button').forEach((b, k) => { b.textContent = `${k + 1}${mud(k)}`; });
  let ex = WZE.rex || 0, toca = false, zoom = WZE.rzoom || 5;
  const tira = el('div', { class: 'tira' });
  const ctl = el('div', {});
  const mud = (k) => (WZE.cfg.rostos[`${S.id}.${WZE.ran}.${k}`] ? ' •' : '');
  function campos() {
    tira.replaceChildren(...A0.a[WZE.ran].f.map((_, k) => el('button', { type: 'button', class: k === WZE.rk ? 'on' : '', on: { click: () => { WZE.rk = k; toca = false; desenha(); campos(); } } }, `${k + 1}${mud(k)}`)));
    const o = cur(), f = A0.a[WZE.ran].f[WZE.rk];
    const num = (rot, k, step, def, conv = (v) => v) => { const i = el('input', { type: 'number', step: String(step), value: String(o[k] ?? def) }); i.dataset.k = k; i.dataset.def = def; const go = () => { if (i.value === '' || i.value === '-' || !isFinite(+i.value)) return; setv(k, conv(+i.value)); }; i.addEventListener('input', go); i.addEventListener('change', go); return el('div', { class: 'lin', style: 'grid-template-columns:1fr 110px' }, rot, i); };
    ctl.replaceChildren(
      f.s ? el('div', {}, el('h3', {}, 'Rosto neste quadro'),
        num('Para a direita (pixels do desenho)', 'fx', 1, 0), num('Para baixo (pixels do desenho)', 'fy', 1, 0), num('Tamanho (1 = original)', 'fs', .02, 1), num('Giro (graus)', 'fr', 1, 0)) : el('p', { class: 'ajuda' }, 'Este quadro não tem visor (sem rosto).'),
      el('h3', {}, 'Encaixe do quadro'), num('Mover o desenho para a direita', 'ax', 1, 0), num('Mover o desenho para baixo', 'ay', 1, 0),
      el('div', { class: 'chips' },
        el('button', { type: 'button', on: { click: () => { const o2 = cur(); A0.a[WZE.ran].f.forEach((_, k) => { const kk = `${S.id}.${WZE.ran}.${k}`; if (Object.keys(o2).length) WZE.cfg.rostos[kk] = { ...o2 }; else delete WZE.cfg.rostos[kk]; }); WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Copiar para todos os quadros'),
        el('button', { type: 'button', on: { click: () => { delete WZE.cfg.rostos[key()]; WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Voltar este quadro'),
        el('button', { type: 'button', class: 'dang', on: { click: () => { A0.a[WZE.ran].f.forEach((_, k) => delete WZE.cfg.rostos[`${S.id}.${WZE.ran}.${k}`]); WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Voltar o movimento todo')),
      el('h3', {}, 'Ver'),
      (() => { const s2 = el('select', {}, ...['0 normal', '1 feliz', '2 rindo', '3 espanto', '4 bravo', '5 concentrado'].map((t, i) => el('option', { value: i, selected: i === ex }, 'Rosto ' + t))); s2.addEventListener('change', () => { ex = WZE.rex = +s2.value; desenha(); }); return s2; })(),
      (() => { const r = el('input', { type: 'range', min: '2', max: '12', step: '.5', value: String(zoom) }); r.addEventListener('input', () => { zoom = WZE.rzoom = +r.value; desenha(); }); return el('div', { class: 'lin', style: 'grid-template-columns:90px 1fr' }, 'Aproximar', r); })(),
      el('button', { type: 'button', on: { click: () => { toca = !toca; } } }, 'Tocar / parar'));
  }
  const modos = el('div', { class: 'chips' }, 'Arrastar no desenho: ', ...[['rosto', 'Mover o rosto'], ['tam', 'Tamanho do rosto ↕'], ['giro', 'Girar o rosto ↔'], ['desenho', 'Mover o desenho']].map(([k2, t2]) =>
    el('button', { type: 'button', class: (WZE.rmodo || 'rosto') === k2 ? 'on' : '', on: { click: (e) => { WZE.rmodo = k2; modos.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); } } }, t2)),
    (() => { const c = el('input', { type: 'checkbox', checked: !!WZE.ronion }); c.addEventListener('change', () => { WZE.ronion = c.checked; desenha(); }); return el('label', { style: 'display:flex;gap:6px;align-items:center;margin-left:8px' }, c, 'Ver o quadro anterior por baixo'); })());
  m.append(el('div', { class: 'chips' }, 'Movimento: ', sel), tira, modos, el('div', { class: 'rost' }, cv, ctl));
  function desenha() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (!r.width) return; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const save = ctx; ctx = g; try {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#cfe8ee'; g.fillRect(0, 0, r.width, r.height);
      g.fillStyle = '#e9d7ad'; g.fillRect(0, r.height * .82, r.width, r.height * .18); g.strokeStyle = 'rgba(27,31,79,.3)'; g.beginPath(); g.moveTo(r.width / 2, 0); g.lineTo(r.width / 2, r.height); g.stroke();
      g.translate(r.width / 2, r.height * .82); g.scale(zoom, zoom);
      // quadro anterior clarinho por baixo, para encaixar um no outro
      window.__wzSemOlhar = true;
      const nq = A0.a[WZE.ran].f.length; if (WZE.ronion && nq > 1) { g.save(); g.globalAlpha = .3; S.fn(WZE.ran, (WZE.rk - 1 + nq) % nq, ex); g.restore(); }
      S.fn(WZE.ran, WZE.rk, ex);
    } catch { /* desenho carregando */ } finally { ctx = save; window.__wzSemOlhar = false; }
  }
  // arrastar o rosto
  let dr = null;
  // o que o arraste faz: mover o rosto, mudar o tamanho (arrastar para cima/baixo), girar (para os lados) ou mover o desenho inteiro
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const o = cur(); dr = { x: e.clientX, y: e.clientY, o: { fx: 0, fy: 0, fs: 1, fr: 0, ax: 0, ay: 0, ...o } }; });
  cv.addEventListener('pointermove', (e) => {
    if (!dr) return; const k = 1 / (zoom * S.esc()), dx = e.clientX - dr.x, dy = e.clientY - dr.y, o = { ...dr.o }, md = WZE.rmodo || 'rosto';
    if (md === 'rosto') { o.fx = Math.round(dr.o.fx + dx * k); o.fy = Math.round(dr.o.fy + dy * k); }
    else if (md === 'tam') o.fs = Math.round(Math.max(.3, Math.min(3, dr.o.fs * Math.exp(-dy / 150))) * 100) / 100;
    else if (md === 'giro') o.fr = Math.round(dr.o.fr + dx / 3);
    else { o.ax = Math.round(dr.o.ax + dx * k); o.ay = Math.round(dr.o.ay + dy * k); }
    WZE.cfg.rostos[key()] = o; WZ.apply(WZE.cfg); desenha(); syncCampos();
  });
  cv.addEventListener('pointerup', () => { if (dr) { dr = null; const o = cur(); if (!o.fx && !o.fy && (o.fs ?? 1) === 1 && !o.fr && !o.ax && !o.ay) delete WZE.cfg.rostos[key()]; WZ.apply(WZE.cfg); wzMudou(); campos(); } });
  // rodinha do mouse: tamanho do rosto
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const o = { fx: 0, fy: 0, fs: 1, fr: 0, ax: 0, ay: 0, ...cur() }; o.fs = Math.round(Math.max(.3, Math.min(3, o.fs * (e.deltaY < 0 ? 1.04 : 1 / 1.04))) * 100) / 100; WZE.cfg.rostos[key()] = o; WZ.apply(WZE.cfg); desenha(); wzMudou(); syncCampos(); }, { passive: false });
  campos(); requestAnimationFrame(desenha);
  let t = 0; WZE.anim = setInterval(() => { if (!document.getElementById('wz-main')) return; if (toca) { t++; WZE.rk = t % A0.a[WZE.ran].f.length; desenha(); if (t % 4 === 0) campos(); } }, 125);
}

// ---------- TEXTOS E FALAS
function wzTextos(m) {
  m.append(el('h2', {}, 'Textos e falas'), el('p', { class: 'ajuda' }, 'Uma fala por linha: o jogo sorteia uma delas. Os nomes das provas e a linha de baixo do nome também mudam aqui. Use linguagem neutra.'));
  m.append(el('h3', {}, 'Nomes das provas'));
  for (const e of EVENTS) for (const k of ['name', 'tag']) {
    const p = `ev:${e.id}.${k}`, i = el('input', { type: 'text', value: WZE.cfg.textos[p] ?? e[k] });
    i.addEventListener('change', () => { if (i.value === wzOrigT(p)) delete WZE.cfg.textos[p]; else WZE.cfg.textos[p] = i.value; WZ.apply(WZE.cfg); wzMudou(); });
    m.append(el('div', { class: 'lin', style: 'grid-template-columns:200px 1fr' }, `${e.name} · ${k === 'name' ? 'nome' : 'subtítulo'}`, i));
  }
  const grupos = [];
  const walk = (o, base) => { for (const [k, v] of Object.entries(o)) { if (Array.isArray(v) && v.every((x) => typeof x === 'string')) grupos.push(base ? `${base}.${k}` : k); else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, base ? `${base}.${k}` : k); } };
  walk(FALA, '');
  m.append(el('h3', {}, 'Falas do IAmiguinho'));
  for (const gk of grupos) {
    const p = `fala:${gk}`, v = WZE.cfg.textos[p] ?? WZ.get(p), ta = el('textarea', { value: v.join('\n') });
    ta.addEventListener('change', () => { const arr = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); if (!arr.length) return; WZE.cfg.textos[p] = arr; WZ.apply(WZE.cfg); wzMudou(); });
    m.append(el('div', { class: 'lin', style: 'grid-template-columns:200px 1fr 28px' }, gk, ta, el('button', { type: 'button', title: 'Voltar ao original', on: { click: () => { delete WZE.cfg.textos[p]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, '↺')));
  }
}
function wzOrigT(p) { const c = WZ.clone(WZE.cfg); delete c.textos[p]; WZ.apply(c); const v = WZ.get(p); WZ.apply(WZE.cfg); return v; }

// ---------- VERSÕES E CÓPIA
async function wzVersoes(m) {
  m.append(el('h2', {}, 'Versões e cópia de segurança'), el('p', { class: 'ajuda' }, 'Cada vez que você aplica, uma versão fica guardada. "Trazer para o rascunho" coloca aquela versão no rascunho (aí é só testar e aplicar). A cópia de segurança é um texto com tudo o que você mudou: copie e guarde, ou cole uma cópia para trazer de volta.'));
  const lista = el('div', {}, 'Carregando…'); m.append(lista);
  const vs = await WZDB.versions(); lista.replaceChildren(...(vs.length ? vs.map((v) => el('div', { class: 'ver' }, el('div', {}, el('b', {}, v.nome || 'Sem nome'), ' · ', new Date(v.at).toLocaleString('pt-BR')),
    el('button', { type: 'button', on: { click: async () => { if (!(await wzPergunta('Trocar o rascunho por esta versão?'))) return; WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, WZ.clone(v.cfg)); WZ.apply(WZE.cfg); wzMudou(); wzStatus('Versão trazida para o rascunho'); } } }, 'Trazer para o rascunho'))) : [el('p', { class: 'ajuda' }, 'Nenhuma versão aplicada ainda.')]));
  const conta = (o) => Object.keys(o || {}).length;
  m.append(el('h3', {}, 'O rascunho agora'), el('p', { class: 'ajuda' }, `${conta(WZE.cfg.mec)} números, ${conta(WZE.cfg.pistas)} partes de pistas, ${conta(WZE.cfg.rostos)} quadros e ${conta(WZE.cfg.textos)} textos mudados.`));
  const ta = el('textarea', { style: 'min-height:140px;max-width:760px', value: JSON.stringify(WZE.cfg) });
  m.append(ta, el('div', { class: 'chips', style: 'margin-top:8px' },
    el('button', { type: 'button', on: { click: async () => { try { await navigator.clipboard.writeText(ta.value); wzStatus('Cópia copiada'); } catch { ta.select(); wzStatus('Selecione e copie o texto'); } } } }, 'Copiar a cópia de segurança'),
    el('button', { type: 'button', on: { click: () => { try { const c = JSON.parse(ta.value); if (!c || typeof c !== 'object') throw 0; WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, c); WZ.apply(WZE.cfg); wzMudou(); wzStatus('Cópia colada no rascunho'); } catch { wzStatus('Esse texto não é uma cópia válida'); } } } }, 'Colar no rascunho'),
    el('button', { type: 'button', class: 'dang', on: { click: async () => { if (!(await wzPergunta('Apagar todas as mudanças do rascunho? (o que já foi aplicado continua no jogo)'))) return; WZE.cfg = { mec: {}, pistas: {}, rostos: {}, textos: {} }; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, 'Limpar o rascunho')));
}
