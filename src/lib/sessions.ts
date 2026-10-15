/** Regras puras das sessões (sem a store, para testar sem navegador). */

/** Duração da sessão pelo começo e pelo fim (igual ao banco): até 10 h; mais de 12 h fica sem duração (provavelmente esquecida). */
export function sessionMinutes(startIso: string, endIso: string): number | undefined {
  const m = (Date.parse(endIso) - Date.parse(startIso)) / 60000;
  if (!Number.isFinite(m) || m < 0 || m > 720) return undefined;
  return Math.max(1, Math.min(600, Math.round(m)));
}

export const NOT_FIT = 'Não encaixou';

/** As três últimas sessões fechadas "não encaixaram"? Devolve a última delas (para lembrar a dispensa). */
export function notFitStreak<T extends { id: string; startedAt: string; endedAt?: string; feeling?: string }>(sessions: T[]): T | null {
  const done = sessions.filter((x) => x.endedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-3);
  return done.length === 3 && done.every((x) => x.feeling === NOT_FIT) ? done[2] : null;
}
