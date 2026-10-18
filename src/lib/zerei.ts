/**
 * "Zerei" pede um segundo toque só quando o registro parece engano: pouco tempo jogado e pouco progresso.
 * A palavra da pessoa continua valendo; isto só evita uma festa por um toque sem querer.
 */
export const ZEREI_MIN_MINUTOS = 60;
export const ZEREI_MIN_PROGRESSO = 20;

export function zereiPedeConfirmacao(minutosJogados: number, progresso: number | undefined): boolean {
  return minutosJogados < ZEREI_MIN_MINUTOS && (progresso ?? 0) < ZEREI_MIN_PROGRESSO;
}

/** Minutos informados nas sessões de uma História (as sem duração não contam). */
export function minutosDaHistoria(sessions: { historyId: string; minutes?: number }[], historyId: string): number {
  return sessions.reduce((t, x) => (x.historyId === historyId ? t + (x.minutes ?? 0) : t), 0);
}
