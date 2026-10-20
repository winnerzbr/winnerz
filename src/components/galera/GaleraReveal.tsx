/**
 * Depois de abrir um pacote: às vezes vem +1 da Galera (o de boas-vindas sempre traz, se houver alguém). O sorteio é
 * do banco, uma vez por pacote; aqui é só a apresentação: "Você conheceu @fulano".
 */
import { useEffect, useState } from 'react';
import { Link } from '../../lib/router';
import { GaleraCard } from './GaleraCard';
import { GaleraSheet } from './GaleraSection';
import { galeraApi, type GaleraCard as Card } from '../../data/galeraApi';
import { burst, GOLD, sfx } from '../album/fx';

export function GaleraReveal({ packId, welcome }: { packId: string; welcome: boolean }) {
  const [card, setCard] = useState<Card | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      galeraApi.roll(packId, welcome).then((c) => {
        if (!alive || !c) return;
        setCard(c); sfx('inc');
        requestAnimationFrame(() => { const el = document.querySelector('.glr-reveal'); if (el) { const r = el.getBoundingClientRect(); burst(r.left + 60, r.top + r.height / 2, GOLD, 26, 4); } });
      }).catch(() => { /* a Galera nunca atrapalha o pacote */ });
    }, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [packId, welcome]);
  if (!card) return null;
  return (
    <>
      <div className="glr-reveal" role="status">
        <button type="button" className="glr-reveal__card" onClick={() => setOpen(true)} aria-label="Ver a figurinha" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <GaleraCard card={card} still />
        </button>
        <div className="glr-reveal__text">
          <span className="alb-kick">+1 da Galera</span>
          <b>Você conheceu @{card.handle}</b>
          <span className="muted" style={{ fontSize: 14 }}>Ela já está em Álbum → Galera.</span>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setOpen(true)}>Ver a figurinha</button>
            <Link className="btn quiet sm" to={`/@${card.handle}`}>Ver o perfil</Link>
          </div>
        </div>
      </div>
      {open && <GaleraSheet card={card} onClose={() => setOpen(false)} />}
    </>
  );
}
