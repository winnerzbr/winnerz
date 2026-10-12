/**
 * Celebração em escala: o tamanho da festa acompanha o tamanho do feito, e o tom é escolha da pessoa.
 * Tranquila (sóbria), Encorajadora (calorosa) ou Bem-humorada (com piada leve). Nada de cobrança, streak ou ranking.
 */
import type { Tone } from '../data/types';

export const TONES: { id: Tone; label: string; desc: string; sample: string }[] = [
  { id: 'tranquila', label: 'Tranquila', desc: 'Sóbria e curta. Registra sem alarde.', sample: 'Momento guardado.' },
  { id: 'encorajadora', label: 'Encorajadora', desc: 'Calorosa, comemora com você.', sample: 'Que momento! Guardado na sua linha do tempo.' },
  { id: 'bem-humorada', label: 'Bem-humorada', desc: 'Com uma piada leve de vez em quando.', sample: 'Print tirado. O fotógrafo oficial da party agradece.' },
];

type Kind = 'momento' | 'ponto' | 'sessao' | 'primeira' | 'metade' | 'dez' | 'zerou' | 'zerouSub' | 'retomou';

const BANK: Record<Kind, Record<Tone, string[]>> = {
  momento: {
    tranquila: ['Momento guardado.'],
    encorajadora: ['Que momento! Guardado na sua linha do tempo.', 'Guardado. Esse vai ser bom de rever.'],
    'bem-humorada': ['Print tirado. O fotógrafo oficial da party agradece.', 'Guardado. Seu eu do futuro vai dizer “lembro disso!”.'],
  },
  ponto: {
    tranquila: ['Ponto para voltar criado.'],
    encorajadora: ['Ponto criado. Ele te espera na retomada.'],
    'bem-humorada': ['Ponto marcado. Nem o mapa do jogo é tão organizado.'],
  },
  sessao: {
    tranquila: ['Sessão registrada.'],
    encorajadora: ['Boa sessão! Está tudo guardado para a próxima.'],
    'bem-humorada': ['Sessão salva. Diferente de certos jogos, sem checkpoint perdido.'],
  },
  primeira: {
    tranquila: ['Primeira sessão registrada.'],
    encorajadora: ['Começou! A primeira sessão desta História está guardada.'],
    'bem-humorada': ['Primeira sessão: o tutorial ficou para trás (ou não).'],
  },
  metade: {
    tranquila: ['Metade do caminho, pelo seu progresso.'],
    encorajadora: ['Metade do caminho! Daqui para frente é história.'],
    'bem-humorada': ['Metade do caminho. O resto é ladeira abaixo (ou chefe).'],
  },
  dez: {
    tranquila: ['Dez sessões nesta História.'],
    encorajadora: ['Dez sessões! Essa História já é sua.'],
    'bem-humorada': ['Dez sessões. A essa altura, o jogo já sabe seu nome.'],
  },
  zerou: {
    tranquila: ['História concluída'],
    encorajadora: ['Você chegou ao fim!'],
    'bem-humorada': ['Créditos rolando!'],
  },
  zerouSub: {
    tranquila: ['Fica guardada com todas as outras.'],
    encorajadora: ['Cada sessão contou. Esta História agora é parte da sua coleção de memórias.'],
    'bem-humorada': ['Pode largar o controle. Ou não: tem pós-jogo?'],
  },
  retomou: {
    tranquila: ['De volta à História.'],
    encorajadora: ['Que bom te ver de volta!'],
    'bem-humorada': ['Ele sentiu sua falta. Os inimigos, nem tanto.'],
  },
};

/** Uma frase do tom escolhido (a mesma para a mesma semente, para não trocar ao redesenhar). */
export function say(kind: Kind, tone: Tone = 'encorajadora', seed = 0): string {
  const list = BANK[kind][tone] ?? BANK[kind].encorajadora;
  return list[Math.abs(seed) % list.length];
}
