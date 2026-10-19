/** Presença opcional: o selo "online/jogando" e o quadro "Amigos agora". */
import { Link } from '../lib/router';
import { useFriendsNow, type Presence } from '../data/presenceApi';
import { PersonAvatar } from './Posts';
import { CoverArt } from './CoverArt';
import { useStore } from '../data/store';
import { FEATURES } from '../lib/features';

const since = (iso?: string) => { if (!iso) return ''; const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000)); return m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h`; };
const VIA: Record<string, string> = { steam: 'pela Steam', ra: 'pelo RetroAchievements', playnite: 'pelo Playnite' };

export function PresencePill({ p }: { p: Presence | null }) {
  if (!p || (!p.online && !p.game)) return null;
  return (
    <span className={`presence-pill${p.game ? ' is-playing' : ''}`}>
      <span className="presence-pill__dot" aria-hidden="true" />
      {p.game ? <>Jogando {p.game.slug ? <Link to={`/jogos/${p.game.slug}`}>{p.game.title}</Link> : p.game.title}{p.game.via && VIA[p.game.via] ? ` ${VIA[p.game.via]}` : ''}</> : 'Online agora'}
    </span>
  );
}

/** "Amigos agora" (Praça e Pessoas). Quem não ligou a presença vê um convite discreto. */
export function FriendsNow({ compact = false }: { compact?: boolean }) {
  const enabled = useStore((s) => s.prefs.comunidade?.presenca === 'amigos');
  const list = useFriendsNow();
  if (!FEATURES.presenca) return null; // "Amigos agora" escondido por enquanto (lib/features.ts).
  if (!enabled) return compact ? null : <section className="cm-side"><span className="kicker">Amigos agora</span><small className="faint">Ligue a presença em <Link to="/preferencias#presenca">Preferências</Link> para ver quais amigos estão online e o que estão jogando. Só amigos veem a sua.</small></section>;
  if (!list || !list.length) return compact ? null : <section className="cm-side"><span className="kicker">Amigos agora</span><small className="faint">Nenhum amigo online agora.</small></section>;
  return (
    <section className="cm-side friends-now">
      <span className="kicker kicker--now">Amigos agora</span>
      <ul>
        {list.slice(0, 8).map((f) => (
          <li key={f.person.id}>
            <Link to={`/@${(f.person.handle ?? '').toLowerCase()}`} className="friends-now__p">
              <span className="friends-now__av"><PersonAvatar p={f.person} size={34} /><span className={`friends-now__dot${f.presence.game ? ' is-playing' : ''}`} aria-hidden="true" /></span>
              <span className="friends-now__t"><b>@{f.person.handle}</b><small className="faint">{f.presence.game ? `${f.presence.game.title} · ${since(f.presence.game.since)}` : 'Online agora'}</small></span>
              {f.presence.game?.cover && <span className="friends-now__cv"><CoverArt game={{ title: f.presence.game.title, cover: f.presence.game.cover }} /></span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
