/**
 * A biblioteca de falas do IAmiguinho (sem nada de navegador, para os testes e para conferir junto com a checagem
 * da IA). As lacunas {jogo} e {dias} só são preenchidas com fatos que o site tem.
 */
/** Momentos de interface: ele ocupa o lugar do conteúdo que ainda não existe. */
export type Interface = 'jornada-vazia' | 'colecao-vazia' | 'listas-vazias' | 'radar-vazio' | 'avisos-vazios' | 'busca-vazia' | 'nao-encontrada' | 'erro' | 'carregando';
/** Cameos: aparecem sozinhos, num balão no canto. */
export type Cameo = 'indeciso' | 'voltou' | 'primeiro-zerado' | 'zerado' | 'radar' | 'cofre';
/** Os fatos que uma fala pode usar. Nada além disto chega à IA. */
export type Fatos = { jogo?: string; dias?: number };

export const FALAS: Record<Interface | Cameo, string[]> = {
  'jornada-vazia': [
    'Nenhuma Jornada ainda. Eu também não tenho, mas a minha é porque não passei do tutorial.',
    'Linha do tempo em branco. Escolhe um jogo que eu seguro a lanterna.',
    'Ainda nada por aqui. Se precisar de alguém para começar jogos, sou especialista. Terminar é outro departamento.',
  ],
  'colecao-vazia': [
    'Estante nova, cheirinho de madeira. Qual vai ser o primeiro jogo?',
    'Estante vazia. Eu emprestaria os meus, mas só tenho tutoriais.',
  ],
  'listas-vazias': [
    'Lista vazia. Eu faria uma, mas ia esquecer o nome dela no meio.',
    'Nenhuma lista ainda. Prometo não palpitar. Muito.',
  ],
  'radar-vazio': [
    'Radar limpo. Esperar jogo é minha especialidade, só me fala qual.',
    'Nada no Radar. Eu fico de olho mesmo assim, com a hélice ligada.',
  ],
  'avisos-vazios': [
    'Tudo em silêncio por aqui. Aproveitei para cochilar.',
    'Nenhum aviso. Até eu fiquei sem assunto, e isso é raro.',
  ],
  'busca-vazia': [
    'Procurei em todo lugar. Bom, em dois lugares. Tenta outro nome?',
    'Não achei nada. Mas achei uma meia que eu tinha perdido.',
  ],
  'nao-encontrada': [
    'Eu jurava que tinha uma página aqui. Meu mapa está de cabeça para baixo de novo.',
    'Esse caminho não está no meu mapa. Volto com você para o início?',
  ],
  erro: [
    'Fui ajudar e desliguei um cabo. Tenta de novo daqui a pouco?',
    'Tropecei no fio. Já estou ligando de volta, prometo.',
  ],
  carregando: [
    'Girando a hélice para ir mais rápido. Não ajuda, mas fica bonito.',
    'Carregando. Eu ajudaria, mas da última vez desliguei o roteador.',
  ],
  indeciso: [
    'Três ideias e nada? Eu escolho jogo pelo tamanho da caixa. Funciona metade das vezes.',
    'Indecisão também é estado de jogo: pausado na tela de seleção.',
    'Se fosse eu, escolhia o que tem o tutorial mais curto. Por motivos óbvios.',
  ],
  voltou: [
    'Olha quem voltou! Guardei tudo direitinho. Até o recado que você nem lembra que escreveu.',
    'Que bom te ver de volta. O jogo não andou sem você, juro. Eu tentei, mas não andou.',
    '{dias} dias longe de {jogo}? Eu fiquei esse tempo todo procurando o botão de pular diálogo.',
    'Voltou para {jogo}! Deixei tudo onde estava. Só mexi na hélice, mas ela já era assim.',
    'Fazia {dias} dias. Eu contei. Bom, a página contou, eu só fiquei olhando.',
    'Boas-vindas de volta a {jogo}! Eu ia fazer um resumo, mas esqueci o começo.',
    '{jogo} de novo! Eu também voltaria. Para o tutorial, que é onde eu moro.',
    'Olha só, {dias} dias depois. O save esperou quietinho, igual eu esperando uma partida de Splatoon.',
    'De volta a {jogo}! Se precisar de alguém para lembrar os controles, eu chuto alguns.',
    'Eu ia limpar a poeira de {jogo} para você, mas apertei o botão errado e aprendi a pular. Não pulo bem.',
    'Que bom te ver! Em {dias} dias eu treinei muito. Continuo igual, mas treinei.',
    'Voltou! Separei um pão cacetinho para comemorar. Comi, mas separei.',
    'Retomando {jogo}? Eu sou especialista em começar. A parte do meio é com você.',
    'Oi de novo! Enquanto você estava longe de {jogo}, eu tentei a primeira fase de um Souls. Ela ganhou.',
    '{dias} dias! Passei todos tentando assobiar. Ainda só sai vento da hélice.',
    'A Retomada está pronta, eu só apertei Enter. Duas vezes. Para garantir.',
    'Que bom te ver de novo! Eu guardei seu lugar em {jogo}. Sentei nele, mas guardei.',
    'Voltar também é progresso. Eu volto para o menu inicial o tempo todo e me sinto ótimo.',
    'Olha quem apareceu! Eu chego atrasado em tudo, então hoje você ganhou de mim.',
    'Senti falta das suas sessões de {jogo}. Eu só tenho a minha, que é no tutorial.',
  ],
  'primeiro-zerado': [
    'Primeira história no mural! A minha ainda está no tutorial, mas a sua vai ganhar moldura.',
    'Zerou! Eu sabia que você conseguia. Quer dizer... eu esperava. Sabia é uma palavra forte.',
    'Primeiro zerado, {jogo}! Eu tenho 47, mas são todos tutoriais. Os seus contam mais.',
  ],
  zerado: [
    'Zerou {jogo}! Eu ainda estou tentando passar do menu inicial.',
    'Mais um no mural! Eu também zerei um hoje. Era o tutorial, mas zerei.',
    '{jogo} zerado! Vou pendurar uma moldura. Se ela cair, foi o vento da hélice.',
    'Que final! Bom, eu não vi, mas a sua cara de quem zerou {jogo} conta tudo.',
    'Zerou {jogo}?! Eu ia ajudar, mas estava no Splatoon tentando acertar alguém com a Sploosh.',
    'Parabéns por {jogo}! Eu sabia. Quer dizer, eu torcia. Sabia é uma palavra forte.',
    'Fim de {jogo}! Eu chego atrasado em toda comemoração, mas essa eu peguei.',
    'Zerado! Minha lista também cresceu hoje: mais um tutorial. Empate técnico.',
    '{jogo} completo! Vou comemorar girando a hélice. Cuidado com o cabelo.',
    'Você zerou {jogo} e eu zerei um pacote de pão cacetinho. Dia produtivo para os dois.',
    'Créditos rolando em {jogo}! Eu leio todos os nomes, procurando o meu. Ainda não achei.',
    'Mais uma história fechada. Eu fecho as minhas no tutorial, mas com a mesma emoção.',
    'Zerou {jogo}! Vou contar para o Balacaxi. Ele não me responde, mas vou contar.',
    'Que orgulho! Eu ia fazer um discurso, mas esqueci depois do "Que".',
    '{jogo} na estante dos zerados. Eu fico só olhando, de longe, para não derrubar.',
    'Parabéns! Se quiser dicas para o próximo, eu tenho várias. Todas do tutorial.',
    'Zerado! Eu tentei fazer confete, mas era papel de bala. Vale a intenção.',
    'Mais um zerado no mural! Eu aplaudiria, mas três dedos fazem um som esquisito.',
    'Fim de {jogo}! Agora eu entendo por que chamam de zerar. Não entendo, mas parabéns.',
    'Você terminou {jogo}. Eu terminei de ler o seu nome no mural. Cada um no seu ritmo.',
  ],
  radar: [
    'Lançamento chegando. Eu já separei o lanche.',
    'Mais um jogo para esperar. Minha especialidade.',
  ],
  cofre: ['Coleção grande, hein? Eu só tenho um cartucho, e é de hélice.'],
};

export const sortear = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

/** Troca as lacunas pelos fatos. Uma fala com lacuna sem fato (ou com 1 dia, que fica estranho) não serve. */
export function preencher(fala: string, f: Fatos = {}): string | null {
  let ok = true;
  const out = fala.replace(/\{(jogo|dias)\}/g, (_, k: 'jogo' | 'dias') => {
    const v = f[k];
    if (v == null || v === '' || (k === 'dias' && (typeof v !== 'number' || v < 2))) { ok = false; return ''; }
    return String(v);
  });
  return ok ? out : null;
}
/** Uma fala da biblioteca que caiba nos fatos e não esteja entre as últimas mostradas. */
export function falaDaBiblioteca(motivo: Interface | Cameo, f: Fatos = {}, evitar: string[] = []): string {
  const prontas = FALAS[motivo].map((x) => preencher(x, f)).filter((x): x is string => !!x);
  const novas = prontas.filter((x) => !evitar.includes(x));
  return sortear(novas.length ? novas : prontas);
}

