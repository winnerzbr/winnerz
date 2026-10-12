import { starFill } from '../lib/rating';

/** Cinco estrelas com preenchimento proporcional — 4,25 aparece como 4,25. */
export function Stars({ normalized, size = 18 }: { normalized: number; size?: number }) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-hidden="true">
      <span className="off">★★★★★</span>
      <span className="on" style={{ width: `${starFill(normalized)}%` }}>★★★★★</span>
    </span>
  );
}
