import { useEffect, useRef, useState } from 'react';
import { Link, usePath } from '../lib/router';
import { Icon } from './Icon';
import { actions, useStore, openSession } from '../data/store';
import { BrandLockup } from './Brand';
import { openSearch } from './CommandPalette';

const PILLARS = [
  { to: '/colecao', label: 'Coleção', icon: 'colecao', match: '/colecao' },
  { to: '/jogos', label: 'Jogos', icon: 'jogos', match: '/jogos' },
  { to: '/jornada', label: 'Jornada', icon: 'jornada', match: '/jornada' },
  { to: '/comunidade', label: 'Comunidade', icon: 'comunidade', match: '/comunidade' },
  { to: '/eventos', label: 'Eventos', icon: 'eventos', match: '/eventos' },
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

  return (
    <header className="site-header">
      <div className="page site-header__row">
        <Link to="/" aria-label="WinnerZ, início" className="site-header__logo"><BrandLockup /></Link>
        <nav className="pillars" aria-label="Pilares">
          {PILLARS.map((p) => (
            <Link key={p.to} to={p.to} aria-current={path.startsWith(p.match) ? 'page' : undefined}>
              <Icon name={p.icon} />{p.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__tools">
          <button className="search-pill" aria-label="Buscar (Ctrl+K)" title="Buscar (Ctrl+K)" onClick={openSearch}><Icon name="busca" size={18} /><span className="search-pill__label">Buscar</span><kbd className="search-pill__kbd">Ctrl K</kbd></button>
          {session && (
            <Link to="/sessao" className="session-pill"><span className="session-pill__dot" aria-hidden="true" /><span className="session-pill__label">Sessão aberta</span></Link>
          )}
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
                <Link to="/preferencias" onClick={() => setOpen(false)} className="appearance__more">Mais preferências</Link>
              </div>
            )}
          </div>
          {profile ? (
            <Link to="/preferencias" aria-label="Seu perfil e preferências" className="avatar">{profile.initial}</Link>
          ) : (
            <Link to="/entrar" className="btn ghost sm">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
