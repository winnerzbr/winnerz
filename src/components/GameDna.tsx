import type { Game } from '../data/types';
import { useStore } from '../data/store';
import { gameDna, PROVENANCE_LABEL } from '../lib/dna';

const ICON: Record<string, string> = { curtas: '◔', reaprender: '↺', retomar: '↻', historia: '❝', junto: '⚇', sozinho: '◉', aberto: '◎', terror: '☾', duracao: '◷' };

/** "Como é jogar": o DNA de experiência, com a origem de cada linha à vista. */
export function GameDna({ game }: { game: Game }) {
  const s = useStore((x) => x);
  const dna = gameDna(game, s);
  if (!dna.traits.length) return null;
  return (
    <section aria-labelledby="dna" className="side-card dna">
      <h2 id="dna" className="kicker">Como é jogar</h2>
      <ul className="dna__list">
        {dna.traits.map((t) => (
          <li key={t.key} className="dna__item">
            <span className="dna__ic" aria-hidden="true">{ICON[t.key]}</span>
            <div>
              <div className="dna__label">{t.label} <span className={`prov prov--${t.source}`} title={t.source === 'inferido' ? 'Deduzido pelo WinnerZ a partir de gênero, tema e modo' : t.source === 'igdb' ? 'Dado da ficha do IGDB' : 'Informado por você'}>{PROVENANCE_LABEL[t.source]}</span></div>
              <div className="muted dna__detail">{t.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="faint dna__note">Para ajudar a escolher o momento, não para julgar o jogo.</p>
    </section>
  );
}
