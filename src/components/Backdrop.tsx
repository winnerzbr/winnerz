import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import type { Game } from '../data/types';
import { backdropCandidates, knownVerdict, measure } from '../lib/backdrop';

/** Fundo do jogo: a escolha da pessoa, ou a primeira imagem que não seja quase toda preta. */
export function useBackdrop(g?: Game | null): string | undefined {
  const chosen = useStore((s) => (g ? s.prefs.backdrops?.[g.id] : undefined));
  const list = useMemo(() => backdropCandidates(g), [g]);
  const [, bump] = useState(0);
  const pick = chosen ?? list.find((u) => knownVerdict(u) !== 0);
  useEffect(() => {
    if (chosen || !pick || knownVerdict(pick) !== undefined) return;
    let alive = true;
    measure(pick).then((v) => { if (alive && v === 0) bump((n) => n + 1); });
    return () => { alive = false; };
  }, [chosen, pick]);
  return pick ?? g?.cover;
}

/** <img> com o fundo do jogo (nada, se o jogo não tem imagem nenhuma). */
export function Backdrop({ game, className }: { game?: Game | null; className?: string }) {
  const src = useBackdrop(game);
  return src ? <img className={className} src={src} alt="" /> : null;
}
