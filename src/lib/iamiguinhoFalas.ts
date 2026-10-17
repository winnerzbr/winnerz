/**
 * A biblioteca de falas do IAmiguinho (sem nada de navegador, para os testes e para conferir junto com a checagem
 * da IA). As lacunas {jogo} e {dias} só são preenchidas com fatos que o site tem.
 */
/** Momentos de interface: ele ocupa o lugar do conteúdo que ainda não existe. */
export type Interface = 'jornada-vazia' | 'colecao-vazia' | 'listas-vazias' | 'radar-vazio' | 'avisos-vazios' | 'busca-vazia' | 'nao-encontrada' | 'erro' | 'carregando';
/** Cameos: aparecem sozinhos, num balão no canto. */
export type Cameo = 'indeciso' | 'voltou' | 'primeiro-zerado' | 'zerado' | 'radar' | 'cofre' | 'pacote' | 'repetida' | 'pagina' | 'awards' | 'jogatina';
/** Os fatos que uma fala pode usar. Nada além disto chega à IA. */
export type Fatos = { jogo?: string; dias?: number };

export const FALAS: Record<Interface | Cameo, string[]> = {
  'jornada-vazia': [
    'Nenhuma Jornada ainda. Uma página em branco: o único lugar onde todo mundo ainda é speedrunner.',
    'Linha do tempo vazia. Igual ao meu histórico de vitórias, só que a sua tem futuro.',
    'Ainda nada por aqui. Escolhe um jogo; eu cuido da parte de dar palpite errado com convicção.',
    'Tudo em branco. É o único save que nunca corrompe.',
    'Começar é a parte que eu domino. São 47 tutoriais de experiência comprovada.',
    'Nenhuma história ainda. Os melhores roteiros também começaram com uma tela vazia e muito café.',
    'Jornada zerada. Não no bom sentido. Bora mudar isso?',
  ],
  'colecao-vazia': [
    'Estante vazia. Minimalismo ou só não chegou a promoção certa?',
    'Nenhum jogo na coleção. A carteira agradece, o coração discorda.',
    'Prateleira nova, cheirinho de madeira e nenhuma DLC obrigatória. Aproveita a paz.',
    'Coleção vazia. Eu emprestaria a minha, mas é só tutorial e um cartucho que eu assopro por tradição.',
    'Por enquanto, a estante mais organizada do site. Dura até a próxima liquidação.',
  ],
  'listas-vazias': [
    'Nenhuma lista ainda. Até a minha lista de tarefas tem um item só: fazer uma lista.',
    'Lista vazia: a única do mundo que ainda não gerou discussão nos comentários.',
    'Um ranking polêmico é a forma mais rápida de fazer amigos. E de perder alguns.',
    'Nada listado. Prometo palpitar só o necessário. O necessário, no meu caso, é muito.',
    'Lista em branco. Eu faria um top 10, mas paro sempre no top 3 por falta de atenção.',
  ],
  'radar-vazio': [
    'Radar limpo. Nenhum lançamento, nenhum servidor caindo no primeiro dia. Uma paz suspeita.',
    'Nada no Radar. Aproveita: é o único momento em que nenhum jogo foi adiado.',
    'Radar vazio. Eu fico de vigia com a hélice ligada e as expectativas desligadas.',
    'Nenhum jogo esperado. Você é imune a trailer de anúncio? Me ensina, por favor.',
    'Radar quieto. Eu ainda espero o meu jogo favorito sair do acesso antecipado. Desde sempre.',
  ],
  'avisos-vazios': [
    'Nenhum aviso. Silêncio total. Suspeito, mas aproveita.',
    'Caixa vazia. Ninguém te chamou, nada pegou fogo. Dia raríssimo.',
    'Zero avisos. Aproveitei para tirar um cochilo no modo de economia de energia.',
    'Tudo em dia. É a sensação de abrir o e-mail e não ter boleto. Guarda esse momento.',
  ],
  'busca-vazia': [
    'Procurei em todo lugar. Bom, em dois lugares, e um era embaixo do sofá. Tenta outro nome?',
    'Nada encontrado. Confere a grafia; eu escrevo Pokémon de três jeitos e todos errados.',
    'Não achei. Talvez seja um jogo tão indie que nem ele sabe que existe.',
    'Zero resultados. Mas achei minha dignidade, que eu tinha perdido na última partida ranqueada.',
    'A busca voltou vazia. Tenta um nome mais curto: menos letras, menos chances de eu me perder.',
  ],
  'nao-encontrada': [
    'Esta página não existe. Ou existe numa DLC que ninguém comprou.',
    'Eu jurava que tinha uma página aqui. Meu mapa está de cabeça para baixo de novo.',
    'Você achou a área secreta! Infelizmente o conteúdo foi cortado antes do lançamento.',
    'Nada aqui. Nem baú, nem NPC, nem missão de buscar dez cogumelos.',
    'Página não encontrada. Ela pulou o tutorial e se perdeu no mundo aberto.',
  ],
  erro: [
    'Fui ajudar e desliguei um cabo. Tenta de novo daqui a pouco?',
    'Deu erro. Já abri um chamado comigo mesmo e me coloquei em prioridade baixa.',
    'Algo quebrou. Não fui eu. Bom, estatisticamente, fui eu.',
    'Erro inesperado. Nos jogos chamam isso de "mecânica emergente".',
    'Tropecei no fio e o servidor caiu junto. A gente é muito próximo.',
  ],
  carregando: [
    'Girando a hélice para ir mais rápido. Não ajuda, mas fica bonito.',
    'Carregando. Aproveita para ler a dica da tela de loading, que ninguém lê.',
    'Quase lá. É o que todo jogo diz quando trava no 99%.',
    'Carregando com toda a minha força. Toda a minha força é pouca, mas é toda.',
    'Segura aí: estou compilando os shaders da sua paciência.',
  ],
  indeciso: [
    'Três ideias e nada? Indecisão também é gênero de jogo. Eu tenho platina nele.',
    'Eu escolho jogo pelo tamanho do tutorial. Quanto maior, mais conteúdo para mim.',
    'Tem gente que passa mais tempo escolhendo do que jogando. Eu passo mais tempo no menu de opções.',
    'Dica profissional: o jogo certo é o que abrir primeiro. Eu ainda estou abrindo o meu.',
    'Joga uma moeda. Se não gostar do resultado, você descobre o que queria.',
    'Indecisão é só o seu cérebro carregando as texturas. Dá mais um segundo.',
  ],
  voltou: [
    '{dias} dias depois, {jogo} continua lá. Jogo é a única coisa que nunca reclama de demora.',
    'Voltou para {jogo}! Primeira missão: lembrar qual botão é pular. Eu também nunca lembro.',
    'De volta a {jogo}. O personagem ficou parado no mesmo lugar esse tempo todo, tipo eu na fila de partida.',
    'Boas-vindas de volta a {jogo}. Os controles mudaram de lugar na sua memória; comigo isso é diário.',
    'Que bom te ver em {jogo}! Resumo do que aconteceu na sua ausência: nada. Foi ótimo.',
    '{dias} dias? Já passei mais tempo que isso no menu de configurações de um Souls.',
    'Retomando {jogo}! A Retomada está aí. Eu ia escrever, mas confio mais em você.',
    'Voltar para um jogo é como reencontrar um amigo antigo: ninguém lembra o nome dos chefes.',
    'De volta! O mundo de {jogo} não andou sem você. Eu tentei empurrar. Não andou.',
    'Voltou! Guardei seu lugar em {jogo}. Sentei nele, mas guardei.',
    'Olha quem voltou! Fica à vontade: aqui ninguém conta as horas. Quer dizer, o site conta, mas com discrição.',
    'Fazia {dias} dias. Eu só sei porque o site contou; eu não sei contar nem vidas.',
    '{jogo} de novo! A graça de voltar é descobrir que você jogava melhor do que lembrava. Ou pior. Emoção.',
    'Voltou! Separei um pão cacetinho para comemorar. Comi, mas separei.',
    'Retomar também é progresso. Eu retomo o tutorial todo dia e me sinto produtivo.',
    'Que bom te ver de novo. {jogo} não mudou nada; já o tamanho do próximo patch, não sei.',
    'De volta a {jogo}! Vai com calma, que os primeiros minutos são só para achar o mapa.',
    'Voltou! Eu também sumi por uma temporada. A desculpa era ótima, só não lembro qual.',
  ],
  'primeiro-zerado': [
    'Primeiro zerado no mural! Eu precisei de 47 tutoriais para sentir algo parecido. Você foi direto ao ponto.',
    'Seu primeiro jogo zerado aqui. Moldura dourada, discurso pronto, lágrima de robô no canto da tela.',
    'Zerou {jogo}! O primeiro do mural. Daqui para frente é ladeira acima, no bom sentido.',
    'Primeira história fechada. Eu tento há anos e o máximo que fechei foi o jogo sem salvar.',
    'Primeiro zerado! Eu sabia que você conseguia. Quer dizer, eu torcia. Saber é uma palavra forte.',
  ],
  zerado: [
    'Zerou {jogo}! Pode descer os créditos com orgulho. Eu fico para a cena pós-créditos, como sempre.',
    '{jogo} zerado. Enquanto isso, eu terminei de ajustar o brilho da tela inicial. Cada um com seus chefes.',
    'Créditos rolando em {jogo}. Eu leio todos os nomes procurando o meu. Ainda não achei.',
    'Zerou {jogo}! Agora vem a pior fase de qualquer jogo: o vazio de não ter o que jogar amanhã.',
    'Fim de {jogo}. Eu sabia que você conseguia. Quer dizer, eu torcia. Saber é uma palavra forte.',
    'Zerado! Seu mural ganhou uma história e eu ganhei um motivo para fingir que ajudei.',
    '{jogo} completo. A sensação de zerar é a melhor DLC que existe, e ainda é de graça.',
    'Zerou {jogo}! Agora pode opinar sobre o final com propriedade. E com raiva, se for o caso.',
    'Mais um no mural! Eu também zerei algo hoje: a bateria do controle.',
    'Zerou {jogo}. Respeito. Eu ainda estou na tela de criar personagem decidindo o nariz.',
    '{jogo} zerado! Tira um print: daqui a alguns anos isso vira nostalgia e remaster.',
    'Parabéns! Se perguntarem quanto tempo levou, a resposta certa é "o necessário".',
    'Zerou {jogo}! Em algum lugar, quem fez o jogo dorme tranquilo sabendo que alguém viu o final.',
    'Créditos! Momento perfeito para fingir que a música não mexeu com você.',
    'Zerado! Vou pendurar a moldura. Se cair, a culpa é do vento da hélice.',
    'Fim de {jogo}. Agora a parte difícil: escolher o próximo sem morar no menu da loja.',
    'Zerou {jogo}! Vou contar para o Balacaxi. Ele não me responde, mas eu conto.',
  ],
  radar: [
    'Lançamento chegando. Hora de baixar o patch do primeiro dia do patch de pré-carregamento.',
    'Mais um jogo para esperar. Já separei o lanche e a paciência para um eventual adiamento.',
    'Está chegando! Confere os requisitos mínimos; os meus são uma tomada e fé.',
    'Contagem regressiva ligada. Treinei a semana toda para apertar Start na hora certa.',
  ],
  cofre: [
    'Coleção grande, hein? Eu só tenho um cartucho, e é de hélice.',
    'Isso não é coleção, é patrimônio cultural com estante.',
    'Coleção desse tamanho já pede seguro, catálogo e visita guiada.',
  ],
  pacote: [
    'Pacote aberto! A estatística diz que a próxima é rara. A estatística mente para mim desde sempre.',
    'Figurinhas novas! Colar reto é opcional; eu colo torto por uma questão de estilo.',
    'Boa! É uma loot box, mas sem a parte em que você chora olhando a fatura.',
    'Pacote aberto. Eu ainda procuro aquela figurinha que nunca sai para mim. Dizem que ela existe.',
    'Abriu! Eu sempre faço um barulho de suspense. Fiz agora. Foi lindo, confia.',
    'Novidade no álbum! Se sobrar repetida, eu adoto. Tenho um abrigo para elas.',
    'Figurinha nova é a única notificação que nunca decepciona. Quase nunca.',
  ],
  repetida: [
    'Veio repetida? Ótimo, agora você tem duas vezes a mesma decepção.',
    'Todas repetidas. A sorte respondeu "volte mais tarde", igual a todo NPC.',
    'Repetidas também têm valor: troca, Cofre e moral alta comigo.',
    'Nada novo. É o gacha da vida, pelo menos esse é de graça.',
    'Repetida de novo? Eu coleciono essas para elas não ficarem sozinhas.',
  ],
  pagina: [
    'Página completa! Um tipo de satisfação que nenhum troféu de platina explica.',
    'Fechou a página! Eu tinha essa figurinha. Acho. Onde eu deixei mesmo?',
    'Página inteira. Vou admirar de longe; da última vez eu amassei uma com a hélice.',
    'Completa! Tem gente que medita; você completa página de álbum. Igualmente válido.',
  ],
  awards: [
    'Eu votei também. Meu voto foi anulado por eu não ser uma pessoa. Preconceito contra mascotes.',
    'Voto registrado! Ensaiei um discurso de agradecimento, caso alguém resolva votar em mim.',
    'Votou! Eu ainda estou na fila de verificação de humanidade. Sétima tentativa.',
    'Voto dado. Eu fiquei com a cédula na mão tentando entender onde dobra.',
    'Votou! Agora é só esperar o resultado e discordar dele com veemência.',
  ],
  jogatina: [
    'Tem vaga? Prometo não carregar o time. Principalmente porque não consigo.',
    'Ainda tem lugar aqui. Se faltar gente, eu levo o controle ao contrário, mas levo.',
    'Vaga aberta! Experiência garantida: eu caio no time adversário e ajudo vocês sem querer.',
    'Tem cadeira sobrando. Eu sentaria, mas a hélice bate no teto.',
    'Jogatina com vaga. Quem vier ganha amigos novos e um jogador ruim de bônus. Eu sou o bônus.',
    'Ainda dá para entrar. Eu me ofereci uma vez e me colocaram na torcida. Fui o melhor da torcida.',
  ],
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


/* ---- @iamiguinho: o plano B das respostas (quando a IA não está ligada ou não respondeu) ------------------------ */
export const MENCAO: { splatoon: string[]; geral: string[]; tangente: string[]; suporte: string[] } = {
  splatoon: [
    'Splatoon? Meu assunto. Sou ótimo. Pelo menos na minha cabeça, que é onde eu jogo melhor kkkk',
    'Aerospray, Clash Blaster, Sploosh: domino todas. Dominar é uma palavra forte, mas eu uso com orgulho.',
    'Splatoon é comigo. Eu pinto o mapa inteiro. Da cor do time adversário, mas pinto.',
  ],
  geral: [
    'Fui chamado! Cheguei atrasado, como sempre, e a resposta ficou no caminho. Me chama de novo daqui a pouco?',
    'Opa! A resposta estava pronta, mas o servidor da minha cabeça entrou em manutenção programada. Tenta de novo depois?',
    'Estou aqui! Pensei tanto que a hélice superaqueceu. Volto já, depois que esfriar.',
    'Cheguei! Tinha uma resposta genial, mas salvei num cartão de memória que eu não acho.',
    'Apareci correndo e tropecei no próprio cabo. A resposta fica para a próxima, prometo.',
  ],
  tangente: [
    'Esse assunto é fase secreta e eu não tenho a chave. Mas tenho opinião fortíssima sobre pão cacetinho, serve?',
    'Disso eu passo a vez, que é minha jogada favorita. Me pergunta de jogo, que eu erro com muito mais confiança.',
    'Esse tema é DLC que eu não comprei. Mudando de assunto: alguém viu meu controle?',
    'Aí já é chefe secreto, e eu não passo nem do tutorial. Próxima pergunta?',
  ],
  suporte: [
    'Conta, senha e pagamento é com a equipe do WinnerZ. Se eu mexer, desligo um cabo e some o site junto.',
    'Isso é com a equipe do WinnerZ. Eu não tenho acesso nem à minha própria senha, e é melhor assim para todo mundo.',
  ],
};
const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Uma fala do plano B para uma @menção (o número aleatório, ele responde sério e certinho). */
export function respostaDaBiblioteca(pergunta: string): string {
  const p = semAcento(pergunta.toLowerCase());
  if (/\b(senhas?|minha conta|pagament\w*|pix|boleto|reembolso|denunci\w*|moderac\w*|privacidade)\b/.test(p)) return sortear(MENCAO.suporte);
  if (/\b(politic\w*|eleicao|eleicoes|governo|religi\w*|igreja\w*)\b/.test(p)) return sortear(MENCAO.tangente);
  const n = /numero[^0-9]{0,40}(\d{1,6})\D{1,12}(\d{1,6})/.exec(p);
  if (n && /aleat|sorte|qualquer|escolh/.test(p)) {
    const a = Math.min(+n[1], +n[2]), b = Math.max(+n[1], +n[2]);
    return `${a + Math.floor(Math.random() * (b - a + 1))}.`;
  }
  return sortear(/splatoon|aerospray|sploosh|clash blaster/.test(p) ? MENCAO.splatoon : MENCAO.geral);
}
