import type { Feat, FeatKind } from '../data/types';

/** Os feitos que um jogador conta além de "zerei", na ordem em que aparecem. Platina e 100% primeiro. */
export const FEATS: { kind: FeatKind; label: string; badge: string; milestone: string; detail?: string }[] = [
  { kind: 'platina', label: 'Platinei', badge: 'Platina', milestone: 'Platinou' },
  { kind: 'cem', label: '100%', badge: '100%', milestone: 'Fez 100%' },
  { kind: 'dificil', label: 'No difícil', badge: 'Difícil', milestone: 'Zerou no difícil' },
  { kind: 'finais', label: 'Todos os finais', badge: 'Todos os finais', milestone: 'Viu todos os finais' },
  { kind: 'ngplus', label: 'NG+', badge: 'NG+', milestone: 'Zerou o NG+' },
  { kind: 'semmorrer', label: 'Sem morrer', badge: 'Sem morrer', milestone: 'Zerou sem morrer' },
  { kind: 'speedrun', label: 'Speedrun', badge: 'Speedrun', milestone: 'Speedrun', detail: 'Tempo (ex.: 1:42:10)' },
];

export const featInfo = (kind: FeatKind) => FEATS.find((f) => f.kind === kind)!;

/** Texto curto do feito para listas: "Platina", "Speedrun 1:42:10". */
export const featBadge = (f: Feat) => [featInfo(f.kind).badge, f.detail].filter(Boolean).join(' ');

/** Feitos na ordem da lista, sem repetir tipo. */
export const sortFeats = (feats: Feat[] | undefined): Feat[] => {
  const seen = new Set<FeatKind>();
  return FEATS.flatMap((d) => (feats ?? []).filter((f) => f.kind === d.kind && !seen.has(f.kind) && seen.add(f.kind)));
};

/** Tempo de speedrun: aceita "1:42:10", "42:10" ou "42m"; devolve normalizado ou null se não der para entender. */
export function speedrunTime(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return null;
  const hms = t.match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?(?:\.(\d{1,3}))?$/);
  if (hms) return t;
  const unit = t.match(/^(?:(\d{1,3})h)?(?:(\d{1,2})m(?:in)?)?(?:(\d{1,2})s)?$/);
  if (unit && (unit[1] || unit[2] || unit[3])) {
    const [h, m, s] = [unit[1], unit[2], unit[3]].map((x) => Number(x ?? 0));
    const p = (n: number) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
  }
  return null;
}
