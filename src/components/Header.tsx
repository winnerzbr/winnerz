import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link, usePath } from '../lib/router';
import { Icon } from './Icon';
import { actions, useStore, openSession } from '../data/store';
import { BrandMark } from './Brand';
import { openSearch } from './CommandPalette';
import { Sheet } from './Sheet';
import { NotifBell } from './Notifications';
import { DmButton } from '../pages/Messages';

/** Telas que fazem parte da Comunidade (para acender o pilar). */
const inCommunity = (p: string) => ['/comunidade', '/w/', '/clube/', '/jogatina/', '/conversa/', '/escrever'].some((x) => p.startsWith(x));

const PILLARS = [
  { to: '/colecao', label: 'Coleção', icon: 'colecao', match: '/colecao' },
  { to: '/jogos', label: 'Jogos', icon: 'jogos', match: '/jogos' },
  { to: '/jornada', label: 'Jornada', icon: 'jornada', match: '/jornada' },
  { to: '/comunidade', label: 'Comunidade', icon: 'comunidade', match: '/comunidade' },
  { to: '/eventos', label: 'Eventos', icon: 'eventos', match: '/eventos' },
  { to: '/album', label: 'Álbum', icon: 'album', match: '/album' },
];

export function Header() {
  const path = usePath();
  const prefs = useStore((s) => s.prefs);
  const profile = useStore((s) => s.profile);
  const session = useStore(openSession);
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (pop.current && !pop.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pillar = (p: (typeof PILLARS)[number]) => (
    <Link key={p.to} to={p.to} aria-current={path.startsWith(p.match) || (p.to === '/comunidade' && inCommunity(path)) ? 'page' : undefined}>
      <Icon name={p.icon} />{p.label}
    </Link>
  );

  // Fresta: o logo fica no centro, apoiado na linha do horizonte, com as seções dos dois lados.
  return (
    <header className="site-header">
      <div className="page site-header__row">
        <div className="site-header__side site-header__side--l">
          <button className="hdr-search" aria-label="Buscar jogos (atalho /)" title="Buscar (/ ou Ctrl+K)" onClick={openSearch}>
            <Icon name="busca" size={18} /><span className="hdr-search__label">Buscar<span className="hdr-search__more"> jogos</span></span><span className="tr" aria-hidden="true" />
          </button>
          <nav className="pillars" aria-label="Pilares">{PILLARS.slice(0, 3).map(pillar)}</nav>
        </div>
        <Link to="/" aria-label="WinnerZ, início" className="site-header__logo"><BrandMark width={66} /></Link>
        <div className="site-header__side site-header__side--r">
          <nav className="pillars" aria-label="Mais pilares">{PILLARS.slice(3).map(pillar)}</nav>
          <div className="site-header__tools">
            {session && (
              <Link to="/sessao" className="session-pill" aria-label="Sessão aberta"><span className="session-pill__dot" aria-hidden="true" /><span className="session-pill__label">Sessão aberta</span></Link>
            )}
            <DmButton />
            <NotifBell />
            <div className="appearance" ref={pop}>
              <button className="icon-btn" aria-label="Aparência" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="tema" size={20} /></button>
              {open && (
                <div role="dialog" aria-label="Aparência" className="appearance__panel">
                  <div className="appearance__title">Aparência</div>
                  <div className="seg" role="group" aria-label="Tema" style={{ display: 'flex' }}>
                    <button style={{ flex: 1 }} aria-pressed={prefs.theme === 'escuro'} onClick={() => actions.setPrefs({ theme: 'escuro' })}>Escuro</button>
                    <button style={{ flex: 1 }} aria-pressed={prefs.theme === 'claro'} onClick={() => actions.setPrefs({ theme: 'claro' })}>Claro</button>
                  </div>
                  {prefs.theme === 'escuro' && (
                    <>
                      <label htmlFor="preto-header" className="appearance__label">Intensidade do preto <span>{prefs.black}%</span></label>
                      <input id="preto-header" className="range" type="range" min={0} max={100} value={prefs.black}
                        style={{ ['--p' as string]: `${prefs.black}%` }}
                        onChange={(e) => actions.setPrefs({ black: Number(e.target.value) })} />
                      <div className="appearance__ends"><span>Grafite</span><span>Preto absoluto</span></div>
                    </>
                  )}
                  {prefs.theme === 'claro' && (
                    <>
                      <label htmlFor="branco-header" className="appearance__label">Intensidade do branco <span>{prefs.white ?? 70}%</span></label>
                      <input id="branco-header" className="range" type="range" min={0} max={100} value={prefs.white ?? 70}
                        style={{ ['--p' as string]: `${prefs.white ?? 70}%` }}
                        onChange={(e) => actions.setPrefs({ white: Number(e.target.value) })} />
                      <div className="appearance__ends"><span>Cinza suave</span><span>Branco puro</span></div>
                    </>
                  )}
                  <Link to="/preferencias" onClick={() => setOpen(false)} className="appearance__more">Mais preferências</Link>
                </div>
              )}
            </div>
            {profile ? (
              <Link to="/preferencias" aria-label="Seu perfil e preferências" className={`avatar${profile.avatar ? ' avatar--img' : ''}`}>{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.initial}</Link>
            ) : (
              <Link to="/entrar" className="btn ghost sm">Entrar</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---- Celular: barra de abas embaixo ------------------------------------------------------ */

const TAB_ICONS: Record<string, ReactElement> = {
  inicio: <><path d="M2 15h20" /><circle cx="12" cy="15" r="3" fill="currentColor" /></>,
  jornada: <><path d="M3 12h18" /><circle cx="7" cy="12" r="2" /><circle cx="17" cy="12" r="2" /></>,
  colecao: <><rect x="4" y="4" width="5" height="16" rx="1.5" /><rect x="11" y="4" width="5" height="16" rx="1.5" /><path d="M18 5l3 1-3 14-3-1" /></>,
  jogos: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  comunidade: <><path d="M3.5 4.5h11v8H8l-4.5 3.5z" /><path d="M14.5 8.5h6v8l-3-2.2h-6.5v-1.8" /></>,
  mais: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
};
const TabIcon = ({ name }: { name: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{TAB_ICONS[name]}</svg>
);

const TABS = [
  { to: '/', label: 'Início', icon: 'inicio', on: (p: string) => p === '/' },
  { to: '/jornada', label: 'Jornada', icon: 'jornada', on: (p: string) => p.startsWith('/jornada') },
  { to: '/colecao', label: 'Coleção', icon: 'colecao', on: (p: string) => p.startsWith('/colecao') },
  { to: '/comunidade', label: 'Comunidade', icon: 'comunidade', on: inCommunity },
];
const MORE = ['/jogos', '/eventos', '/album', '/preferencias', '/entrar', '/studio'];

/** No celular, os pilares ficam numa barra fixa embaixo; Jogos, Eventos e a aparência ficam em "Mais". */
export function TabBar() {
  const path = usePath();
  const prefs = useStore((s) => s.prefs);
  const profile = useStore((s) => s.profile);
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [more, setMore] = useState(false);
  const moreOn = MORE.some((m) => path.startsWith(m));

  useEffect(() => {
    document.documentElement.classList.add('has-tabbar');
    return () => document.documentElement.classList.remove('has-tabbar');
  }, []);
  useEffect(() => { setMore(false); }, [path]);

  return (
    <>
      <nav className="tabbar" aria-label="Principal">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className="tabbar__item" aria-current={t.on(path) ? 'page' : undefined}><TabIcon name={t.icon} />{t.label}
</Link>
        ))}
        <button className="tabbar__item" aria-current={moreOn ? 'page' : undefined} aria-expanded={more} onClick={() => setMore(true)}><TabIcon name="mais" />Mais</button>
      </nav>
      {more && (
        <Sheet title="Mais" onClose={() => setMore(false)} labelId="tab-mais">
          <nav className="moremenu" aria-label="Mais seções">
            <Link to="/jogos" className="moremenu__item" aria-current={path.startsWith('/jogos') ? 'page' : undefined}><Icon name="jogos" size={20} /><span><b>Jogos</b><small>Buscar jogos, Radar e o que jogar agora</small></span></Link>
            <Link to="/eventos" className="moremenu__item" aria-current={path.startsWith('/eventos') ? 'page' : undefined}><Icon name="eventos" size={20} /><span><b>Eventos</b><small>WinnerZ Awards e noites para assistir junto</small></span></Link>
            <Link to="/album" className="moremenu__item" aria-current={path.startsWith('/album') ? 'page' : undefined}><Icon name="album" size={20} /><span><b>Álbum</b><small>Figurinhas da Temporada e os seus pacotes</small></span></Link>
            {isAdmin && <Link to="/studio" className="moremenu__item" aria-current={path.startsWith('/studio') ? 'page' : undefined}><Icon name="caneta" size={20} /><span><b>Studio</b><small>Correções, uso dos planos e abertura do site</small></span></Link>}
            {profile
              ? <Link to="/preferencias" className="moremenu__item" aria-current={path.startsWith('/preferencias') ? 'page' : undefined}><span className={`avatar moremenu__avatar${profile.avatar ? ' avatar--img' : ''}`}>{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.initial}</span><span><b>Preferências</b><small>Conta, privacidade e ajustes</small></span></Link>
              : <Link to="/entrar" className="moremenu__item"><Icon name="cadeado" size={20} /><span><b>Entrar</b><small>Guarde sua Jornada em qualquer aparelho</small></span></Link>}
          </nav>
          <div className="moremenu__look">
            <span className="kicker">Aparência</span>
            <div className="seg" role="group" aria-label="Tema" style={{ display: 'flex' }}>
              <button style={{ flex: 1 }} aria-pressed={prefs.theme === 'escuro'} onClick={() => actions.setPrefs({ theme: 'escuro' })}>Escuro</button>
              <button style={{ flex: 1 }} aria-pressed={prefs.theme === 'claro'} onClick={() => actions.setPrefs({ theme: 'claro' })}>Claro</button>
            </div>
            {prefs.theme === 'escuro' && (
              <>
                <label htmlFor="preto-mais" className="appearance__label">Intensidade do preto <span>{prefs.black}%</span></label>
                <input id="preto-mais" className="range" type="range" min={0} max={100} value={prefs.black}
                  style={{ ['--p' as string]: `${prefs.black}%` }}
                  onChange={(e) => actions.setPrefs({ black: Number(e.target.value) })} />
              </>
            )}
            {prefs.theme === 'claro' && (
              <>
                <label htmlFor="branco-mais" className="appearance__label">Intensidade do branco <span>{prefs.white ?? 70}%</span></label>
                <input id="branco-mais" className="range" type="range" min={0} max={100} value={prefs.white ?? 70}
                  style={{ ['--p' as string]: `${prefs.white ?? 70}%` }}
                  onChange={(e) => actions.setPrefs({ white: Number(e.target.value) })} />
              </>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
