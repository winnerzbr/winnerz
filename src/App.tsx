import { RetroPage } from './pages/Retro';
import { SnipPage } from './pages/Snip';
import { SearchPage } from './pages/Search';
import { ListsPage, ListPage } from './pages/Lists';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Carregando, MascoteVazio, ProtecaoErro } from './components/IAmiguinho';
import { DiscordLinkPage } from './components/DiscordSettings';
import { BridgeSync } from './components/Bridges';
import { DropBanner } from './components/album/DropBanner';
import { usePath, match, Link, navigate } from './lib/router';
import { useStore, openSession, getState, actions } from './data/store';

const isAdminNow = () => !!getState().isAdmin;
import { applyPrefs } from './lib/theme';
import { BrandMark } from './components/Brand';
import { resetDemo } from './data/demoAdapter';
import { backfillGameFacts } from './lib/backfill';
import { MiniCelebrationHost } from './components/MiniCelebration';
import { SavedNoticeHost } from './components/SavedNotice';
import { GlobalTimelinePage } from './pages/Memory';
import { ReviewPage } from './pages/Review';
import { TrailsPage, TrailPage } from './pages/Trails';
import { OverlayPage } from './pages/Overlay';
import { Header, TabBar } from './components/Header';
import { SessionDock } from './components/SessionDock';
import { ForgottenSession } from './components/ForgottenSession';
import { PastSheetHost } from './components/PastPlay';
import { UpdateBanner } from './components/UpdateBanner';
import { CommandPalette } from './components/CommandPalette';
import { RepairPage } from './pages/Repair';
import { track } from './lib/track';
import { pageEvent } from './lib/usageLabels';
import { FEATURES } from './lib/features';
import { Home } from './pages/Home';
import { RulesPage } from './pages/Rules';
import { PeoplePage } from './pages/People';
import { MessagesPage } from './pages/Messages';
import { CommunitiesIndexPage, CommunityEditPage, CommunityNewPage, CommunityView, ModHistoryPage } from './pages/Communities';
import { StudioCommunitiesPage } from './pages/StudioCommunities';
import { PostEditorPage, PostPage } from './pages/Post';
import { ClubEditPage, ClubNewPage, ClubPage, ClubsIndexPage } from './pages/Clubs';
import { JogatinaEditPage, JogatinaNewPage, JogatinaPage } from './pages/Jogatina';
import { AvisosPage } from './pages/Avisos';
import { StudioModerationPage } from './pages/StudioModeration';
import { ModerationBanner, RulesHost } from './components/Moderation';
import { JourneyIndex, ConcludedPage } from './pages/JourneyIndex';
import { CollectionStats, Wishes } from './pages/CollectionStats';
import { ImportPage } from './pages/Import';
import { SteamImportPage } from './pages/SteamImport';
import { JourneyPage } from './pages/Journey';
import { Collection } from './pages/Collection';
import { GamesIndex } from './pages/GamesIndex';
import { GamePage } from './pages/Game';
import { GamesExplore } from './pages/GamesExplore';
import { RadarPage } from './pages/Radar';
import { Preferences } from './pages/Preferences';
import { SessionPage } from './pages/Session';
import { Login } from './pages/Login';
import { EntrarApp, EntrarSteam } from './pages/EntrarSocial';
import { CommunityPage } from './pages/Community';
import { PrivacyPage } from './pages/Privacy';
import { AboutPage } from './pages/About';
import { PublicProfilePage } from './pages/PublicProfile';
import { PublicJourneyPage } from './pages/PublicJourney';
import { HardwarePage } from './pages/Hardware';
import { TrashPage } from './pages/Trash';
import { ShowcasePage } from './pages/Showcases';
import { MuseumPage } from './pages/Museum';
import { PublicMuseumPage } from './pages/PublicMuseum';
import { DeletionBanner } from './components/AccountData';
import { NickGate } from './components/NickGate';
import { PrivateTeaser } from './pages/PrivateTeaser';
import { SITE_PRIVATE } from './lib/env';
import { EventsIndex, AwardsPage } from './pages/Awards';
import { AwardsAdminPage } from './pages/AwardsAdmin';
import { StudioFixesPage } from './pages/StudioFixes';
import { StudioPage } from './pages/Studio';
import { InvitePage } from './pages/Invite';
import { invitesApi, pendingInvite, setPendingInvite } from './data/invitesApi';
import { AwardsRevealPage } from './pages/AwardsReveal';
import { AwardsHistoryPage } from './pages/AwardsPlus';

const AlbumPage = lazy(() => import('./pages/Album').then((m) => ({ default: m.AlbumPage })));
const ArrivalPage = lazy(() => import('./pages/Arrival').then((m) => ({ default: m.ArrivalPage })));
const StudioAlbumPage = lazy(() => import('./pages/StudioAlbum').then((m) => ({ default: m.StudioAlbumPage })));
const IAmiguinhoPage = lazy(() => import('./pages/IAmiguinho').then((m) => ({ default: m.IAmiguinhoPage })));
const TradutorPage = lazy(() => import('./pages/Tradutor').then((m) => ({ default: m.TradutorPage })));
const StudioSofaPage = lazy(() => import('./pages/StudioSofa').then((m) => ({ default: m.StudioSofaPage })));
const StudioLivePage = lazy(() => import('./pages/StudioLive').then((m) => ({ default: m.StudioLivePage })));
const StudioIAmiguinhoPage = lazy(() => import('./pages/StudioIAmiguinho').then((m) => ({ default: m.StudioIAmiguinhoPage })));
const lazyPage = (node: ReactNode) => <Suspense fallback={<Carregando />}>{node}</Suspense>;

function Routes({ path }: { path: string }): ReactNode {
  let m: Record<string, string> | null;
  if (match('/', path)) return <Home />;
  if (match('/tv', path)) return <TvHome />;
  if (match('/tv/estante', path)) return <TvShelf />;
  if (match('/tv/parear', path)) return <TvApprovePage />;
  if (match('/chegada', path) || match('/boas-vindas', path)) {
    const n = Number(new URLSearchParams(path.split('?')[1] ?? '').get('passo'));
    return <Suspense fallback={<div className="boot" aria-busy="true" />}><ArrivalPage start={Number.isInteger(n) && n >= 0 && n < 14 ? n : undefined} /></Suspense>;
  }
  if (match('/jornada', path)) return <JourneyIndex />;
  if (match('/jornada/concluidas', path)) return <ConcludedPage />;
  if (match('/jornada/linha-do-tempo', path)) return <GlobalTimelinePage />;
  // Meu ritmo, Seu ano e Temporadas viraram Retrospectivas (Etapa 3 da revisão); os endereços antigos levam para lá.
  if (match('/jornada/retrospectivas', path)) return <RetroPage />;
  // Avisos antigos do banco ainda apontam para /jornada/ritmo#semana, #mes e #pactos.
  if (match('/jornada/ritmo', path)) return <GoTo to={location.hash === '#mes' ? '/jornada/retrospectivas?p=mes-anterior' : location.hash === '#semana' ? '/jornada/retrospectivas?p=mes' : location.hash === '#pactos' ? '/jornada' : '/jornada/retrospectivas?p=sempre'} />;
  if (match('/jornada/revisao', path)) return <ReviewPage />;
  if (match('/jornada/ano', path)) return <GoTo to={`/jornada/retrospectivas?p=ano-${new Date().getFullYear()}`} />;
  if ((m = match('/jornada/ano/:year', path))) return <GoTo to={`/jornada/retrospectivas?p=ano-${encodeURIComponent(m.year)}`} />;
  if ((m = match('/jornada/temporada/:id', path))) return <GoTo to={`/jornada/retrospectivas?p=${encodeURIComponent(m.id)}`} />;
  // "Preparar a volta" virou um bloco dentro da Jornada do jogo (Etapa 2 da revisão).
  if ((m = match('/jornada/:slug/voltar', path))) return <GoTo to={`/jornada/${m.slug}#voltar`} />;
  if ((m = match('/jornada/:slug', path))) return <JourneyPage slug={m.slug} />;
  if (match('/colecao', path)) return <Collection />;
  if (match('/colecao/consoles', path)) return <HardwarePage />;
  if (match('/colecao/lixeira', path)) return <TrashPage />;
  // Vitrines viraram uma seção do Museu (Etapa 4 da revisão).
  if (match('/colecao/vitrines', path)) return <GoTo to="/colecao/museu#vitrines" />;
  if (match('/colecao/museu', path)) return <MuseumPage />;
  if ((m = match('/colecao/vitrines/:id', path))) return <ShowcasePage id={m.id} />;
  if (match('/colecao/desejos', path)) return <Wishes />;
  if (match('/colecao/estatisticas', path)) return <CollectionStats />;
  if (match('/colecao/importar', path)) return <ImportPage />;
  if (match('/colecao/steam', path)) return <SteamImportPage />;
  if (match('/colecao/reparar', path)) return <RepairPage />;
  if (match('/jogos', path)) return <GamesIndex />;
  if (match('/jogos/explorar', path)) return <GamesExplore />;
  if (match('/jogos/radar', path)) return <RadarPage />;
  if (!FEATURES.trilhas && path.startsWith('/jogos/trilhas') && !isAdminNow()) return <GoTo to="/jogos" />;
  if (match('/jogos/trilhas', path)) return <TrailsPage />;
  if ((m = match('/jogos/trilhas/:slug', path))) return <TrailPage slug={m.slug} />;
  if ((m = match('/jogos/:slug/traduzir', path))) return lazyPage(<TradutorPage slug={m.slug} />);
  if ((m = match('/jogos/:slug', path))) return <GamePage slug={m.slug} />;
  if (match('/preferencias', path)) return <Preferences />;
  if (match('/sessao', path)) return <SessionPage />;
  if ((m = match('/app/jogar/:id', path))) return <AppJogar gameId={m.id} />;
  // Jogar agora virou o Início (Etapa 1 da revisão): o atalho antigo do celular continua funcionando.
  if (match('/agora', path)) return <GoTo to="/" />;
  if (match('/entrar', path)) return <Login />;
  if (match('/entrar/steam', path)) return <EntrarSteam />;
  if (match('/entrar/app', path)) return <EntrarApp />;
  if (match('/comunidade', path)) return <CommunityPage />;
  if (match('/comunidade/pessoas', path)) return <PeoplePage />;
  if (match('/busca', path)) return <SearchPage />;
  if (match('/listas', path)) return <ListsPage />;
  if ((m = match('/t/:token', path))) return <SnipPage key={m.token} token={m.token} />;
  if ((m = match('/lista/:id', path))) return <ListPage key={m.id} id={m.id} />;
  if (match('/mensagens', path)) return <MessagesPage />;
  if ((m = match('/mensagens/:handle', path))) return <MessagesPage handle={decodeURIComponent(m.handle)} />;
  if (match('/comunidade/comunidades', path)) return <CommunitiesIndexPage />;
  if (match('/comunidade/criar', path)) return <CommunityNewPage />;
  // Clubes escondidos por enquanto (lib/features.ts): os endereços levam às jogatinas.
  if (!FEATURES.clubes && (path.startsWith('/comunidade/clubes') || path.startsWith('/clube/'))) return <GoTo to="/comunidade?c=jogatinas" />;
  if (match('/comunidade/clubes', path)) return <ClubsIndexPage />;
  if (match('/comunidade/clubes/criar', path)) return <ClubNewPage />;
  if ((m = match('/clube/:slug', path))) return <ClubPage key={m.slug} slug={m.slug} />;
  if ((m = match('/clube/:slug/editar', path))) return <ClubEditPage slug={m.slug} />;
  if (match('/avisos', path)) return <AvisosPage />;
  if (match('/discord/ligar', path)) return <DiscordLinkPage />;
  if (match('/jogatina/criar', path)) return <JogatinaNewPage />;
  if ((m = match('/jogatina/:id/editar', path))) return <JogatinaEditPage id={m.id} />;
  if ((m = match('/jogatina/:id', path))) return <JogatinaPage key={m.id} id={m.id} />;
  if ((m = match('/w/:slug', path))) return <CommunityView key={m.slug} slug={m.slug} />;
  if ((m = match('/w/:slug/editar', path))) return <CommunityEditPage slug={m.slug} />;
  if ((m = match('/w/:slug/escrever', path))) return <PostEditorPage slug={m.slug} />;
  if ((m = match('/w/:slug/moderacao', path))) return <ModHistoryPage key={m.slug} slug={m.slug} />;
  if ((m = match('/w/:slug/:id/editar', path))) return <PostEditorPage id={m.id} />;
  if ((m = match('/w/:slug/:id', path))) return <PostPage key={m.id} id={m.id} />;
  if (match('/escrever', path)) return <PostEditorPage />;
  if ((m = match('/conversa/:id/editar', path))) return <PostEditorPage id={m.id} />;
  if ((m = match('/conversa/:id', path))) return <PostPage key={m.id} id={m.id} />;
  if (match('/privacidade', path)) return <PrivacyPage />;
  if (match('/regras', path)) return <RulesPage />;
  if (match('/sobre', path)) return <AboutPage />;
  if (match('/eventos', path)) return <EventsIndex />;
  // Endereço curto das peças de divulgação: winnerz.com.br/awards
  if (path === '/awards' || path === '/awards/') return <GoTo to="/eventos/awards" />;
  if (match('/eventos/awards', path)) return <AwardsPage />;
  if (match('/eventos/awards/admin', path)) return <AwardsAdminPage />;
  if (match('/eventos/awards/revelar', path)) return <AwardsRevealPage />;
  if (match('/eventos/awards/historico', path)) return <AwardsHistoryPage />;
  // E7.1/E7.2: o endereço curto que a live mostra (winnerz.com.br/codigo e /codigo/XXXX).
  if (match('/codigo', path)) return <GoTo to="/album/pacotes#codigo" />;
  if ((m = match('/codigo/:code', path))) return <GoTo to={`/album/pacotes?codigo=${encodeURIComponent(m.code)}`} />;
  if (match('/album', path)) return lazyPage(<AlbumPage />);
  if (match('/album/pacotes', path)) return lazyPage(<AlbumPage view="pacotes" />);
  if (match('/album/figurinhas', path)) return lazyPage(<AlbumPage view="figurinhas" />);
  if (match('/album/cofre', path)) return lazyPage(<AlbumPage view="cofre" />);
  if (match('/album/galera', path)) return lazyPage(<AlbumPage view="galera" />);
  if (match('/album/trocas', path)) return lazyPage(<AlbumPage view="trocas" with={new URLSearchParams(path.split('?')[1] ?? '').get('com') ?? undefined} />);
  if ((m = match('/album/:slug', path))) return lazyPage(<AlbumPage key={m.slug} slug={m.slug} />);
  if (match('/studio', path)) return <StudioPage />;
  if (match('/studio/album', path)) return lazyPage(<StudioAlbumPage />);
  if (match('/studio/sofa', path)) return lazyPage(<StudioSofaPage />);
  if (match('/studio/live', path)) return lazyPage(<StudioLivePage />);
  if (match('/studio/iamiguinho', path)) return lazyPage(<StudioIAmiguinhoPage />);
  if ((m = match('/convite/:code', path))) return <InvitePage code={m.code} />;
  if (match('/studio/correcoes', path)) return <StudioFixesPage />;
  if (match('/studio/moderacao', path)) return <StudioModerationPage />;
  if (match('/studio/comunidades', path)) return <StudioCommunitiesPage />;
  if ((m = match('/:handle', path)) && m.handle.toLowerCase() === '@iamiguinho') return lazyPage(<IAmiguinhoPage />);
  if ((m = match('/:handle', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicProfilePage handle={m.handle.slice(1)} />;
  if ((m = match('/:handle/museu', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicMuseumPage handle={m.handle.slice(1)} />;
  if ((m = match('/:handle/vitrines/:id', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicProfilePage handle={m.handle.slice(1)} vitrine={m.id} />;
  if ((m = match('/:handle/:slug', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicJourneyPage handle={m.handle.slice(1)} slug={m.slug} />;
  return (
    <main className="page pad notfound">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Página não encontrada</h1>
          <p className="muted lead">Esse endereço não existe, ou mudou de lugar.</p>
        </div>
      </header>
      <MascoteVazio momento="nao-encontrada" />
      <Link className="btn primary" to="/">Voltar ao início</Link>
    </main>
  );
}

import { usePresencePing } from './data/presenceApi';
import { installCoverTilt } from './lib/coverTilt';
import { installTabScroll } from './lib/tabscroll';
import { installStickySides } from './lib/stickside';
import { TvShell, TvAutoOpen } from './tv/Tv';
import { TvPair, TvApprovePage } from './tv/TvPair';
import { TvHome } from './tv/TvHome';
import { TvShelf } from './tv/TvShelf';
import { setTv, tvOn, useTv } from './tv/mode';

export function App() {
  const path = usePath();
  const ready = useStore((s) => s.ready);
  const prefs = useStore((s) => s.prefs);
  const mode = useStore((s) => s.mode);
  const hasSession = useStore((s) => Boolean(openSession(s)));
  const isAdmin = useStore((s) => !!s.isAdmin);
  const isGuest = useStore((s) => !!s.isGuest);
  // Fechado ou aberto: o banco decide (botão no Studio); sem a migração 0076, vale VITE_SITE_PRIVATE.
  const siteClosed = useStore((s) => (s.siteOpen === undefined ? SITE_PRIVATE : !s.siteOpen));
  const profileId = useStore((s) => s.profile?.id);
  const tvMode = useTv();
  // Modo TV: os endereços /tv ligam o painel da tela grande (o /tv/parear é a página do celular, fora dele).
  const tvPath = path === '/tv' || path.startsWith('/tv?') || path.startsWith('/tv/estante');
  useEffect(() => { if (tvPath && !tvOn()) setTv(true); }, [tvPath]);
  const inTv = (tvMode || tvPath) && !path.startsWith('/tv/parear');

  useEffect(() => { applyPrefs(prefs); }, [prefs]);
  // Capas em grade inclinam seguindo o mouse (Fresta).
  useEffect(() => installCoverTilt(), []);
  useEffect(() => installTabScroll(), []);
  useEffect(() => installStickySides(), []);
  usePresencePing();
  // Voltou do e-mail de entrada com um convite guardado: usa o convite (vale também se entrou pelo código).
  useEffect(() => {
    if (mode !== 'supabase' || !profileId || isAdmin || isGuest) return;
    const code = pendingInvite();
    if (!code) return;
    invitesApi.redeem(code).catch(() => null).finally(() => setPendingInvite(null));
  }, [mode, profileId, isAdmin, isGuest]);
  // Conta só a seção visitada (ex.: "pagina.colecao"), nunca o endereço completo nem o @ de alguém.
  useEffect(() => { track(pageEvent(path)); }, [path]);

  // Completa tempo para zerar, modos e temas do acervo em segundo plano (DNA e "O que jogar").
  useEffect(() => { if (!ready) return; const t = setTimeout(() => { void backfillGameFacts(); }, 5000); return () => clearTimeout(t); }, [ready]);

  // Sessão e apresentação da revelação ocupam a tela toda, sem o menu do site.
  const isSession = path.startsWith('/sessao') || path.startsWith('/eventos/awards/revelar') || path.startsWith('/chegada') || path.startsWith('/boas-vindas');

  // Overlay do OBS: só o cartão, fundo transparente, sem menu (não espera os seus dados carregarem).
  const ovl = match('/overlay/:k', path);
  if (ovl) return <OverlayPage k={ovl.k} />;

  if (!ready) {
    return <div className="boot" aria-busy="true"><BrandMark width={64} title="WinnerZ" /></div>;
  }

  // Na TV sem conta aberta: entrar pelo celular (código e QR), sem digitar senha com o controle.
  if (inTv && mode === 'supabase' && !profileId) return <TvShell path={path} semSecoes><TvPair /></TvShell>;

  // Site fechado: com o banco ligado, só a conta de administrador passa. Os demais veem só o "Em breve"
  // (a página de entrar continua no endereço /entrar, sem menu, para você entrar de qualquer aparelho).
  if (siteClosed && mode === 'supabase' && !isAdmin && !isGuest) {
    const inv = match('/convite/:code', path);
    if (inv) return <InvitePage code={inv.code} />;
    if (match('/privacidade', path)) return <PrivacyPage standalone />;
    if (match('/sobre', path)) return <AboutPage standalone />;
    if (match('/regras', path)) return <RulesPage standalone />;
    if (match('/entrar/steam', path)) return <EntrarSteam />;
    if (match('/entrar/app', path)) return <EntrarApp />;
    return match('/entrar', path) ? <Login /> : <PrivateTeaser />;
  }

  if (inTv) return (
    <NickGate>
      <TvShell path={path}><ProtecaoErro chave={path}><Routes path={path} /></ProtecaoErro></TvShell>
      <PastSheetHost />
      <RulesHost />
      <MiniCelebrationHost />
      <SavedNoticeHost />
    </NickGate>
  );

  return (
    <NickGate>
      <TvAutoOpen />
      {mode === 'demo' && (
        <div className="demo-bar">
          Modo demonstração: seus registros ficam só neste navegador. <button onClick={resetDemo}>Recomeçar a demonstração</button>
        </div>
      )}
      {!isSession && <Header />}
      <UpdateBanner />
      <DeletionBanner />
      <ModerationBanner />
      <ForgottenSession />
      <BridgeSync />
      <DropBanner hidden={isSession || path.startsWith('/album/pacotes')} />
      <ProtecaoErro chave={path}><Routes path={path} /></ProtecaoErro>
      {!isSession && (
        <footer className="site-footer">
          {/* Fresta: o logo pousado no horizonte, como no topo; os links ficam embaixo da linha, separados por traços. */}
          <div className="page site-footer__in">
            <BrandMark width={72} title="WinnerZ" />
            <span className="site-footer__line" aria-hidden="true" />
            <p className="site-footer__tag">Onde jogos viram histórias.</p>
            <nav className="site-footer__nav" aria-label="Rodapé">
              <Link to="/sobre" className="site-footer__link">Sobre</Link>
              <Link to="/privacidade" className="site-footer__link">Privacidade</Link>
              <Link to="/regras" className="site-footer__link">Regras</Link>
            </nav>
            <p className="site-footer__src">Dados e imagens dos jogos: <a href="https://www.igdb.com" target="_blank" rel="noopener noreferrer">IGDB.com</a></p>
          </div>
        </footer>
      )}
      {!isSession && <TabBar />}
      {hasSession && !isSession && <SessionDock />}
      <PastSheetHost />
      <RulesHost />
      <MiniCelebrationHost />
      <SavedNoticeHost />
      <CommandPalette />
    </NickGate>
  );
}

/** Leva para outro endereço sem deixar o atual no histórico. */
function GoTo({ to }: { to: string }) {
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return null;
}

/** Botão "Continuar" do widget da Jornada (app de celular): abre a sessão do jogo, ou volta para a que já está aberta. */
function AppJogar({ gameId }: { gameId: string }) {
  const ready = useStore((s) => s.ready);
  useEffect(() => {
    if (!ready) return;
    const s = getState();
    if (openSession(s)) navigate('/sessao', { replace: true });
    else if (s.games[gameId] && s.profile) { actions.play(gameId); navigate('/sessao', { replace: true }); }
    else navigate('/jornada', { replace: true });
  }, [ready, gameId]);
  return <div className="boot" aria-busy="true" />;
}
