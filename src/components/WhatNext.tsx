import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import type { Game } from '../data/types';
import type { Hit } from './AddGameDialog';
import { CoverArt } from './CoverArt';
import { fetchUniverse, relationTag } from './GameUniverse';
import { ideasFor } from './WhatToPlay';

type Pick = { key: string; to: string; cover: { title: string; cover: string }; title: string; why: string; tag?: string | null };

/**
 * "E agora?": depois de zerar, duas ideias com o porquê (a continuação da série e algo da
 * sua estante). Nada obrigatório: "Nada por enquanto" fecha a celebração.
 */
export function WhatNext({ game, onPick }: { game: Game; onPick?: () => void }) {
  const s = useStore((x) => x);
  const [next, setNext] = useState<(Hit & { later: boolean }) | null>(null);
  useEffect(() => {
    if (!game.igdbId) return;
    let alive = true;
    fetchUniverse(game.igdbId).then((u) => {
      if (!alive || !u) return;
      const series = u.groups.find((g) => g.title === 'Da mesma série')?.games ?? [];
      // O próximo depois deste que você ainda não zerou; sem ano, fica por último.
      const open = series.filter((h) => h.slug !== game.slug && h.igdbId !== game.igdbId && relationTag(s, h) !== 'Zerado');
      const after = open.filter((h) => !game.year || !h.year || h.year >= game.year).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
      // Sem continuação pendente: o mais antigo da série que você ainda não jogou.
      const before = open.filter((h) => game.year && h.year && h.year < game.year).sort((a, b) => a.year! - b.year!);
      setNext(after[0] ? { ...after[0], later: true } : before[0] ? { ...before[0], later: false } : null);
    });
    return () => { alive = false; };
  }, [game.igdbId]); // eslint-disable-line react-hooks/exhaustive-deps

  const picks = useMemo(() => {
    const out: Pick[] = [];
    if (next) {
      const tag = relationTag(s, next);
      out.push({ key: 'serie', to: `/jogos/${next.slug}`, cover: next, title: next.title, tag, why: `${next.later ? 'Continua a série' : 'É da mesma série e veio antes; você ainda não zerou'}${tag === 'Na estante' ? ', e já está na sua estante' : tag === 'Desejo' ? ', e está nos seus Desejos' : ''}.` });
    }
    const idea = ideasFor(s, 1).find((i) => i.game.id !== game.id && i.game.slug !== next?.slug);
    if (idea) out.push({ key: 'estante', to: `/jogos/${idea.game.slug}`, cover: idea.game, title: idea.game.title, why: idea.why[0] });
    return out;
  }, [s, next, game.id]);

  if (!picks.length) return null;
  return (
    <section className="whatnext" aria-labelledby="eagora">
      <h3 id="eagora" className="t whatnext__h">E agora?</h3>
      <ul className="whatnext__list">
        {picks.map((p) => (
          <li key={p.key}>
            <Link to={p.to} className="whatnext__item" onClick={onPick}>
              <span className="whatnext__cover"><CoverArt game={p.cover} /></span>
              <span className="whatnext__text"><strong>{p.title}</strong><span>{p.why}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
