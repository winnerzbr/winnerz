/**
 * IAmiguinho, fase 1 (sem IA): as falas escritas por nós, as poses e caras de cada momento, o modo escolhido nas
 * Preferências e o portão dos cameos (no máximo um por dia no modo Normal, um por semana no Discreto, e cada motivo
 * com o seu intervalo). A ficha do personagem é o documento "IAmiguinho — ficha do personagem".
 * Regras da voz: humor de incompetência, sempre dele; fatos só os que o site tem; até ~140 caracteres; sem palavrão.
 */
import { getState } from '../data/store';

export type IamigModo = 'normal' | 'discreto' | 'chamar' | 'desativado';
export const MODOS: { id: IamigModo; label: string; desc: string }[] = [
  { id: 'normal', label: 'Normal', desc: 'Aparece de vez em quando, em momentos especiais, e nas telas vazias e de erro.' },
  { id: 'discreto', label: 'Discreto', desc: 'Só nos marcos mais importantes, como o primeiro jogo zerado. Nas telas vazias e de erro, continua.' },
  { id: 'chamar', label: 'Só quando eu chamar', desc: 'Não aparece sozinho. Responde quando você mencionar @iamiguinho (em breve). Nas telas vazias e de erro, continua.' },
  { id: 'desativado', label: 'Desativado', desc: 'Não aparece em lugar nenhum. As telas vazias e de erro mostram só o texto.' },
];
export const modoAtual = (): IamigModo => (getState().prefs.iamiguinho ?? 'normal') as IamigModo;

/** Momentos de interface: ele ocupa o lugar do conteúdo que ainda não existe. */
export type Interface = 'jornada-vazia' | 'colecao-vazia' | 'listas-vazias' | 'radar-vazio' | 'avisos-vazios' | 'busca-vazia' | 'nao-encontrada' | 'erro' | 'carregando';
/** Cameos: aparecem sozinhos, num balão no canto. */
export type Cameo = 'indeciso' | 'voltou' | 'primeiro-zerado' | 'radar' | 'cofre';

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
  ],
  'primeiro-zerado': [
    'Primeira história no mural! A minha ainda está no tutorial, mas a sua vai ganhar moldura.',
    'Zerou! Eu sabia que você conseguia. Quer dizer... eu esperava. Sabia é uma palavra forte.',
  ],
  radar: [
    'Lançamento chegando. Eu já separei o lanche.',
    'Mais um jogo para esperar. Minha especialidade.',
  ],
  cofre: ['Coleção grande, hein? Eu só tenho um cartucho, e é de hélice.'],
};

/** A pose de corpo inteiro de cada momento de interface (public/brand/iamiguinho/pose-*.webp). */
export const POSE: Record<Interface, string> = {
  'jornada-vazia': 'placa', 'colecao-vazia': 'acenando', 'listas-vazias': 'placa', 'radar-vazio': 'planando', 'avisos-vazios': 'dormindo',
  'busca-vazia': 'mapa', 'nao-encontrada': 'mapa', erro: 'cabo', carregando: 'planando',
};
/** A cara (cabeça 3D com a expressão) de cada cameo (public/brand/iamiguinho/cara-*.webp). */
export const CARA: Record<Cameo, string> = { indeciso: 'pensando', voltou: 'feliz', 'primeiro-zerado': 'comemorando', radar: 'curioso', cofre: 'surpreso' };
export const posePath = (p: string) => `/brand/iamiguinho/pose-${p}.webp`;
export const caraPath = (c: string) => `/brand/iamiguinho/cara-${c}.webp`;

export const sortear = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

/* ---- Portão dos cameos ---------------------------------------------------------------------------------------- */
const KEY = 'wz.iamiguinho.v1';
const DIA = 86400000;
/** Intervalo mínimo de cada motivo, em dias. */
const INTERVALO: Record<Cameo, number> = { indeciso: 1, voltou: 7, 'primeiro-zerado': 36500, radar: 3, cofre: 30 };
const MARCO: Partial<Record<Cameo, true>> = { 'primeiro-zerado': true };
let mostrouNestaVisita = false;

function ler(): Record<string, number> { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; } }

/**
 * Decide se o cameo aparece agora e, se sim, marca o horário. Uma decisão por chamada; quem chama guarda o resultado.
 * Normal: um cameo por dia; Discreto: só marcos, um por semana; Só quando chamar e Desativado: nenhum.
 */
export function liberarCameo(motivo: Cameo, escopo = ''): boolean {
  const modo = modoAtual();
  if (modo === 'chamar' || modo === 'desativado') return false;
  if (modo === 'discreto' && !MARCO[motivo]) return false;
  if (mostrouNestaVisita) return false;
  const visto = ler(); const agora = Date.now(); const k = `${motivo}${escopo ? `:${escopo}` : ''}`;
  if (visto[k] && agora - visto[k] < INTERVALO[motivo] * DIA) return false;
  const geral = visto['_ultimo'] ?? 0;
  if (!MARCO[motivo] && agora - geral < (modo === 'discreto' ? 6.5 : 0.8) * DIA) return false;
  visto[k] = agora; visto['_ultimo'] = agora; mostrouNestaVisita = true;
  try { localStorage.setItem(KEY, JSON.stringify(visto)); } catch { /* sem memória: pode aparecer de novo, tudo bem */ }
  return true;
}
