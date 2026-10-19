/**
 * Nomes em português para os recursos que o site conta (lib/track.ts), usados no painel "Uso por recurso" do Studio.
 * Cada recurso conta no máximo uma vez por visita, então os números são "visitas que usaram", não cliques.
 */

export interface UsageLabel { area: string; label: string }

/** Áreas na ordem em que aparecem no painel. */
export const USAGE_AREAS = ['Visitas por área', 'Jornada', 'Sessão', 'O que jogar', 'Coleção', 'Jogos', 'Comunidade', 'Eventos e Álbum', 'Integrações', 'Outros'];

const PAGES: Record<string, string> = {
  inicio: 'Início', jornada: 'Jornada', colecao: 'Coleção', jogos: 'Jogos', comunidade: 'Comunidade (Praça)', eventos: 'Eventos',
  album: 'Álbum', sessao: 'Sessão', perfil: 'Perfis públicos', w: 'Comunidades e conversas', conversa: 'Conversas da Praça',
  jogatina: 'Jogatinas', clube: 'Clubes', mensagens: 'Mensagens', avisos: 'Avisos', listas: 'Listas', lista: 'Uma lista',
  busca: 'Busca completa', preferencias: 'Preferências', studio: 'Studio', chegada: 'A chegada', 'boas-vindas': 'A chegada',
  trecho: 'Trechos compartilhados', escrever: 'Escrever postagem', sobre: 'Sobre', privacidade: 'Privacidade', regras: 'Regras',
  entrar: 'Entrar', convite: 'Convites', codigo: 'Códigos de figurinha', agora: 'Jogar agora (antiga)', overlay: 'Overlay de live',
};

const EXACT: Record<string, UsageLabel> = {
  'jornada.jogar': { area: 'Jornada', label: 'Começou a jogar um jogo' },
  'jornada.ja-zerei': { area: 'Jornada', label: 'Marcou "Já zerei"' },
  'jornada.foco': { area: 'Jornada', label: 'Escolheu o jogo principal' },
  'jornada.desfazer-fim': { area: 'Jornada', label: 'Desfez o fim de uma Jornada' },
  'jornada.lancar-depois': { area: 'Jornada', label: 'Lançou uma sessão depois' },
  'jornada.editar': { area: 'Jornada', label: 'Editou um momento' },
  'jornada.carta': { area: 'Jornada', label: 'Escreveu a carta selada' },
  'jornada.narrar': { area: 'Jornada', label: 'Narração por IA' },
  'jornada.capturas': { area: 'Jornada', label: 'Importou capturas de tela' },
  'jornada.trailer': { area: 'Jornada', label: 'Gravou um trailer' },
  'jornada.cartao': { area: 'Jornada', label: 'Cartão de zerado' },
  'jornada.trecho.cartao': { area: 'Jornada', label: 'Imagem de um trecho' },
  'jornada.trecho.link': { area: 'Jornada', label: 'Link de um trecho' },
  'jornada.preparar-volta': { area: 'Jornada', label: 'Preparar a volta' },
  'jornada.linha-geral': { area: 'Jornada', label: 'Linha do tempo geral' },
  'jornada.ritmo': { area: 'Jornada', label: 'Meu ritmo' },
  'jornada.ano': { area: 'Jornada', label: 'Seu ano' },
  'jornada.temporada': { area: 'Jornada', label: 'Criou uma temporada' },
  'jornada.retrospectiva': { area: 'Jornada', label: 'Abriu uma temporada' },
  'jornada.cartao-temporada': { area: 'Jornada', label: 'Cartão de temporada' },
  'jornada.desafio.feito': { area: 'Jornada', label: 'Desafio da semana: feito (antigo)' },
  'jornada.desafio.pulou': { area: 'Jornada', label: 'Desafio da semana: pulou (antigo)' },
  'jornada.desafio.trocou': { area: 'Jornada', label: 'Desafio da semana: trocou (antigo)' },
  'revisao.abrir': { area: 'Jornada', label: 'Abriu a Revisão sem culpa' },
  'revisao.feita': { area: 'Jornada', label: 'Concluiu a Revisão sem culpa' },
  'retomada.ia': { area: 'Jornada', label: 'Retomada com IA' },
  'retomada.ponto-resolvido': { area: 'Jornada', label: 'Resolveu um ponto para voltar' },
  'sessao.inicio_estrutura': { area: 'Sessão', label: 'Escolheu o capítulo ao começar' },
  'sessao.objetivo': { area: 'Sessão', label: 'Definiu um objetivo' },
  'sessao.apagar': { area: 'Sessão', label: 'Apagou uma sessão' },
  'oqj.descobrir': { area: 'O que jogar', label: 'Aba Descobrir algo' },
  'oqj.outra': { area: 'O que jogar', label: 'Pediu outra sugestão' },
  'colecao.editar-copia': { area: 'Coleção', label: 'Editou um exemplar' },
  'colecao.trocar-jogo': { area: 'Coleção', label: 'Trocou pelo jogo certo' },
  'colecao.console': { area: 'Coleção', label: 'Cadastrou um console' },
  'colecao.emprestar': { area: 'Coleção', label: 'Emprestou' },
  'colecao.devolvido': { area: 'Coleção', label: 'Marcou devolvido' },
  'colecao.vitrine-nova': { area: 'Coleção', label: 'Criou uma vitrine' },
  'colecao.museu-sala': { area: 'Coleção', label: 'Criou uma sala do Museu' },
  'colecao.nao-vou-jogar': { area: 'Coleção', label: 'Marcou "Não vou jogar"' },
  'colecao.reparar': { area: 'Coleção', label: 'Arrumou repetidos' },
  'camera.foto': { area: 'Coleção', label: 'Foto das capas' },
  'camera.adicionou': { area: 'Coleção', label: 'Adicionou pela câmera' },
  'importar.arquivo': { area: 'Coleção', label: 'Importar: enviou planilha' },
  'importar.busca': { area: 'Coleção', label: 'Importar: buscou no catálogo' },
  'importar.concluido': { area: 'Coleção', label: 'Importar: concluiu' },
  'importar.modelo': { area: 'Coleção', label: 'Importar: baixou o modelo' },
  'steam.buscar': { area: 'Coleção', label: 'Steam: buscou a biblioteca' },
  'steam.importar': { area: 'Coleção', label: 'Steam: importou' },
  'jogos.explorar': { area: 'Jogos', label: 'Explorar' },
  'jogos.radar': { area: 'Jogos', label: 'Radar' },
  'jogos.trilhas': { area: 'Jogos', label: 'Trilhas' },
  'jogos.ligar-igdb': { area: 'Jogos', label: 'Ligou um jogo ao catálogo' },
  'correcao.sugerida': { area: 'Jogos', label: 'Sugeriu uma correção' },
  'correcao.aplicada': { area: 'Jogos', label: 'Aplicou uma correção' },
  'busca.universal': { area: 'Jogos', label: 'Busca do topo (Ctrl+K)' },
  'busca.pagina': { area: 'Jogos', label: 'Busca completa' },
  'lista.criou': { area: 'Comunidade', label: 'Criou uma lista' },
  'lista.jogo': { area: 'Comunidade', label: 'Pôs um jogo numa lista' },
  'mensagens.abrir': { area: 'Comunidade', label: 'Abriu as mensagens' },
  'mensagens.enviar': { area: 'Comunidade', label: 'Mandou mensagem' },
  'eventos.awards': { area: 'Eventos e Álbum', label: 'Abriu o WinnerZ Awards' },
  'awards.voto': { area: 'Eventos e Álbum', label: 'Votou no Awards' },
};

const PREFIX: [string, string, string][] = [
  ['jornada.estado.', 'Jornada', 'Mudou o estado para'],
  ['jornada.feito.', 'Jornada', 'Marcou o feito'],
  ['sessao.intencao.', 'Sessão', 'Intenção da sessão'],
  ['oqj.filtro.', 'O que jogar', 'Clima escolhido'],
  ['oqj.jogar.', 'O que jogar', 'Jogou a sugestão'],
  ['oqj.extra.', 'O que jogar', 'Filtro extra'],
  ['oqj.nao-agora.', 'O que jogar', '"Agora não"'],
  ['oqj.nao-combina.', 'O que jogar', '"Não combina"'],
  ['ponte.', 'Integrações', 'Sessão vinda de'],
];

/** Nome legível e área de um recurso contado. */
export function usageLabel(event: string): UsageLabel {
  if (event.startsWith('pagina.')) {
    const k = event.slice(7);
    return { area: 'Visitas por área', label: PAGES[k] ?? (k.startsWith('@') ? 'Perfis públicos' : k) };
  }
  const exact = EXACT[event];
  if (exact) return exact;
  for (const [p, area, label] of PREFIX) if (event.startsWith(p)) return { area, label: `${label}: ${event.slice(p.length).replace(/[.-]/g, ' ')}` };
  return { area: 'Outros', label: event };
}

/** A seção visitada, sem nada que identifique alguém: perfis viram "perfil", trechos viram "trecho". */
export function pageEvent(path: string): string {
  const seg = path.split('?')[0].split('#')[0].split('/')[1] || 'inicio';
  if (seg.startsWith('@')) return 'pagina.perfil';
  if (seg === 't') return 'pagina.trecho';
  return `pagina.${seg.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'outra'}`;
}
