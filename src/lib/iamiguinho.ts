/**
 * IAmiguinho: as falas escritas por nós (com lacunas para fatos, como {jogo} e {dias}), as poses e caras de cada
 * momento, o modo escolhido nas Preferências e o portão dos cameos (no máximo um por dia no modo Normal, um por
 * semana no Discreto, e cada motivo com o seu intervalo). Fase 2 (M4): nos cameos de jogo zerado e de Retomada, a
 * fala pode vir da IA pela /api/iamiguinho, que confere o intervalo em todos os aparelhos; se não vier, a biblioteca.
 * A ficha do personagem é o documento "IAmiguinho — ficha do personagem".
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

export { FALAS, preencher, falaDaBiblioteca, sortear } from './iamiguinhoFalas';
export type { Interface, Cameo, Fatos } from './iamiguinhoFalas';
import type { Interface, Cameo, Fatos } from './iamiguinhoFalas';
import { falaDaBiblioteca } from './iamiguinhoFalas';

/** A pose de corpo inteiro de cada momento de interface (public/brand/iamiguinho/pose-*.webp). */
export const POSE: Record<Interface, string> = {
  'jornada-vazia': 'placa', 'colecao-vazia': 'acenando', 'listas-vazias': 'placa', 'radar-vazio': 'planando', 'avisos-vazios': 'dormindo',
  'busca-vazia': 'mapa', 'nao-encontrada': 'mapa', erro: 'cabo', carregando: 'planando',
};
/** A cara (cabeça 3D com a expressão) de cada cameo (public/brand/iamiguinho/cara-*.webp). */
export const CARA: Record<Cameo, string> = { indeciso: 'pensando', voltou: 'feliz', 'primeiro-zerado': 'comemorando', zerado: 'comemorando', radar: 'curioso', cofre: 'surpreso' };
export const posePath = (p: string) => `/brand/iamiguinho/pose-${p}.webp`;
export const caraPath = (c: string) => `/brand/iamiguinho/cara-${c}.webp`;

/* ---- Portão dos cameos ---------------------------------------------------------------------------------------- */
const KEY = 'wz.iamiguinho.v1';
const DIA = 86400000;
/** Intervalo mínimo de cada motivo, em dias. */
export const INTERVALO: Record<Cameo, number> = { indeciso: 1, voltou: 7, 'primeiro-zerado': 36500, zerado: 36500, radar: 3, cofre: 30 };
/** Marcos: os únicos que aparecem no modo Discreto. */
export const MARCO: Partial<Record<Cameo, true>> = { 'primeiro-zerado': true };
/** Momentos que a pessoa acabou de viver: furam o "um por visita" e o intervalo geral (cada um continua com o seu). */
export const ESPECIAL: Partial<Record<Cameo, true>> = { 'primeiro-zerado': true, zerado: true };
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
  if (mostrouNestaVisita && !ESPECIAL[motivo]) return false;
  const visto = ler(); const agora = Date.now(); const k = `${motivo}${escopo ? `:${escopo}` : ''}`;
  if (visto[k] && agora - visto[k] < INTERVALO[motivo] * DIA) return false;
  const geral = visto['_ultimo'] ?? 0;
  if (!ESPECIAL[motivo] && agora - geral < (modo === 'discreto' ? 6.5 : 0.8) * DIA) return false;
  visto[k] = agora; visto['_ultimo'] = agora; mostrouNestaVisita = true;
  try { localStorage.setItem(KEY, JSON.stringify(visto)); } catch { /* sem memória: pode aparecer de novo, tudo bem */ }
  return true;
}

/* ---- Fase 2: a fala da IA nos cameos da Jornada ---------------------------------------------------------------- */
const RECENTES = 'wz.iamiguinho.falas';
function recentes(): string[] { try { const v = JSON.parse(localStorage.getItem(RECENTES) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 8) : []; } catch { return []; } }
function lembrar(fala: string) { try { localStorage.setItem(RECENTES, JSON.stringify([fala, ...recentes().filter((x) => x !== fala)].slice(0, 8))); } catch { /* tudo bem */ } }

/**
 * Pede a fala de um cameo da Jornada. Primeiro o portão deste aparelho (modo, visita, intervalos); com login, a
 * /api/iamiguinho confere o intervalo nos outros aparelhos e tenta a fala da IA, já checada. Se o servidor disser que
 * outro aparelho já mostrou, nada aparece; se ele não responder, entra a biblioteca.
 */
export async function pedirCameo(motivo: Cameo, escopo: string, fatos: Fatos): Promise<string | null> {
  if (!liberarCameo(motivo, escopo)) return null;
  const evitar = recentes();
  let fala: string | null = null;
  if (getState().mode === 'supabase') {
    try {
      const { accessToken } = await import('../data/supabaseAdapter');
      const token = await accessToken();
      if (token) {
        const r = await fetch('/api/iamiguinho', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ motivo, escopo, fatos, recentes: evitar }) });
        if (r.ok) {
          const j = (await r.json()) as { mostrar?: boolean; fala?: string | null };
          if (j.mostrar === false) return null;
          fala = typeof j.fala === 'string' && j.fala ? j.fala : null;
        }
      }
    } catch { /* sem servidor: biblioteca */ }
  }
  fala ??= falaDaBiblioteca(motivo, fatos, evitar);
  lembrar(fala);
  return fala;
}

/** A comemoração da sessão leva para a Jornada; o parabéns do IAmiguinho vai junto, uma vez. */
let zeradoPendente: string | null = null;
export const marcarZerado = (historyId: string) => { zeradoPendente = historyId; };
/** Lido ao abrir a Jornada (o modo estrito do React pode ler duas vezes seguidas; por isso some só depois). */
export const consumirZerado = (): string | null => {
  const v = zeradoPendente;
  if (v) setTimeout(() => { if (zeradoPendente === v) zeradoPendente = null; }, 0);
  return v;
};
