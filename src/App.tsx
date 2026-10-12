import { useEffect, type ReactNode } from 'react';
import { usePath, match, Link } from './lib/router';
import { useStore, openSession } from './data/store';
import { applyPrefs, brand } from './lib/theme';
import { resetDemo } from './data/demoAdapter';
import { Header } from './components/Header';
import { SessionDock } from './components/SessionDock';
import { ForgottenSession } from './components/ForgottenSession';
import { PastSheetHost } from './components/PastPlay';
import { UpdateBanner } from './components/UpdateBanner';
import { RepairPage } from './pages/Repair';
import { track } from './lib/track';
import { Home } from './pages/Home';
import { JourneyIndex, ConcludedPage } from './pages/JourneyIndex';
import { CollectionStats, Wishes } from './pages/CollectionStats';
import { ImportPage } from './pages/Import';
import { JourneyPage } from './pages/Journey';
import { Collection } from './pages/Collection';
import { GamesIndex } from './pages/GamesIndex';
import { GamePage } from './pages/Game';
import { Preferences } from './pages/Preferences';
import { SessionPage } from './pages/Session';
import { Login } from './pages/Login';
import { ComingSoon } from './pages/ComingSoon';

function Routes({ path }: { path: string }): ReactNode {
  let m: Record<string, string> | null;
  if (match('/', path)) return <Home />;
  if (match('/jornada', path)) return <JourneyIndex />;
  if (match('/jornada/concluidas', path)) return <ConcludedPage />;
  if ((m = match('/jornada/:slug', path))) return <JourneyPage slug={m.slug} />;
  if (match('/colecao', path)) return <Collection />;
  if (match('/colecao/desejos', path)) return <Wishes />;
  if (match('/colecao/estatisticas', path)) return <CollectionStats />;
  if (match('/colecao/importar', path)) return <ImportPage />;
  if (match('/colecao/reparar', path)) return <RepairPage />;
  if (match('/jogos', path)) return <GamesIndex />;
  if ((m = match('/jogos/:slug', path))) return <GamePage slug={m.slug} />;
  if (match('/preferencias', path)) return <Preferences />;
  if (match('/sessao', path)) return <SessionPage />;
  if (match('/entrar', path)) return <Login />;
  if (match('/comunidade', path)) return <ComingSoon pillar="Comunidade" />;
  if (match('/eventos', path)) return <ComingSoon pillar="Eventos" />;
  return (
    <main className="page" style={{ padding: '96px 32px' }}>
      <h1 className="t" style={{ fontSize: 72 }}>Página não encontrada</h1>
      <p className="muted">Esse endereço não existe. <Link to="/">Voltar ao início</Link></p>
    </main>
  );
}

export function App() {
  const path = usePath();
  const ready = useStore((s) => s.ready);
  const prefs = useStore((s) => s.prefs);
  const mode = useStore((s) => s.mode);
  const hasSession = useStore((s) => Boolean(openSession(s)));

  useEffect(() => { applyPrefs(prefs); }, [prefs]);
  // Conta só a seção visitada (ex.: "pagina.colecao"), nunca o endereço completo.
  useEffect(() => { track(`pagina.${path.split('?')[0].split('/')[1] || 'inicio'}`); }, [path]);

  const isSession = path.startsWith('/sessao');

  if (!ready) {
    return <div className="boot" aria-busy="true"><img src={brand(prefs.theme).mark} alt="WinnerZ" height={36} /></div>;
  }

  return (
    <>
      {mode === 'demo' && (
        <div className="demo-bar">
          Modo demonstração: seus registros ficam só neste navegador. <button onClick={resetDemo}>Recomeçar a demonstração</button>
        </div>
      )}
      {!isSession && <Header />}
      <UpdateBanner />
      <ForgottenSession />
      <Routes path={path} />
      {!isSession && (
        <footer className="site-footer">
          <div className="page">
            <img src={brand(prefs.theme).full} alt="WinnerZ" />
            <p>Onde jogos viram histórias.</p>
          </div>
        </footer>
      )}
      {hasSession && !isSession && <SessionDock />}
      <PastSheetHost />
    </>
  );
}
