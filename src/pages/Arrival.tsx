/**
 * A Chegada: a primeira visita em 15 telas, como desenhada no canvas em 14/out. Os cinco emblemas do site acendem
 * no topo conforme a pessoa conhece cada parte, e cada escolha já vira conteúdo de verdade: o @, as plataformas
 * (consoles na Coleção), os jogos que marcaram (favoritos e a vitrine "Os que marcaram a minha vida"; "Tenho" põe na
 * estante), o jogo de agora (Jornada e progresso), os lançamentos (desejos e Radar), quem vê o perfil e o pacote de
 * boas-vindas do Álbum. "Terminar depois" guarda a tela; o Início mostra "Continuar a chegada". Final sem som.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Figura } from '../components/IAmiguinho';
import { navigate } from '../lib/router';
import { actions, currentHistory, getState, journeyForGame, useStore } from '../data/store';
import type { Game, ID } from '../data/types';
import { HANDLE_RE, profileApi, type MyProfile, type Visibility } from '../data/profileApi';
import { ensureRules } from '../data/moderationApi';
import { loadGame, searchGames, type Hit } from '../components/AddGameDialog';
import { arrivalClassics, arrivalUpcoming } from '../data/arrivalApi';
import { albumApi, albumNow, reloadAlbum, useAlbum, type Pack } from '../data/albumApi';
import { CHAPTERS, LAST, PLAT_GROUPS, STEPS, canonOf, chapterIndex, chipOf, daysUntil, plural } from '../lib/arrival';
import { platformRank, shortPlatform } from '../lib/platforms';
import { reduceMotion } from '../components/album/fx';
import { ensureDefs } from '../components/album/render';
import { PackOpening } from '../components/album/PackOpening';
import { Finale } from '../components/arrival/Finale';
import '../styles/arrival.css';

const ART = { ellie: '/demo/scene-tlou-ellie.webp', kratos: '/demo/scene-astro-kratos.webp', gta: '/demo/scene-gta6-city.webp', yk: '/demo/scene-yakuza-street.webp', horse: '/demo/scene-tlou-horse.webp', sky: '/demo/scene-astro-sky.webp', field: '/demo/scene-tlou-field.webp' };
const VIS: [Visibility, string, string][] = [
  ['publico', 'Aberto', 'Qualquer pessoa vê o que você escolher mostrar.'],
  ['link', 'Só com link', 'Só quem tiver o seu link consegue abrir.'],
  ['privado', 'Fechado', 'Ninguém vê. Você pode abrir depois.'],
];
const VITRINE = 'Os que marcaram a minha vida';
const BEATS: [string, string][] = [
  ['Jogar', 'Toque em Jogar quando começar. O tempo corre sozinho, sem formulário.'],
  ['Guardar um momento', 'Viu algo marcante? Guarde uma foto ou uma frase. Vira um ponto na linha do tempo.'],
  ['Recado para depois', 'Ao parar, deixe um recado para o você do futuro.'],
  ['Cápsula de Retomada', 'Ficou meses sem jogar? Ela lembra onde você parou.'],
];
const Check = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
const SearchIc = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
const msgOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora. Tente de novo.');

/** Capa (ou, sem capa, um cartão com o nome). */
function Cover({ g, className = '' }: { g: Pick<Game, 'title' | 'cover'> & { year?: number; platforms?: string[] }; className?: string }) {
  const h = [...g.title].reduce((t, c) => (t * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span className={`ar-cv ${className}`}>
      {g.cover ? <img src={g.cover} alt="" loading="lazy" /> : <span className="ar-tc" style={{ ['--h' as string]: h }}><b>{g.title}</b><small>{g.year ?? ''}</small></span>}
    </span>
  );
}

/** O plano de fundo de cada tela. */
function Backdrop({ step, game, up }: { step: number; game: Game | null; up: Game | null }) {
  if (step === 0) return (
    <div className="ar-bgl">
      {[ART.ellie, ART.kratos, ART.gta, ART.yk].map((s, i) => <img key={s} className="ar-xf" src={s} alt="" style={{ animationDelay: `${i * 6}s` }} />)}
      <div className="ar-sh" style={{ background: 'linear-gradient(90deg, rgba(7,8,10,.94) 0, rgba(7,8,10,.55) 50%, rgba(7,8,10,.25)), linear-gradient(0deg, rgba(7,8,10,.9), rgba(7,8,10,0) 40%)' }} />
    </div>
  );
  const dark = 'linear-gradient(0deg, rgba(7,8,10,.96), rgba(7,8,10,.82) 55%, rgba(7,8,10,.72))';
  const pick = (): [string, string, string, string] => {
    if (step >= 1 && step <= 4) return ['ar-kb', ART.horse, 'blur(8px) brightness(.6)', 'linear-gradient(0deg, rgba(7,8,10,.97), rgba(7,8,10,.8) 60%, rgba(7,8,10,.7))'];
    if (step >= 5 && step <= 7) return ['ar-kb', game?.backdrop ?? ART.sky, 'blur(2px) saturate(1.1)', 'linear-gradient(90deg, rgba(7,8,10,.96) 0, rgba(7,8,10,.82) 45%, rgba(7,8,10,.55)), linear-gradient(0deg, rgba(7,8,10,.95), rgba(7,8,10,0) 50%)'];
    if (step === 8 || step === 9) return ['ar-kb', up?.backdrop ?? ART.gta, 'blur(3px)', dark];
    if (step === 10 || step === 11) return ['ar-kb', ART.ellie, 'blur(6px) brightness(.8)', dark];
    if (step === 12) return ['', ART.field, 'blur(14px) brightness(.35)', 'radial-gradient(700px 500px at 30% 50%, rgba(226,190,132,.14), rgba(7,8,10,0)), rgba(7,8,10,.5)'];
    return ['ar-kb', ART.kratos, 'blur(4px) brightness(.5)', 'radial-gradient(900px 500px at 50% 50%, rgba(7,8,10,.55), rgba(7,8,10,.92))'];
  };
  const [cls, src, filter, sh] = pick();
  return <div className="ar-bgl"><img className={cls} src={src} alt="" style={{ filter }} /><div className="ar-sh" style={{ background: sh }} /></div>;
}

/** Busca de jogos do IGDB (um campo; os resultados aparecem embaixo). */
function useSearch(q: string) {
  const games = useStore((s) => s.games);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); return; }
    let alive = true; setBusy(true);
    const id = setTimeout(() => {
      searchGames(t, Object.values(games)).then((r) => { if (alive) setHits(r.hits.slice(0, 8)); }).catch(() => alive && setHits([])).finally(() => alive && setBusy(false));
    }, 320);
    return () => { alive = false; clearTimeout(id); };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return { hits, busy };
}

export function ArrivalPage({ start }: { start?: number }) {
  return <Arrival start={start} />;
}

/** No primeiro acesso, só a tela do @ (o resto do site espera o @). */
export function ArrivalGate({ suggestion, onDone }: { suggestion: string; onDone: () => void }) {
  return <Arrival gate suggestion={suggestion} onGateDone={onDone} />;
}

function Arrival({ start, gate, suggestion = '', onGateDone }: { start?: number; gate?: boolean; suggestion?: string; onGateDone?: () => void }) {
  const st = useStore((s) => s);
  const saved = st.prefs.chegada;
  const motion = !reduceMotion();
  const [step, setStep] = useState(() => (gate ? 0 : start ?? (saved && !saved.fim ? Math.min(saved.passo, LAST - 1) : 0)));
  const [me, setMe] = useState<MyProfile | null>(null);
  const [handle, setHandle] = useState(() => (st.profile?.name ?? suggestion).replace(/[^A-Za-z0-9_]/g, '').slice(0, 24));
  const [plats, setPlats] = useState<string[]>(() => st.prefs.plataformas ?? []);
  const [classics, setClassics] = useState<Game[] | null>(null);
  const [picks, setPicks] = useState<Game[]>(() => st.favorites.map((id) => st.games[id]).filter(Boolean).slice(0, 10));
  const [nowGame, setNowGame] = useState<Game | null>(() => (saved?.jogo ? st.games[saved.jogo] ?? null : null));
  const [nowPlat, setNowPlat] = useState<string | null>(saved?.plataforma ?? null);
  const [beat, setBeat] = useState(0);
  const [choice, setChoice] = useState<'agora' | 'depois'>('agora');
  const [progress, setProgressV] = useState(0);
  const [upcoming, setUpcoming] = useState<Game[] | null>(null);
  const [ups, setUps] = useState<Game[]>(() => (saved?.ups ?? []).map((id) => st.games[id]).filter(Boolean));
  const [notify, setNotify] = useState(st.prefs.comunidade?.aviso_lancamentos !== false);
  const [cal, setCal] = useState('');
  const [vis, setVis] = useState<Visibility>('privado');
  const [pack, setPack] = useState<Pack | null>(null);
  const [opened, setOpened] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const stageRef = useRef<HTMLElement | null>(null);

  useEffect(() => { ensureDefs(); }, []);
  useEffect(() => { profileApi.mine().then((p) => { setMe(p); if (p.handle) setHandle(p.handle); const v = p.visibility?.colecao ?? p.visibility?.jornada; if (v) setVis(v === 'amigos' ? 'link' : v); }).catch(() => {}); }, []);
  // Guarda a tela (para "Continuar a chegada") e volta ao topo a cada tela.
  useEffect(() => {
    setErr('');
    stageRef.current?.scrollTo?.({ top: 0 });
    if (gate || step === 0 || step >= LAST) return;
    actions.setPrefs({ chegada: { ...(getState().prefs.chegada ?? { passo: 0 }), passo: step, fim: false, jogo: nowGame?.id ?? null, plataforma: nowPlat, ups: ups.map((u) => u.id), at: new Date().toISOString() } });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  // Os jogos de cada tela.
  useEffect(() => {
    if (step === 2 && !classics) arrivalClassics(st.mode, canonOf(plats)).then(setClassics).catch(() => setClassics([]));
    if ((step === 8 || step === 9) && !upcoming) arrivalUpcoming(st.mode).then(setUpcoming).catch(() => setUpcoming([]));
    if (step === 12 && !pack) albumApi.welcome().then(setPack).catch((e) => setErr(msgOf(e)));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if ((step === 6 || step === 7) && !nowGame) setStep(5); }, [step, nowGame]);
  const go = (n: number) => setStep(Math.max(gate ? 0 : 1, Math.min(LAST, n)));
  const later = () => { navigate('/'); };
  const owned = (gameId: ID) => getState().copies.some((c) => c.gameId === gameId);
  const platFor = (g: Game) => {
    const mine = canonOf(plats);
    return g.platforms.find((p) => mine.includes(p)) ?? [...g.platforms].sort(platformRank)[0] ?? 'Outra plataforma';
  };
  const addCopyOf = (g: Game, platform?: string) => {
    actions.mergeGames([g]);
    if (owned(g.id)) return;
    const p = platform ?? platFor(g);
    actions.addCopy({ gameId: g.id, platform: p, kind: /PC|Android|iOS/.test(p) ? 'digital' : 'fisico' });
  };

  /* ---- O que cada "Continuar" grava ---- */
  async function next() {
    setErr('');
    try {
      if (step === 0) {
        const h = handle.trim();
        if (!HANDLE_RE.test(h)) { setErr('Use só letras sem acento, números ou _, de 3 a 24.'); return; }
        if (h.toLowerCase() !== (me?.handle ?? st.profile?.name ?? '').toLowerCase() || (gate && !me?.handle)) {
          setBusy(true);
          const p = await profileApi.setHandle(h);
          actions.setProfileName(p.handle ?? h); setMe(p);
        }
        if (gate) { onGateDone?.(); navigate('/chegada?passo=1', { replace: true }); return; }
        return go(1);
      }
      if (step === 1) {
        actions.setPrefs({ plataformas: plats });
        const have = new Set((getState().hardware ?? []).map((h) => h.name.toLowerCase()));
        for (const label of plats) {
          const c = chipOf(label); if (!c.hw) continue;
          const name = c.hwName ?? c.canon ?? label;
          if (have.has(name.toLowerCase())) continue;
          actions.addHardware({ kind: c.hw, name, platform: c.canon ?? undefined }); have.add(name.toLowerCase());
        }
        return go(2);
      }
      if (step === 2) {
        if (picks.length) {
          actions.mergeGames(picks);
          const fav = new Set(getState().favorites);
          for (const g of picks) if (!fav.has(g.id)) actions.toggleFavorite(g.id);
        }
        return go(picks.length ? 3 : 4);
      }
      if (step === 3) {
        const s = getState();
        if (!s.showcases?.some((x) => x.kind === 'inteligente' && x.rule?.type === 'favoritos')) actions.saveShowcase({ title: VITRINE, kind: 'inteligente', rule: { type: 'favoritos' }, items: [] });
        return go(4);
      }
      if (step === 5) { if (!nowGame) { setErr('Escolha o jogo, ou toque em "Não estou jogando nada agora".'); return; } return go(6); }
      if (step === 6) { if (beat < 3) { setBeat(beat + 1); return; } return go(7); }
      if (step === 7 && nowGame) {
        addCopyOf(nowGame, nowPlat ?? undefined);
        if (choice === 'agora') {
          actions.ensureJourney(nowGame.id);
          const s = getState(); const j = journeyForGame(s, nowGame.id);
          if (j) { const h = currentHistory(s, j.id); if (h && progress > 0) actions.setProgress(h.id, progress); actions.addFocus(j.id); }
        }
        return go(8);
      }
      if (step === 8) {
        if (ups.length) {
          actions.mergeGames(ups);
          const w = new Set(getState().wishes.map((x) => x.gameId));
          for (const g of ups) if (!w.has(g.id)) actions.toggleWish(g.id);
          return go(9);
        }
        return go(10);
      }
      if (step === 9) {
        for (const g of ups) if (!getState().myGames[g.id]?.onRadar) actions.toggleRadar(g.id);
        actions.setPrefs({ comunidade: { ...(getState().prefs.comunidade ?? {}), aviso_lancamentos: notify } });
        return go(10);
      }
      if (step === 10) {
        const cur = me?.visibility?.colecao ?? 'privado';
        if (me && (cur !== vis || me.visibility?.jornada !== vis)) {
          if (vis !== 'privado' && !(await ensureRules())) return;
          setBusy(true);
          const p = await profileApi.save(me.handle ?? handle, me.bio ?? '', { ...me.visibility, jornada: vis, colecao: vis, notas: vis });
          setMe(p);
        }
        return go(11);
      }
      if (step === 13) {
        actions.setPrefs({ chegada: { ...(getState().prefs.chegada ?? { passo: 0 }), passo: LAST, fim: true, at: new Date().toISOString() }, welcomeDone: true });
        return go(14);
      }
      return go(step + 1);
    } catch (e) { setErr(msgOf(e)); } finally { setBusy(false); }
  }
  function skip() {
    if (step === 5) { setNowGame(null); return go(8); }
    if (step === 8) { setUps([]); return go(10); }
    if (step === 9) { actions.setPrefs({ comunidade: { ...(getState().prefs.comunidade ?? {}), aviso_lancamentos: notify } }); return go(10); }
    if (step === 1 || step === 2) return go(step === 1 ? 2 : 4);
    return go(step + 1);
  }

  const cur = chapterIndex(step);
  const [, hint0, goT0, skipT] = STEPS[step];
  let hint = hint0, goT = goT0;
  if (step === 1) hint = plural(plats.length, 'plataforma', 'plataformas');
  if (step === 2) hint = picks.length ? plural(picks.length, 'escolhido', 'escolhidos') : 'Escolha pelo menos um';
  if (step === 6 && beat < 3) goT = 'Próximo';
  if (step === 7) goT = choice === 'agora' ? 'Começar a Jornada' : 'Deixar para depois';
  if (step === 8) hint = plural(ups.length, 'escolhido', 'escolhidos');
  if (step === 12) goT = 'Continuar';
  const finishing = step === LAST;

  return (
    <div className="ar-tour">
      {!finishing && <Backdrop step={step} game={nowGame} up={ups[0] ?? null} />}
      {step === 0 && (
        <>
          <div className="ar-lb t" /><div className="ar-lb b" />
          <Hello handle={handle} setHandle={setHandle} mine={me?.handle ?? null} busy={busy} err={err} onGo={() => void next()} gate={!!gate} />
        </>
      )}
      {step > 0 && !finishing && (
        <>
          <header className="ar-top">
            <span className="ar-brand"><svg width="36" height="20" viewBox="0 0 506 280" aria-hidden="true"><path fill="url(#alb-wzgold)" d="M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM70 0H170L148 54H92ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256Z" /></svg><span>WINNERZ</span></span>
            <nav className="ar-ems" aria-label="O que você já conheceu">
              {CHAPTERS.map((c, i) => (
                <button key={c.key} className={`ar-em${i < cur ? ' is-done' : i === cur ? ' is-now' : ''}`} onClick={() => go(c.first)} aria-label={c.label} aria-current={i === cur ? 'step' : undefined}>
                  <img src={c.img} alt="" /><span>{c.label}</span>
                </button>
              ))}
            </nav>
            <button className="ar-later" onClick={later}>Terminar depois<span> · tudo fica salvo</span></button>
          </header>
          <section className="ar-stage ar-cap" key={step} ref={(el) => { stageRef.current = el; }}>
            {step === 1 && <Platforms plats={plats} setPlats={setPlats} name={`@${handle}`} />}
            {step === 2 && <Marks classics={classics} picks={picks} setPicks={setPicks} />}
            {step === 3 && <Vitrine picks={picks} name={`@${handle}`} onOwn={(g, on) => { if (on) addCopyOf(g); else { const c = getState().copies.find((x) => x.gameId === g.id); if (c) actions.deleteCopy(c.id); } }} />}
            {step === 4 && <MyCollection plats={plats} picks={picks} />}
            {step === 5 && <PlayingNow game={nowGame} setGame={(g) => { setNowGame(g); setNowPlat(g ? platFor(g) : null); }} plat={nowPlat} setPlat={setNowPlat} plats={plats} />}
            {step === 6 && nowGame && <Simulation game={nowGame} beat={beat} setBeat={setBeat} />}
            {step === 7 && nowGame && <StartNow game={nowGame} choice={choice} setChoice={setChoice} progress={progress} setProgress={setProgressV} />}
            {step === 8 && <Releases list={upcoming} ups={ups} setUps={setUps} />}
            {step === 9 && <RadarStep ups={ups} notify={notify} setNotify={setNotify} cal={cal} setCal={setCal} demo={st.mode === 'demo'} />}
            {step === 10 && <Profile handle={handle} vis={vis} setVis={setVis} picks={picks} game={choice === 'agora' ? nowGame : null} progress={progress} ups={ups} cover={nowGame?.backdrop ?? picks[0]?.backdrop ?? ART.ellie} />}
            {step === 11 && <Community game={nowGame} progress={progress} />}
            {step === 12 && <AlbumStep pack={pack} onDone={(n) => { setOpened(n); go(13); }} />}
            {step === 13 && <Done name={`@${handle}`} five={[
              plural(plats.length, 'plataforma', 'plataformas') + ` · ${picks.length ? '1 vitrine' : 'sem vitrine'} · ${getState().copies.length} na estante`,
              nowGame ? (choice === 'agora' ? `${nowGame.title} em andamento` : `${nowGame.title} pronto para jogar`) : 'Pronta para o primeiro jogo',
              ups.length ? `${ups.length} no Radar${nearest(ups)}` : 'O Radar espera o próximo lançamento',
              `@${handle} · perfil ${vis === 'publico' ? 'aberto' : vis === 'link' ? 'só com link' : 'fechado'}`,
              opened ? `${plural(opened, 'figurinha', 'figurinhas')} no álbum` : 'Pacote de boas-vindas guardado',
            ]} />}
            {err && <p className="ar-err" role="alert">{err}</p>}
          </section>
          <footer className="ar-foot">
            <button className="ar-back" onClick={() => go(step === 4 && !picks.length ? 2 : step === 8 && !nowGame ? 5 : step === 10 && !ups.length ? 8 : step - 1)} disabled={step <= 1 && !!gate} style={{ visibility: step <= 1 ? 'hidden' : 'visible' }}>← Voltar</button>
            <span className="ar-hint">{hint}</span>
            {skipT && <button className="ar-skip" onClick={skip}>{skipT}</button>}
            <button className="ar-zb ar-zbA ar-go" onClick={() => void next()} disabled={busy}>{busy ? 'Guardando…' : goT}</button>
          </footer>
        </>
      )}
      {finishing && <Finale still={!motion} onDone={() => navigate('/', { replace: true })} />}
    </div>
  );
}

function nearest(ups: Game[]): string {
  const d = ups.map((g) => daysUntil(g.releasedOn)).filter((x): x is number => x != null && x >= 0).sort((a, b) => a - b)[0];
  const g = ups.find((x) => daysUntil(x.releasedOn) === d);
  return d != null && g ? ` · ${g.title} em ${plural(d, 'dia', 'dias')}` : '';
}

/* ---- 0 · Olá ---- */
function Hello({ handle, setHandle, mine, busy, err, onGo, gate }: { handle: string; setHandle: (v: string) => void; mine: string | null; busy: boolean; err: string; onGo: () => void; gate: boolean }) {
  const [free, setFree] = useState<boolean | null>(null);
  const h = handle.trim();
  const valid = HANDLE_RE.test(h);
  const same = !!mine && mine.toLowerCase() === h.toLowerCase();
  useEffect(() => {
    setFree(null);
    if (!valid || same) return;
    let alive = true;
    const t = setTimeout(() => { profileApi.available(h).then((ok) => alive && setFree(ok)).catch(() => {}); }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [h, valid, same]);
  const msg = !h ? 'De 3 a 24 letras, números ou _.' : !valid ? 'Use só letras sem acento, números ou _, de 3 a 24.' : same ? 'Esse é o seu @.' : free === false ? 'Esse @ não está disponível. Tente outro.' : free ? 'Disponível.' : 'Conferindo…';
  return (
    <form className="ar-hello ar-cap" onSubmit={(e) => { e.preventDefault(); if (valid && free !== false) onGo(); }}>
      <span className="ar-kick">WinnerZ <span style={{ color: '#7D848D' }}>· primeira visita</span></span>
      <h1 className="ar-big">Olá.</h1>
      <p className="ar-lead">Aqui cada jogo vira uma história: o que você tem, o que já jogou, o que está jogando e o que vem por aí. Vamos montar o seu WinnerZ juntos, em poucos minutos.</p>
      <div className="ar-field">
        <label className="ar-lbl" htmlFor="ar-handle">Para começar, escolha o seu @</label>
        <div className="ar-in">
          <span style={{ color: '#E2BE84' }}>@</span>
          <input id="ar-handle" value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s/g, ''))} maxLength={24} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!!h && !valid} aria-describedby="ar-handle-msg" />
          {(same || free) && valid && <span className="ar-ok0"><Check /> {same ? 'é o seu' : 'disponível'}</span>}
          <button className="ar-zb ar-zbA" disabled={!valid || free === false || busy}>{busy ? 'Guardando…' : 'Começar'}</button>
        </div>
        <span id="ar-handle-msg" className={`ar-handle-msg${!valid && h ? ' is-bad' : free === false ? ' is-bad' : free || same ? ' is-ok' : ''}`} role="status">{msg}</span>
        <span className="ar-small">É o seu endereço no WinnerZ: winnerz.com.br/@{h.toLowerCase() || 'voce'}. {gate ? 'Depois vem um passeio de uns 5 minutos; dá para parar e continuar depois.' : 'O passeio leva uns 5 minutos; dá para parar e continuar depois.'}</span>
        {err && <p className="ar-err" role="alert">{err}</p>}
      </div>
    </form>
  );
}

/* ---- 1 · Onde você joga ---- */
function Platforms({ plats, setPlats, name }: { plats: string[]; setPlats: (v: string[]) => void; name: string }) {
  const [other, setOther] = useState('');
  const [typing, setTyping] = useState(false);
  const flip = (l: string) => setPlats(plats.includes(l) ? plats.filter((x) => x !== l) : [...plats, l]);
  const extra = plats.filter((p) => !PLAT_GROUPS.some((g) => g.chips.some((c) => c.label === p)));
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-colecao.webp" alt="" />Coleção</span>
      <h1 className="ar-h1">Onde você joga, <em>{name}</em>?</h1>
      <p className="ar-lead">Marque os consoles e as lojas que você tem ou usa. Cada um vira uma prateleira na sua estante, e as sugestões dos próximos passos saem daqui.</p>
      <div className="ar-plat">
        <div className="ar-groups">
          {PLAT_GROUPS.map((g, gi) => (
            <div className="ar-grp" key={g.label}>
              <span className="ar-lbl">{g.label}</span>
              <div className="ar-chips" role="group" aria-label={g.label}>
                {g.chips.map((c) => <button key={c.label} type="button" className={`ar-chip${plats.includes(c.label) ? ' on' : ''}`} aria-pressed={plats.includes(c.label)} onClick={() => flip(c.label)}><span className="ar-ck"><Check /></span>{c.label}</button>)}
                {gi === PLAT_GROUPS.length - 1 && extra.map((p) => <button key={p} type="button" className="ar-chip on" aria-pressed onClick={() => flip(p)}><span className="ar-ck"><Check /></span>{p}</button>)}
                {gi === PLAT_GROUPS.length - 1 && (typing
                  ? <form className="ar-chip" onSubmit={(e) => { e.preventDefault(); const v = other.trim().slice(0, 40); if (v && !plats.includes(v)) setPlats([...plats, v]); setOther(''); setTyping(false); }}><input autoFocus value={other} onChange={(e) => setOther(e.target.value)} onBlur={() => !other && setTyping(false)} placeholder="Nome da plataforma" aria-label="Outra plataforma" style={{ background: 'none', border: 0, outline: 0, color: '#F2F4F6', font: 'inherit', width: 160 }} /></form>
                  : <button type="button" className="ar-chip" style={{ color: '#7D848D' }} onClick={() => setTyping(true)}>+ Escrever outra…</button>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="ar-lbl">Sua estante já está tomando forma</span>
          <div className="ar-mini-shelf">{(plats.length ? plats.slice(0, 7) : ['']).map((p, i) => <div className="ar-row" key={p || i}><b>{p || '—'}</b><i>{p ? 'prateleira vazia' : 'marque uma plataforma'}</i></div>)}</div>
          <div className="ar-tip"><span className="ar-ic">i</span><span>Tem o console guardado na gaveta? Marque também. Na <b>Coleção</b> você registra consoles, edições e acessórios.</span></div>
        </div>
      </div>
    </>
  );
}

/* ---- 2 · Os que marcaram ---- */
function Marks({ classics, picks, setPicks }: { classics: Game[] | null; picks: Game[]; setPicks: (v: Game[]) => void }) {
  const [q, setQ] = useState('');
  const { hits, busy } = useSearch(q);
  const [adding, setAdding] = useState('');
  const flip = (g: Game) => setPicks(picks.some((x) => x.id === g.id) ? picks.filter((x) => x.id !== g.id) : [...picks, g]);
  const list = useMemo(() => { const extra = picks.filter((p) => !(classics ?? []).some((c) => c.id === p.id)); return [...extra, ...(classics ?? [])]; }, [classics, picks]);
  const add = async (h: Hit) => {
    setAdding(h.slug);
    try { const g = await loadGame(h); if (g && !picks.some((x) => x.id === g.id)) setPicks([...picks, g]); setQ(''); } finally { setAdding(''); }
  };
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-colecao.webp" alt="" />Coleção</span>
      <h1 className="ar-h1">Quais jogos marcaram a sua vida?</h1>
      <div className="ar-rowx">
        <p className="ar-lead" style={{ maxWidth: 640 }}>Escolha quantos quiser. São clássicos das plataformas que você marcou; se faltar algum, busque.</p>
        <label className="ar-search ar-sx"><SearchIc /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar qualquer jogo…" aria-label="Buscar qualquer jogo" /></label>
      </div>
      {q.trim().length >= 2 && (
        <div className="ar-searchres" aria-live="polite">
          {busy && !hits.length ? <span className="ar-load">Buscando…</span> : hits.length === 0 ? <span className="ar-load">Nada encontrado.</span> :
            hits.map((h) => <button key={h.slug} type="button" className="ar-chip" disabled={!!adding} onClick={() => void add(h)}>{adding === h.slug ? 'Abrindo…' : `+ ${h.title}${h.year ? ` (${h.year})` : ''}`}</button>)}
        </div>
      )}
      {classics === null ? <p className="ar-load">Buscando os clássicos das suas plataformas…</p> : (
        <div className="ar-g10">
          {list.slice(0, 20 + picks.length).map((g) => {
            const n = picks.findIndex((x) => x.id === g.id);
            return (
              <button key={g.id} type="button" className={`ar-pick${n >= 0 ? ' on' : ''}`} aria-pressed={n >= 0} onClick={() => flip(g)} aria-label={g.title}>
                <span className="ar-n">{n + 1}</span><Cover g={g} /><small>{g.title}</small>
              </button>
            );
          })}
        </div>
      )}
      <div className="ar-tray">
        <span className="ar-lbl" style={{ flex: 'none', width: 150 }}>Sua primeira vitrine</span>
        <div className="ar-slots">
          {picks.slice(0, 10).map((g) => <Cover key={g.id} g={g} />)}
          {Array.from({ length: Math.max(0, 10 - picks.length) }, (_, i) => <span className="ar-ghost" key={i} />)}
        </div>
        <span style={{ fontSize: 14, color: '#C9CED4' }}>{plural(picks.length, 'jogo', 'jogos')}</span>
      </div>
    </>
  );
}

/* ---- 3 · A primeira vitrine ---- */
function Vitrine({ picks, name, onOwn }: { picks: Game[]; name: string; onOwn: (g: Game, on: boolean) => void }) {
  const copies = useStore((s) => s.copies);
  const has = (id: ID) => copies.some((c) => c.gameId === id);
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-colecao.webp" alt="" />Coleção</span>
      <div className="ar-vit">
        <div className="ar-case"><span className="ar-glass" />
          <div className="ar-items">
            {picks.slice(0, 7).map((g, i) => (
              <div className="ar-it" key={g.id} style={{ animationDelay: `${(0.1 + i * 0.09).toFixed(2)}s` }}>
                <Cover g={g} />
                <button type="button" className={`ar-own${has(g.id) ? ' on' : ''}`} aria-pressed={has(g.id)} aria-label={`${g.title}: ${has(g.id) ? 'na estante' : 'tenho'}`} onClick={() => onOwn(g, !has(g.id))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4v16M20 4v16M4 12h16M4 20h16" /></svg> {has(g.id) ? 'Na estante' : 'Tenho'}
                </button>
              </div>
            ))}
          </div>
          <div className="ar-plate"><b>{VITRINE}</b><small>Vitrine de {name} · {plural(picks.length, 'jogo', 'jogos')}</small></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h1 className="ar-h1" style={{ fontSize: 44 }}>Você acabou de montar a sua primeira <em>vitrine</em>.</h1>
          <p className="ar-lead" style={{ fontSize: 16 }}>Vitrines são as prateleiras especiais da sua coleção, para mostrar o que importa. Esta junta os seus favoritos que estão na estante.</p>
          <ul className="ar-list">
            <li><span>01</span><span><b>Mude quando quiser:</b> a ordem, os jogos, o nome. Ou apague.</span></li>
            <li><span>02</span><span><b>Crie outras:</b> só os zerados, só os do PS2, as edições de colecionador.</span></li>
            <li><span>03</span><span><b>Mostre no perfil</b> ou guarde só para você. Dá para compartilhar por link.</span></li>
          </ul>
          <div className="ar-tip"><span className="ar-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4v16M20 4v16M4 12h16M4 20h16" /></svg></span><span>Ainda tem algum destes em casa? Toque em <b>Tenho</b> embaixo da capa e ele entra na sua estante.</span></div>
        </div>
      </div>
    </>
  );
}

/* ---- 4 · A sua coleção ---- */
function MyCollection({ plats, picks }: { plats: string[]; picks: Game[] }) {
  const copies = useStore((s) => s.copies);
  const games = useStore((s) => s.games);
  const shelves = canonOf(plats).slice(0, 6).map((p) => { const c = copies.find((x) => x.platform === p && games[x.gameId]); return { n: shortPlatform(p), g: c ? games[c.gameId] : null }; });
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-colecao.webp" alt="" />Coleção</span>
      <div className="ar-col">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>
          <h1 className="ar-h1" style={{ fontSize: 46 }}>A sua coleção já começou.</h1>
          <div className="ar-stats"><div><b>{plats.length}</b><span>plataformas</span></div><div><b>{copies.length}</b><span>{copies.length === 1 ? 'jogo' : 'jogos'} na estante</span></div><div><b>{picks.length ? 1 : 0}</b><span>vitrine</span></div></div>
          {shelves.length > 0 && <div className="ar-wall">{shelves.map((h) => <div className="ar-shf" key={h.n}><div className="ar-bd">{h.g ? <Cover g={h.g} /> : <span className="ar-sp" />}<span className="ar-sp" /></div><b>{h.n}</b></div>)}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="ar-lbl">Complete no seu ritmo, sem pressa</span>
          <div className="ar-ways">
            <Way icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>} title="Pela câmera" text="Aponte para o código de barras da caixa ou fotografe as capas. O WinnerZ reconhece os jogos." />
            <Way icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M10 3v18" /></svg>} title="Pela planilha" text="Já tem a sua lista? Importe a planilha e confira cada jogo antes de entrar." />
            <Way icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></svg>} title="Pela Steam" text="Cole o link do seu perfil e traga a biblioteca de uma vez." />
          </div>
          <div className="ar-tip"><span className="ar-ic">i</span><span>Quando a coleção crescer, ela vira um <b>Museu</b>, com visita guiada pelas suas salas.</span></div>
        </div>
      </div>
    </>
  );
}
const Way = ({ icon, title, text }: { icon: ReactNode; title: string; text: string }) => <div className="ar-way"><span className="ar-ic">{icon}</span><div><b>{title}</b><p>{text}</p></div></div>;

/* ---- 5 · Jogando agora ---- */
function PlayingNow({ game, setGame, plat, setPlat, plats }: { game: Game | null; setGame: (g: Game | null) => void; plat: string | null; setPlat: (p: string) => void; plats: string[] }) {
  const [q, setQ] = useState('');
  const { hits, busy } = useSearch(q);
  const [loading, setLoading] = useState('');
  const pick = async (h: Hit) => { setLoading(h.slug); try { const g = await loadGame(h); if (g) { actions.mergeGames([g]); setGame(g); } } finally { setLoading(''); } };
  const mine = canonOf(plats);
  const options = game ? [...new Set(game.platforms)].sort((a, b) => Number(mine.includes(b)) - Number(mine.includes(a)) || platformRank(a) - platformRank(b)).slice(0, 4) : [];
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-jornada.webp" alt="" />Jornada</span>
      <div className="ar-now">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h1 className="ar-h1">E agora, o que você está jogando?</h1>
          <p className="ar-lead">Escreva o nome. A gente acha o jogo para você.</p>
          <label className="ar-search" style={{ boxShadow: 'inset 0 0 0 1.5px #FFB25B' }}><SearchIc /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={game ? game.title : 'Nome do jogo'} aria-label="Nome do jogo" autoFocus={!game} /></label>
          {(q.trim().length >= 2 || game) && (
            <div className="ar-drop" aria-live="polite">
              {q.trim().length >= 2 ? (busy && !hits.length ? <span className="ar-load" style={{ padding: 10 }}>Buscando…</span> : hits.length === 0 ? <span className="ar-load" style={{ padding: 10 }}>Nada encontrado.</span> :
                hits.slice(0, 4).map((h) => (
                  <button key={h.slug} type="button" className={`ar-res${game?.slug === h.slug ? ' on' : ''}`} onClick={() => void pick(h)} disabled={!!loading}>
                    <Cover g={{ title: h.title, cover: h.cover, year: h.year }} /><span><b>{h.title}</b><small>{[h.year, h.platforms.slice(0, 3).map(shortPlatform).join(', ')].filter(Boolean).join(' · ')}</small></span>
                    <span className="ar-pill">{loading === h.slug ? 'Abrindo…' : game?.slug === h.slug ? 'Este' : ''}</span>
                  </button>
                ))) : game && (
                <div className="ar-res on"><Cover g={game} /><span><b>{game.title}</b><small>{[game.developer, game.year].filter(Boolean).join(' · ')}</small></span><span className="ar-pill">Este</span></div>
              )}
            </div>
          )}
          {game && options.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} role="group" aria-label="Jogando em">
              <span className="ar-lbl" style={{ marginRight: 6 }}>Jogando em</span>
              {options.map((p) => <button key={p} type="button" className={`ar-chip${plat === p ? ' on' : ''}`} aria-pressed={plat === p} onClick={() => setPlat(p)}><span className="ar-ck"><Check /></span>{shortPlatform(p)}</button>)}
            </div>
          )}
        </div>
        {game && <div className="ar-poster"><img src={game.backdrop ?? game.cover} alt="" /><div className="ar-tx"><span className="ar-kick">Jogando agora</span><b>{game.title}</b><span style={{ color: '#9AA1AA', fontSize: 14 }}>{[game.developer, game.year, plat ? shortPlatform(plat) : null].filter(Boolean).join(' · ')}</span></div></div>}
      </div>
    </>
  );
}

/* ---- 6 · A Jornada simulada ---- */
function Simulation({ game, beat, setBeat }: { game: Game; beat: number; setBeat: (n: number) => void }) {
  const shot = game.screenshots?.[0] ?? game.backdrop ?? ART.kratos;
  const img = [game.backdrop ?? ART.sky, shot, game.backdrop ?? ART.sky, game.backdrop ?? ART.sky][beat];
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-jornada.webp" alt="" />Jornada</span>
      <h1 className="ar-h1" style={{ fontSize: 46 }}>Assim fica a sua Jornada com <em>{game.title}</em></h1>
      <div className="ar-sim">
        <div className="ar-beats">
          {BEATS.map((b, i) => <button key={b[0]} type="button" className={`ar-bt${i === beat ? ' on' : i < beat ? ' seen' : ''}`} onClick={() => setBeat(i)} aria-current={i === beat ? 'step' : undefined}><span className="ar-d">{i + 1}</span><span><b>{b[0]}</b><small>{b[1]}</small></span></button>)}
        </div>
        <div className="ar-scene"><img src={img} alt="" /><span className="ar-tag">Simulação · nada é salvo</span>
          {beat === 0 && <div className="ar-mock"><div className="ar-sbar"><span className="ar-live" /><span><small>Sessão 1 · {game.title}</small><span className="ar-tm">00:42:15</span></span><span className="ar-zb ar-zb2" style={{ minHeight: 40 }}>Pausar</span><span className="ar-zb ar-zbA" style={{ minHeight: 40 }}>Encerrar</span></div></div>}
          {beat === 1 && <div className="ar-mock"><div className="ar-polar"><img src={shot} alt="" /><p>Essa parte me pegou seis vezes. Valeu cada uma.</p><small>Momento guardado · sessão 1 · 00:38</small></div></div>}
          {beat === 2 && <div className="ar-mock"><div className="ar-note"><span className="ar-kick">Recado para a próxima sessão</span><q>Voltar daqui e procurar o segredo que ficou para trás.</q><span className="ar-small">Aparece no seu Início quando você voltar.</span></div></div>}
          {beat === 3 && <div className="ar-mock"><div className="ar-capsule"><span className="ar-kick">Cápsula de Retomada · 3 meses depois</span><span style={{ fontStretch: '125%', fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 0.95 }}>Onde você parou</span><div className="ar-ln"><small>Último recado</small><span>Voltar daqui e procurar o segredo que ficou para trás.</span></div><div className="ar-ln"><small>Progresso</small><span>Uns 30% do jogo, informado por você</span></div><div className="ar-hline"><i style={{ width: '30%' }} /></div><span className="ar-small">Pausar faz parte. O jogo espera você, sem culpa e sem lista de obrigação.</span></div></div>}
          <div className="ar-simnav"><button type="button" className="ar-zb ar-zb2" style={{ minHeight: 40 }} onClick={() => setBeat((beat + 1) % 4)}>{beat < 3 ? 'Próximo momento →' : 'Ver de novo'}</button></div>
        </div>
      </div>
    </>
  );
}

/* ---- 7 · Começar agora? ---- */
function StartNow({ game, choice, setChoice, progress, setProgress }: { game: Game; choice: 'agora' | 'depois'; setChoice: (c: 'agora' | 'depois') => void; progress: number; setProgress: (n: number) => void }) {
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-jornada.webp" alt="" />Jornada</span>
      <h1 className="ar-h1">Quer começar a sua Jornada com <em>{game.title}</em> agora?</h1>
      <p className="ar-lead">Sem formulário. Você pode mudar de ideia quando quiser.</p>
      <div className="ar-two" role="radiogroup" aria-label="Começar agora">
        <div className={`ar-opt${choice === 'agora' ? ' on' : ''}`} role="radio" aria-checked={choice === 'agora'} tabIndex={0} onClick={() => setChoice('agora')} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChoice('agora'); } }}>
          <span className="ar-rd" /><b>Sim, estou jogando</b><p>Ele vira a sua Jornada atual e aparece no topo do Início. A primeira sessão começa quando você tocar em Jogar.</p>
          <span className="ar-slider" onClick={(e) => e.stopPropagation()}>
            <label className="ar-lbl" htmlFor="ar-prog">Mais ou menos onde você está? (opcional)</label>
            <input id="ar-prog" type="range" min={0} max={100} step={5} value={progress} onChange={(e) => { setProgress(Number(e.target.value)); setChoice('agora'); }} aria-valuetext={`${progress}%`} />
            <span className="ar-mk"><span>Comecei agora</span><span>{progress}%</span><span>Quase no fim</span></span>
            <span className="ar-small">Serve para esconder spoilers do que vem depois, na comunidade.</span>
          </span>
        </div>
        <div className={`ar-opt${choice === 'depois' ? ' on' : ''}`} role="radio" aria-checked={choice === 'depois'} tabIndex={0} onClick={() => setChoice('depois')} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChoice('depois'); } }}>
          <span className="ar-rd" /><b>Deixar para depois</b><p>{game.title} fica na sua estante com o botão Jogar pronto. A Jornada começa no dia em que você quiser.</p>
        </div>
      </div>
    </>
  );
}

/* ---- 8 · Lançamentos ---- */
function Releases({ list, ups, setUps }: { list: Game[] | null; ups: Game[]; setUps: (v: Game[]) => void }) {
  const [q, setQ] = useState('');
  const { hits, busy } = useSearch(q);
  const [adding, setAdding] = useState('');
  const flip = (g: Game) => setUps(ups.some((x) => x.id === g.id) ? ups.filter((x) => x.id !== g.id) : [...ups, g]);
  const all = useMemo(() => [...ups.filter((u) => !(list ?? []).some((x) => x.id === u.id)), ...(list ?? [])], [list, ups]);
  const add = async (h: Hit) => { setAdding(h.slug); try { const g = await loadGame(h); if (g && !ups.some((x) => x.id === g.id)) setUps([...ups, g]); setQ(''); } finally { setAdding(''); } };
  const when = (g: Game) => { const d = daysUntil(g.releasedOn); return d == null ? 'Sem data' : d <= 0 ? 'Já saiu' : d < 100 ? `${d} dias` : new Date(`${g.releasedOn}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''); };
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-jogos.webp" alt="" />Jogos</span>
      <h1 className="ar-h1">Quais lançamentos você mais espera?</h1>
      <div className="ar-rowx">
        <p className="ar-lead" style={{ maxWidth: 640 }}>Os mais aguardados dos próximos meses, atualizados sozinhos pelo catálogo do IGDB.</p>
        <label className="ar-search ar-sx"><SearchIc /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar outro lançamento…" aria-label="Buscar outro lançamento" /></label>
      </div>
      {q.trim().length >= 2 && (
        <div className="ar-searchres" aria-live="polite">
          {busy && !hits.length ? <span className="ar-load">Buscando…</span> : hits.length === 0 ? <span className="ar-load">Nada encontrado.</span> :
            hits.map((h) => <button key={h.slug} type="button" className="ar-chip" disabled={!!adding} onClick={() => void add(h)}>{adding === h.slug ? 'Abrindo…' : `+ ${h.title}${h.year ? ` (${h.year})` : ''}`}</button>)}
        </div>
      )}
      {list === null ? <p className="ar-load">Buscando os lançamentos mais aguardados…</p> : all.length === 0 ? <p className="ar-load">Não achei a lista agora. Busque o lançamento que você espera.</p> : (
        <div className="ar-g8">
          {all.slice(0, 16).map((g) => {
            const on = ups.some((x) => x.id === g.id);
            return (
              <button key={g.id} type="button" className={`ar-up${on ? ' on' : ''}`} aria-pressed={on} onClick={() => flip(g)}>
                <span className="ar-cv" style={{ position: 'relative' }}>{g.cover ? <img src={g.cover} alt="" loading="lazy" /> : null}<span className="ar-when">{when(g)}</span></span>
                <b>{g.title}</b><small>{on ? 'Nos desejos' : g.platforms.slice(0, 2).map(shortPlatform).join(' · ')}</small>
              </button>
            );
          })}
        </div>
      )}
      <div className="ar-buddy"><Figura img="cara-curioso" width={40} height={42} lazy={false} enfeite={false} /><span><b>IAmiguinho</b>Lançamento chegando. Eu já separei o lanche.</span></div>
    </>
  );
}

/* ---- 9 · Radar ---- */
function RadarStep({ ups, notify, setNotify, cal, setCal, demo }: { ups: Game[]; notify: boolean; setNotify: (v: boolean) => void; cal: string; setCal: (v: string) => void; demo: boolean }) {
  const [calBusy, setCalBusy] = useState(false);
  const [calErr, setCalErr] = useState('');
  const pos = [['50%', '18%'], ['80%', '58%'], ['26%', '76%']];
  const label = (g: Game) => { const d = daysUntil(g.releasedOn); return d == null ? 'Sem data' : d <= 0 ? 'Já saiu' : `${d} dias`; };
  const sub = (g: Game) => (!g.releasedOn ? 'Anunciado, sem data' : `Sai em ${new Date(`${g.releasedOn}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}`);
  const makeCal = async () => {
    if (cal) { setCal(''); return; }
    if (demo) { setCalErr('Na demonstração não dá para assinar o calendário. Com a sua conta, funciona.'); return; }
    setCalBusy(true); setCalErr('');
    try {
      const { accessToken } = await import('../data/supabaseAdapter');
      const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ radarLink: true }) });
      if (!r.ok) throw new Error();
      const { path } = await r.json();
      setCal(`${location.origin}${path}`);
    } catch { setCalErr('Não consegui criar o link agora. Dá para fazer depois, na página do Radar.'); } finally { setCalBusy(false); }
  };
  const webcal = cal.replace(/^https?:/, 'webcal:');
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-jogos.webp" alt="" />Jogos · Radar</span>
      <div className="ar-rad">
        <div className="ar-radar" aria-hidden="true"><span className="ar-ring" style={{ width: 500, height: 500 }} /><span className="ar-ring" style={{ width: 340, height: 340 }} /><span className="ar-ring" style={{ width: 180, height: 180 }} /><span className="ar-sweep" /><span className="ar-me" />
          {ups.slice(0, 3).map((g, i) => <span className="ar-blip" key={g.id} style={{ left: pos[i][0], top: pos[i][1] }}><Cover g={g} /><small>{label(g)}</small></span>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="ar-h1" style={{ fontSize: 46 }}>Quer acompanhar esses no <em>Radar</em>?</h1>
          <p className="ar-lead" style={{ fontSize: 16 }}>O Radar conta os dias e avisa quando a data muda. Quanto mais perto, mais perto do centro.</p>
          <div className="ar-cds">{ups.slice(0, 3).map((g) => { const d = daysUntil(g.releasedOn); return <div className="ar-cd" key={g.id}><Cover g={g} /><span><b>{g.title}</b><small>{sub(g)}</small></span><span className="ar-n">{d != null && d > 0 ? d : g.releasedOn ? g.releasedOn.slice(0, 4) : '?'}<span>{d != null && d > 0 ? 'dias' : g.releasedOn ? 'ano' : 'sem data'}</span></span></div>; })}</div>
          <button type="button" className={`ar-tg${notify ? ' on' : ''}`} aria-pressed={notify} onClick={() => setNotify(!notify)}><span>Avisar quando sair ou mudar a data<small>No WinnerZ, sem e-mail em excesso.</small></span><span className="ar-sw" /></button>
          <button type="button" className={`ar-tg${cal ? ' on' : ''}`} aria-pressed={!!cal} onClick={() => void makeCal()} disabled={calBusy}><span>Pôr as datas no meu calendário<small>{calBusy ? 'Criando o link…' : 'Google, Apple ou Outlook. Atualiza sozinho.'}</small></span><span className="ar-sw" /></button>
          {cal && <div className="ar-searchres"><a className="ar-chip" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">Google Agenda</a><a className="ar-chip" href={webcal}>Apple ou Outlook</a></div>}
          {calErr && <p className="ar-err">{calErr}</p>}
        </div>
      </div>
    </>
  );
}

/* ---- 10 · O seu perfil ---- */
function Profile({ handle, vis, setVis, picks, game, progress, ups, cover }: { handle: string; vis: Visibility; setVis: (v: Visibility) => void; picks: Game[]; game: Game | null; progress: number; ups: Game[]; cover: string }) {
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-comunidade.webp" alt="" />Comunidade</span>
      <div className="ar-me2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h1 className="ar-h1">Agora, o seu lugar na comunidade.</h1>
          <p className="ar-lead">Este é o seu perfil, montado com o que você escolheu até aqui. É por ele, em winnerz.com.br/@{handle.toLowerCase()}, que os amigos te encontram.</p>
          <div className="ar-field"><span className="ar-lbl">Quem vê o seu perfil</span>
            <div className="ar-seg" role="radiogroup" aria-label="Quem vê o seu perfil">{VIS.map((v) => <button key={v[0]} type="button" role="radio" aria-checked={vis === v[0]} className={vis === v[0] ? 'on' : ''} onClick={() => setVis(v[0])}>{v[1]}</button>)}</div>
            <span className="ar-small">{VIS.find((v) => v[0] === vis)?.[2]} Vale para Coleção, Jornada e notas; dá para ajustar cada um em Preferências.</span>
          </div>
          <div className="ar-tip"><span className="ar-ic">i</span><span>Foto, capa, o jogo que te definiu e os três da vida você ajusta quando quiser, em <b>Preferências</b>.</span></div>
        </div>
        <div className="ar-card"><div className="ar-cvr"><img src={cover} alt="" /></div><span className="ar-av">{handle.slice(0, 1).toUpperCase()}</span>
          <div className="ar-bd"><span className="ar-nm">@{handle}</span><span className="ar-small" style={{ marginTop: -8 }}>No WinnerZ desde {month}</span>
            {game && <div className="ar-ln"><Cover g={game} /><span><small>Jogando agora</small><span>{game.title}{progress ? ` · uns ${progress}%` : ''}</span></span></div>}
            {picks.length > 0 && <div><span className="ar-lbl">{VITRINE}</span><div className="ar-thumbs" style={{ marginTop: 8 }}>{picks.slice(0, 6).map((g) => <Cover key={g.id} g={g} />)}</div></div>}
            {ups[0] && <div className="ar-ln"><Cover g={ups[0]} /><span><small style={{ color: '#9CC3FF' }}>No Radar</small><span>{ups[0].title}{nearestDays(ups[0])}{ups.length > 1 ? ` · e mais ${ups.length - 1}` : ''}</span></span></div>}
          </div>
        </div>
      </div>
    </>
  );
}
const nearestDays = (g: Game) => { const d = daysUntil(g.releasedOn); return d != null && d > 0 ? ` em ${plural(d, 'dia', 'dias')}` : ''; };

/* ---- 11 · O que te espera ---- */
function Community({ game, progress }: { game: Game | null; progress: number }) {
  const ic = (d: ReactNode) => <span className="ar-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{d}</svg></span>;
  return (
    <>
      <span className="ar-kick"><img src="/brand/emb-comunidade.webp" alt="" />Comunidade</span>
      <h1 className="ar-h1">Jogar perto de quem joga o mesmo que você.</h1>
      <p className="ar-lead">Um resumo do que você vai encontrar. Tudo isto já está no ar.</p>
      <div className="ar-cm">
        <div className="ar-cmc lit"><span className="ar-st live">No ar</span>{ic(<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />)}<b>Spoiler pelo seu progresso</b><p>{game ? `Você está em uns ${progress || 0}% de ${game.title}. O que vem depois fica coberto até você querer ver.` : 'O que vem depois de onde você está fica coberto até você querer ver.'}</p>{game && <span className="ar-spo">{game.title} · {Math.min(100, (progress || 0) + 34)}%<span className="ar-blur" /></span>}</div>
        <div className="ar-cmc"><span className="ar-st live">No ar</span>{ic(<path d="M4 5h16v10H9l-5 4z" />)}<b>A Praça</b><p>As conversas de quem você segue e das comunidades, com o motivo de cada uma aparecer. Sem algoritmo escondido.</p></div>
        <div className="ar-cmc"><span className="ar-st live">No ar</span>{ic(<path d="M3 6h12v8H8l-5 3zM9 17h7l5 3v-9h-3" />)}<b>Comunidades com tema</b><p>Espaços por jogo e por assunto, com a comunidade oficial do canal WinnerZ.</p></div>
        <div className="ar-cmc"><span className="ar-st live">No ar</span>{ic(<><circle cx="8" cy="9" r="3.6" /><circle cx="16.5" cy="9" r="3.6" /><path d="M2 21c1-4 3.6-6 6-6s5 2 6 6M13.4 15.4c1-.3 2-.4 3.1-.4 2.6 0 5 2 5.5 6" /></>)}<b>Amigos e mensagens</b><p>Siga quem joga o mesmo que você; quando os dois se seguem, viram amigos e podem conversar.</p></div>
        <div className="ar-cmc"><span className="ar-st live">No ar</span>{ic(<><rect x="3" y="7" width="18" height="11" rx="5" /><path d="M8 11v3M6.5 12.5h3M15 12h.01M17 14h.01" /></>)}<b>Jogatinas e clubes</b><p>Uma noite marcada para jogar junto, ou um clube que segue o mesmo jogo no seu ritmo.</p></div>
        <div className="ar-cmc lit"><span className="ar-st live">No ar</span>{ic(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />)}<b>WinnerZ Awards</b><p>Os melhores do ano, votados pela comunidade. A votação acontece em dezembro.</p></div>
      </div>
    </>
  );
}

/* ---- 12 · Figurinha de boas-vindas ---- */
function AlbumStep({ pack, onDone }: { pack: Pack | null; onDone: (n: number) => void }) {
  const { state } = useAlbum();
  const byId = useMemo(() => Object.fromEntries((state?.stickers ?? []).map((s) => [s.id, s])), [state?.stickers]);
  const sections = useMemo(() => { const o: Record<string, string> = {}; for (const b of state?.books ?? []) for (const p of b.pages) for (const s of state?.stickers ?? []) if (s.pageId === p.id) o[s.id] = p.title; return o; }, [state]);
  const live = !!state?.stickers.some((s) => s.active && state.books.some((b) => b.published && b.pages.some((pg) => pg.id === s.pageId)));
  const [n, setN] = useState(0);
  const openedCount = () => albumNow()?.packs.find((p) => p.id === pack?.id)?.contents?.length ?? 0;
  const paste = async (ids: string[]) => { for (const id of ids) { try { await albumApi.paste(id); } catch { /* fica na bandeja */ } } void reloadAlbum().catch(() => {}); };
  if (!pack || !state) return <p className="ar-load">Preparando o seu pacote…</p>;
  if (pack.state === 'aberto' || !live) return (
    <>
      <span className="ar-kick"><img src="/brand/emb-album.webp" alt="" />Eventos · Álbum</span>
      <h1 className="ar-h1" style={{ fontSize: 46 }}>{pack.state === 'aberto' ? 'O seu pacote de boas-vindas já foi aberto' : 'Um presente de boas-vindas'}</h1>
      <p className="ar-lead">{pack.state === 'aberto' ? 'As figurinhas estão no seu álbum. Figurinhas chegam como celebração: quando você zera um jogo na Jornada, em marcos e com códigos nas lives.' : 'O seu pacote de boas-vindas está guardado em Pacotes e abre assim que o álbum da Temporada for publicado. Figurinhas chegam como celebração: quando você zera um jogo na Jornada, em marcos e com códigos nas lives.'}</p>
    </>
  );
  return (
    <div className="ar-pkhost">
      <PackOpening pack={pack} stickers={byId} sections={sections} more={0} mascote={false} labels={{ paste: 'Guardar no álbum', done: 'Continuar', later: 'Abrir depois' }}
        onPaste={(c) => { const fresh = [...new Set(c.filter((d) => !d.dup).map((d) => d.id))]; setN(c.length); void paste(fresh).then(() => onDone(c.length)); }}
        onNext={() => onDone(n || openedCount())} onClose={() => onDone(n || openedCount())} />
    </div>
  );
}

/* ---- 13 · Pronto ---- */
function Done({ name, five }: { name: string; five: string[] }) {
  return (
    <div className="ar-done">
      <span className="ar-kick">Pronto, {name}</span>
      <h1 className="ar-h1" style={{ fontSize: 64 }}>O seu WinnerZ está montado.</h1>
      <p className="ar-lead" style={{ margin: '0 auto' }}>Tudo o que você escolheu já está no seu Início. Dá para mudar qualquer coisa depois.</p>
      <div className="ar-five">{CHAPTERS.map((c, i) => <div key={c.key} style={{ animationDelay: `${(0.15 + i * 0.12).toFixed(2)}s` }}><img src={c.img} alt="" /><b>{c.label}</b><span>{five[i]}</span></div>)}</div>
    </div>
  );
}
