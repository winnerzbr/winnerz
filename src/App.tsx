import { SearchPage } from './pages/Search';
import { ListsPage, ListPage } from './pages/Lists';
import { useEffect, type ReactNode } from 'react';
import { SeasonPage } from './components/Seasons';
import { DiscordLinkPage } from './components/DiscordSettings';
import { BridgeSync } from './components/Bridges';
import { usePath, match, Link } from './lib/router';
import { useStore, openSession } from './data/store';
import { applyPrefs } from './lib/theme';
import { BrandMark } from './components/Brand';
import { resetDemo } from './data/demoAdapter';
import { backfillGameFacts } from './lib/backfill';
import { MiniCelebrationHost } from './components/MiniCelebration';
import { GlobalTimelinePage, RhythmPage } from './pages/Memory';
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
import { Home } from './pages/Home';
import { Welcome } from './pages/Welcome';
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
import { ComebackPage } from './pages/Comeback';
import { Collection } from './pages/Collection';
import { GamesIndex } from './pages/GamesIndex';
import { GamePage } from './pages/Game';
import { GamesExplore } from './pages/GamesExplore';
import { RadarPage } from './pages/Radar';
import { Preferences } from './pages/Preferences';
import { SessionPage } from './pages/Session';
import { Login } from './pages/Login';
import { CommunityPage } from './pages/Community';
import { PrivacyPage } from './pages/Privacy';
import { AboutPage } from './pages/About';
import { PublicProfilePage } from './pages/PublicProfile';
import { PublicJourneyPage } from './pages/PublicJourney';
import { HardwarePage } from './pages/Hardware';
import { TrashPage } from './pages/Trash';
import { ShowcasesPage, ShowcasePage } from './pages/Showcases';
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

function Routes({ path }: { path: string }): ReactNode {
  let m: Record<string, string> | null;
  if (match('/', path)) return <Home />;
  if (match('/boas-vindas', path)) return <Welcome standalone />;
  if (match('/jornada', path)) return <JourneyIndex />;
  if (match('/jornada/concluidas', path)) return <ConcludedPage />;
  if (match('/jornada/linha-do-tempo', path)) return <GlobalTimelinePage />;
  if (match('/jornada/ritmo', path)) return <RhythmPage />;
  if (match('/jornada/revisao', path)) return <ReviewPage />;
  if ((m = match('/jornada/temporada/:id', path))) return <SeasonPage id={m.id} />;
  if ((m = match('/jornada/:slug/voltar', path))) return <ComebackPage slug={m.slug} />;
  if ((m = match('/jornada/:slug', path))) return <JourneyPage slug={m.slug} />;
  if (match('/colecao', path)) return <Collection />;
  if (match('/colecao/consoles', path)) return <HardwarePage />;
  if (match('/colecao/lixeira', path)) return <TrashPage />;
  if (match('/colecao/vitrines', path)) return <ShowcasesPage />;
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
  if (match('/jogos/trilhas', path)) return <TrailsPage />;
  if ((m = match('/jogos/trilhas/:slug', path))) return <TrailPage slug={m.slug} />;
  if ((m = match('/jogos/:slug', path))) return <GamePage slug={m.slug} />;
  if (match('/preferencias', path)) return <Preferences />;
  if (match('/sessao', path)) return <SessionPage />;
  if (match('/entrar', path)) return <Login />;
  if (match('/comunidade', path)) return <CommunityPage />;
  if (match('/comunidade/pessoas', path)) return <PeoplePage />;
  if (match('/busca', path)) return <SearchPage />;
  if (match('/listas', path)) return <ListsPage />;
  if ((m = match('/lista/:id', path))) return <ListPage key={m.id} id={m.id} />;
  if (match('/mensagens', path)) return <MessagesPage />;
  if ((m = match('/mensagens/:handle', path))) return <MessagesPage handle={decodeURIComponent(m.handle)} />;
  if (match('/comunidade/comunidades', path)) return <CommunitiesIndexPage />;
  if (match('/comunidade/criar', path)) return <CommunityNewPage />;
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
  if (match('/eventos/awards', path)) return <AwardsPage />;
  if (match('/eventos/awards/admin', path)) return <AwardsAdminPage />;
  if (match('/eventos/awards/revelar', path)) return <AwardsRevealPage />;
  if (match('/studio', path)) return <StudioPage />;
  if ((m = match('/convite/:code', path))) return <InvitePage code={m.code} />;
  if (match('/studio/correcoes', path)) return <StudioFixesPage />;
  if (match('/studio/moderacao', path)) return <StudioModerationPage />;
  if (match('/studio/comunidades', path)) return <StudioCommunitiesPage />;
  if ((m = match('/:handle', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicProfilePage handle={m.handle.slice(1)} />;
  if ((m = match('/:handle/museu', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicMuseumPage handle={m.handle.slice(1)} />;
  if ((m = match('/:handle/vitrines/:id', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicProfilePage handle={m.handle.slice(1)} vitrine={m.id} />;
  if ((m = match('/:handle/:slug', path)) && m.handle.startsWith('@') && m.handle.length > 1) return <PublicJourneyPage handle={m.handle.slice(1)} slug={m.slug} />;
  return (
    <main className="page" style={{ padding: '96px 32px' }}>
      <h1 className="t" style={{ fontSize: 72 }}>Página não encontrada</h1>
      <p className="muted">Esse endereço não existe. <Link to="/">Voltar ao início</Link></p>
    </main>
  );
}

import { usePresencePing } from './data/presenceApi';

export function App() {
  const path = usePath();
  const ready = useStore((s) => s.ready);
  const prefs = useStore((s) => s.prefs);
  const mode = useStore((s) => s.mode);
  const hasSession = useStore((s) => Boolean(openSession(s)));
  const isAdmin = useStore((s) => !!s.isAdmin);
  const isGuest = useStore((s) => !!s.isGuest);
  const profileId = useStore((s) => s.profile?.id);

  useEffect(() => { applyPrefs(prefs); }, [prefs]);
  usePresencePing();
  // Voltou do e-mail de entrada com um convite guardado: usa o convite (vale também se entrou pelo código).
  useEffect(() => {
    if (mode !== 'supabase' || !profileId || isAdmin || isGuest) return;
    const code = pendingInvite();
    if (!code) return;
    invitesApi.redeem(code).catch(() => null).finally(() => setPendingInvite(null));
  }, [mode, profileId, isAdmin, isGuest]);
  // Conta só a seção visitada (ex.: "pagina.colecao"), nunca o endereço completo.
  useEffect(() => { track(`pagina.${path.split('?')[0].split('/')[1] || 'inicio'}`); }, [path]);

  // Completa tempo para zerar, modos e temas do acervo em segundo plano (DNA e "O que jogar").
  useEffect(() => { if (!ready) return; const t = setTimeout(() => { void backfillGameFacts(); }, 5000); return () => clearTimeout(t); }, [ready]);

  // Sessão e apresentação da revelação ocupam a tela toda, sem o menu do site.
  const isSession = path.startsWith('/sessao') || path.startsWith('/eventos/awards/revelar');

  // Overlay do OBS: só o cartão, fundo transparente, sem menu (não espera os seus dados carregarem).
  const ovl = match('/overlay/:k', path);
  if (ovl) return <OverlayPage k={ovl.k} />;

  if (!ready) {
    return <div className="boot" aria-busy="true"><BrandMark width={64} title="WinnerZ" /></div>;
  }

  // Site fechado: com o banco ligado, só a conta de administrador passa. Os demais veem só o "Em breve"
  // (a página de entrar continua no endereço /entrar, sem menu, para você entrar de qualquer aparelho).
  if (SITE_PRIVATE && mode === 'supabase' && !isAdmin && !isGuest) {
    const inv = match('/convite/:code', path);
    if (inv) return <InvitePage code={inv.code} />;
    if (match('/privacidade', path)) return <PrivacyPage standalone />;
    if (match('/sobre', path)) return <AboutPage standalone />;
    if (match('/regras', path)) return <RulesPage standalone />;
    return match('/entrar', path) ? <Login /> : <PrivateTeaser />;
  }

  return (
    <NickGate>
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
      <Routes path={path} />
      {!isSession && (
        <footer className="site-footer">
          <div className="page">
            <BrandMark width={56} title="WinnerZ" />
            <div className="site-footer__txt">
              <p>Onde jogos viram histórias. <Link to="/sobre" className="site-footer__link">Sobre</Link> <Link to="/privacidade" className="site-footer__link">Privacidade</Link> <Link to="/regras" className="site-footer__link">Regras</Link></p>
              <p className="site-footer__src">Dados e imagens dos jogos: <a href="https://www.igdb.com" target="_blank" rel="noopener noreferrer">IGDB.com</a></p>
            </div>
          </div>
        </footer>
      )}
      {!isSession && <TabBar />}
      {hasSession && !isSession && <SessionDock />}
      <PastSheetHost />
      <RulesHost />
      <MiniCelebrationHost />
      <CommandPalette />
    </NickGate>
  );
}
