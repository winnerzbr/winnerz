/**
 * +1 da Galera no pacote aberto: a figurinha entra embaixo da fileira das cinco, menor, como um extra. O sorteio é do
 * banco (uma vez por pacote); aqui é só a cena. Tocar abre a ficha (frente, verso, perfil).
 */
import { useEffect, useRef, useState } from 'react';
import { GaleraCard } from './GaleraCard';
import { GaleraSheet } from './GaleraSection';
import type { GaleraCard as Card } from '../../data/galeraApi';
import { burst, GOLD, sfx } from '../album/fx';

export function GaleraExtra({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    sfx('inc');
    const t = setTimeout(() => { const r = ref.current?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height * 0.4, GOLD, 26, 4); }, 450);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <button ref={ref} type="button" className="pk__extra" onClick={() => setOpen(true)} aria-label={`Extra da Galera: você conheceu @${card.handle}. Toque para ver`}>
        <span className="pk__extra-tag">+1 da Galera</span>
        <GaleraCard card={card} still />
        <span className="pk__extra-cap">Você conheceu <b>@{card.handle}</b></span>
      </button>
      {open && <GaleraSheet card={card} onClose={() => setOpen(false)} />}
    </>
  );
}
