/**
 * Desafio semanal sem punição: um convite leve por semana (segunda a domingo, horário de Brasília), escolhido
 * a partir do que você tem e registra. Feito ou não, nada acontece: sem pontos, sem sequência, sem aviso de
 * "perdeu". Dá para trocar ou pular. Sem React e sem a store, para testar.
 */
import type { ID, State } from '../data/types';

const TZ = 'America/Sao_Paulo';
const DAY = 86_400_000;
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** A segunda-feira da semana (YYYY-MM-DD), que serve de nome da semana. */
export function weekOf(now = new Date()): string {
  const day = ymd(now);
  const noon = new Date(`${day}T12:00:00Z`);
  const wd = (noon.getUTCDay() + 6) % 7; // segunda = 0
  return ymd(new Date(noon.getTime() - wd * DAY));
}
/** O dia (YYYY-MM-DD) está nesta semana? */
export const inWeek = (iso: string | undefined, week: string) => {
  if (!iso) return false;
  const d = ymd(new Date(iso));
  const end = ymd(new Date(Date.parse(`${week}T12:00:00Z`) + 6 * DAY));
  return d >= week && d <= end;
};

export type ChallengeId = 'pausado' | 'antigo' | 'perto' | 'nunca' | 'momento' | 'recado' | 'companhia' | 'objetivo' | 'descanso';
export interface WeeklyPick { week: string; id: ChallengeId; target?: ID; skipped?: boolean; swaps?: number; doneAt?: string }
export interface Challenge { id: ChallengeId; title: string; hint: string; target?: ID }

const lastSessionAt = (s: State, journeyId: ID) => s.sessions.filter((x) => x.journeyId === journeyId).reduce((m, x) => (x.startedAt > m ? x.startedAt : m), '');

/** Os convites que fazem sentido para você agora, cada um com o jogo-alvo quando tem. */
export function candidates(s: State, now = new Date()): Challenge[] {
  const title = (journeyId: ID) => { const j = s.journeys.find((x) => x.id === journeyId); return (j && s.games[j.gameId]?.title) || 'um jogo'; };
  const out: Challenge[] = [];
  const paused = s.histories.filter((h) => h.state === 'pausada').sort((a, b) => lastSessionAt(s, b.journeyId).localeCompare(lastSessionAt(s, a.journeyId)));
  if (paused[0]) out.push({ id: 'pausado', target: paused[0].journeyId, title: `Uma sessão de ${title(paused[0].journeyId)}`, hint: 'Ele está pausado. Uma sessão curta já conta, e se não der vontade, ele continua esperando.' });
  const active = s.histories.filter((h) => h.state === 'ativa');
  const old = active.map((h) => ({ h, last: lastSessionAt(s, h.journeyId) || h.startedAt })).filter((x) => now.getTime() - Date.parse(x.last) > 30 * DAY).sort((a, b) => a.last.localeCompare(b.last))[0];
  if (old) out.push({ id: 'antigo', target: old.h.journeyId, title: `Voltar a ${title(old.h.journeyId)}`, hint: 'Faz mais de um mês. O cartão "Você parou em…" ajuda a lembrar onde estava.' });
  const near = active.filter((h) => (h.progress ?? 0) >= 70 && (h.progress ?? 0) < 100).sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0];
  if (near) out.push({ id: 'perto', target: near.journeyId, title: `Chegar mais perto do fim de ${title(near.journeyId)}`, hint: `Você está em ${near.progress}%. Uma sessão nele nesta semana.` });
  const started = new Set(s.journeys.map((j) => j.gameId));
  if (s.copies.some((c) => !started.has(c.gameId))) out.push({ id: 'nunca', title: 'Começar um jogo da estante que você nunca jogou', hint: 'Vinte minutos bastam para conhecer. Se não encaixar, tudo bem largar.' });
  out.push({ id: 'momento', title: 'Guardar um momento com foto', hint: 'Uma cena bonita, um chefe vencido, uma tela engraçada.' });
  out.push({ id: 'recado', title: 'Deixar um recado para a próxima vez', hint: 'Ao fechar uma sessão, escreva onde parou ou o que quer fazer depois.' });
  out.push({ id: 'objetivo', title: 'Cumprir um objetivo pequeno', hint: 'Ao abrir a sessão, escolha um objetivo curto. Ao fechar, marque se cumpriu.' });
  out.push({ id: 'descanso', title: 'Uma sessão só para descansar', hint: 'Escolha "Descansar" ao abrir a sessão e jogue sem compromisso.' });
  if (s.sessions.some((x) => x.companions?.length)) out.push({ id: 'companhia', title: 'Jogar com alguém', hint: 'Ao fechar a sessão, diga com quem jogou.' });
  return out;
}

const hash = (x: string) => { let h = 2166136261; for (const c of x) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Escolhe o convite da semana. Evita repetir o da semana anterior; "trocar" pula para o próximo da lista. */
export function pickWeekly(s: State, week: string, swaps = 0, avoid?: ChallengeId, now = new Date()): Challenge {
  const list = candidates(s, now).filter((c) => c.id !== avoid);
  const pool = list.length ? list : candidates(s, now);
  return pool[(hash(week) + swaps) % pool.length];
}

/** Já cumpriu nesta semana? Tudo sai do que foi registrado. */
export function isDone(s: State, pick: WeeklyPick): boolean {
  const ses = s.sessions.filter((x) => x.endedAt && inWeek(x.startedAt, pick.week));
  switch (pick.id) {
    case 'pausado': case 'antigo': case 'perto': return ses.some((x) => x.journeyId === pick.target);
    case 'nunca': return s.histories.some((h) => h.ordinal === 1 && inWeek(h.startedAt, pick.week) && (!h.startedPrecision || h.startedPrecision === 'dia'));
    case 'momento': return s.events.some((e) => e.kind === 'momento' && !!e.image && inWeek(e.at, pick.week));
    case 'recado': return ses.some((x) => !!x.note?.trim());
    case 'companhia': return ses.some((x) => !!x.companions?.length);
    case 'objetivo': return ses.some((x) => !!x.goal && x.goalDone === 'sim');
    case 'descanso': return ses.some((x) => x.intent === 'descansar');
  }
}

/** O convite (texto e alvo) de uma escolha já guardada. */
export function describe(s: State, pick: WeeklyPick, now = new Date()): Challenge | null {
  const all = candidates(s, now);
  const same = all.find((c) => c.id === pick.id && (!pick.target || c.target === pick.target));
  if (same) return same;
  // O alvo mudou de estado (ex.: o pausado voltou a andar): mantém o convite com o mesmo jogo.
  const j = pick.target ? s.journeys.find((x) => x.id === pick.target) : undefined;
  const t = j ? s.games[j.gameId]?.title : undefined;
  if (pick.target && t) return { id: pick.id, target: pick.target, title: pick.id === 'perto' ? `Chegar mais perto do fim de ${t}` : pick.id === 'antigo' ? `Voltar a ${t}` : `Uma sessão de ${t}`, hint: 'O convite desta semana.' };
  return all.find((c) => c.id === pick.id) ?? null;
}
