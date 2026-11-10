import { useMemo } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { nesteDia, lembraDisso, type Lembranca } from '../lib/memory';
import { whenLabel } from '../lib/dates';
import type { ID } from '../data/types';

function Cartao({ l, rotulo, classe }: { l: Lembranca; rotulo: string; classe: string }) {
  const generico = /^(momento guardado|momento|ponto para voltar)$/i.test(l.title);
  return (
    <Link to={l.to} className={`lemb ${classe}${l.image ? ' has-img' : ''}`}>
      {l.image && <span className="lemb__foto"><img src={l.image} alt="" loading="lazy" /></span>}
      <span className="lemb__b">
        <span className="kicker kicker--now">{rotulo}</span>
        <strong className="lemb__t">{generico ? l.game.title : l.title}</strong>
        <span className="lemb__m">{[generico ? null : l.game.title, whenLabel(l.at, 'dia')].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="lemb__go" aria-hidden="true">Ver na linha do tempo →</span>
    </Link>
  );
}

/** "Neste dia · há 1 mês": aparece só quando existe uma lembrança neste mesmo dia. Com journeyId, só daquele jogo. */
export function NesteDia({ journeyId }: { journeyId?: ID }) {
  const s = useStore((x) => x);
  const l = useMemo(() => nesteDia(s, Date.now(), journeyId), [s, journeyId]);
  return l ? <Cartao l={l} rotulo={`Neste dia · ${l.quando.toLowerCase()}`} classe="lemb--dia" /> : null;
}

/** "Lembra disso?": uma foto antiga, trocada uma vez por dia. */
export function LembraDisso() {
  const s = useStore((x) => x);
  const l = useMemo(() => lembraDisso(s), [s]);
  return l ? <Cartao l={l} rotulo={`Lembra disso? · ${l.quando.toLowerCase()}`} classe="lemb--foto" /> : null;
}
