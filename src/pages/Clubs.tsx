import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, getState, useStore } from '../data/store';
import { communityApi, slugOk, slugify, type Community, type GameMini } from '../data/communityApi';
import {
  ACCESS, FORMATS, FORMAT_LABEL, FORMAT_SHORT, RSVP_LABEL, clubApi, encontroNow, icsFor,
  type Club, type ClubAccess, type ClubDraft, type ClubFormat, type ClubFull, type ClubLocked, type ClubMessage, type ClubPart, type ClubPerson, type Rsvp,
} from '../data/clubApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import { GameSearchPick, ImageGrid, PersonAvatar, PersonLink, PostText, ReactionBar, ago, useProgressOf } from '../components/Posts';
import { PlayButton } from '../components/PlayButton';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { gameBySlug } from '../components/AddGameDialog';
import { shrink } from '../lib/image';
import { communityImage } from '../data/communityApi';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
const TZ = 'America/Sao_Paulo';
const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ });

/** "hoje, 21h", "amanhã, 20h30", "sábado, 18 de out, 21h". */
export function whenLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':00', 'h').replace(':', 'h');
  const k = dayKey(d), today = dayKey(new Date()), tomorrow = dayKey(new Date(Date.now() + 86_400_000)), yesterday = dayKey(new Date(Date.now() - 86_400_000));
  if (k === today) return `hoje, ${hm}`;
  if (k === tomorrow) return `amanhã, ${hm}`;
  if (k === yesterday) return `ontem, ${hm}`;
  const far = Math.abs(d.getTime() - Date.now()) > 6 * 86_400_000;
  return `${d.toLocaleDateString('pt-BR', far ? { day: 'numeric', month: 'short', timeZone: TZ } : { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '')}, ${hm}`;
}
const dateShort = (ymd?: string | null) => (ymd ? new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '') : '');

/** Põe o jogo do clube na Jornada (se ainda não estiver). */
async function addToJourney(game: GameMini | null, clubName: string) {
  if (!game) return;
  const s = getState();
  if (s.journeys.some((j) => j.gameId === game.id)) return;
  const g = s.games[game.id] ?? (await gameBySlug(game.slug));
  if (!g) return;
  if (!s.games[g.id]) actions.mergeGames([g]);
  actions.ensureJourney(g.id, `Entrou no clube “${clubName}”.`);
}

/* ------------------------------------------------------------------ */
/* Cartão do clube (listas)                                             */
/* ------------------------------------------------------------------ */
export function ClubTile({ c }: { c: Club }) {
  const now = encontroNow(c);
  return (
    <Link to={`/clube/${c.slug}`} className={`club-tile club-tile--${c.format}${now ? ' is-now' : ''}`}>
      <span className="club-tile__cv" aria-hidden="true">{c.game ? <CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /> : null}</span>
      <span className="club-tile__tx">
        <span className="club-tile__top">
          <span className={`club-chip club-chip--${c.format}`}>{FORMAT_SHORT[c.format]}</span>
          {c.access !== 'aberto' && <span className="club-chip">{c.access === 'amigos' ? 'Só amigos' : 'Convite'}</span>}
          {now && <span className="club-chip club-chip--now"><span className="session-pill__dot" aria-hidden="true" />Agora</span>}
        </span>
        <b className="club-tile__name">{c.name}</b>
        <small className="muted">{c.format === 'encontro' && c.startsAt ? (c.ended ? `Aconteceu ${whenLabel(c.startsAt)}` : whenLabel(c.startsAt)) : c.game?.title}</small>
        <small className="faint">{c.format === 'encontro' ? `${c.going} ${c.going === 1 ? 'vai' : 'vão'}` : `${c.members} ${c.members === 1 ? 'pessoa' : 'pessoas'}`}{c.me ? ' · você participa' : ''}</small>
      </span>
    </Link>
  );
}

/** Seção de clubes (página Comunidade): encontros dos próximos dias, os seus e os abertos. */
export function ClubsSection() {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [soon, setSoon] = useState<Club[] | null>(null);
  const [mine, setMine] = useState<Club[]>([]);
  const [open, setOpen] = useState<Club[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([clubApi.list('proximos'), mode === 'demo' || signed ? clubApi.list('meus') : Promise.resolve([]), clubApi.list('todos')])
      .then(([a, b, c]) => { if (alive) { setSoon(a); setMine(b.filter((x) => !x.ended || x.format !== 'encontro')); setOpen(c.filter((x) => !x.me)); } })
      .catch(() => alive && setSoon([]));
    return () => { alive = false; };
  }, [mode, signed]);
  if (soon == null) return null;
  return (
    <section className="page club-sec" aria-labelledby="club-sec-t">
      <div className="cm-friends__head">
        <div>
          <span className="kicker kicker--now">Clubes</span>
          <h2 id="club-sec-t" className="t cm-friends__t">Jogar junto, sem compromisso longo</h2>
        </div>
        <span className="club-sec__links"><Link to="/comunidade/clubes" className="cm-friends__people">Todos os clubes →</Link><Link to="/comunidade/clubes/criar" className="btn ghost sm">Criar clube</Link></span>
      </div>
      {soon.length > 0 && <><span className="kicker">Encontros dos próximos dias</span><div className="club-tiles">{soon.slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div></>}
      {mine.length > 0 && <><span className="kicker">Seus clubes</span><div className="club-tiles">{mine.slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div></>}
      {open.length > 0 && <><span className="kicker">Para entrar</span><div className="club-tiles">{open.slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div></>}
      {!soon.length && !mine.length && !open.length && <div className="soc-empty"><b>Nenhum clube ainda.</b><p className="muted">Marque um encontro, chame gente para jogar sem pressa ou acompanhe alguém na primeira vez. <Link to="/comunidade/clubes/criar">Criar clube</Link></p></div>}
    </section>
  );
}

/** Ficha do jogo: clubes deste jogo. */
export function GameClubs({ gameId, slug, title }: { gameId: string; slug: string; title: string }) {
  const [list, setList] = useState<Club[] | null>(null);
  useEffect(() => {
    let alive = true;
    clubApi.list('todos', gameId).then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gameId]);
  if (list == null) return null;
  return (
    <section aria-labelledby="clubes-jogo" className="cm-gamesec">
      <div className="sec-head"><h2 id="clubes-jogo" className="t sec-title">Clubes deste jogo</h2></div>
      {list.length === 0
        ? <p className="muted">Nenhum clube de {title} agora. <Link to={`/comunidade/clubes/criar?jogo=${encodeURIComponent(slug)}`}>Criar um clube</Link></p>
        : <div className="club-tiles">{list.slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Todos os clubes                                                      */
/* ------------------------------------------------------------------ */
export function ClubsIndexPage() {
  const signed = useStore((s) => s.mode === 'demo' || !!s.profile);
  const [tab, setTab] = useState<'todos' | 'proximos' | 'meus'>('todos');
  const [list, setList] = useState<Club[] | null>(null);
  const [fmt, setFmt] = useState<ClubFormat | ''>('');
  useEffect(() => { document.title = 'Clubes · WinnerZ'; }, []);
  useEffect(() => { setList(null); clubApi.list(tab).then(setList).catch(() => setList([])); }, [tab]);
  const shown = (list ?? []).filter((c) => !fmt || c.format === fmt);
  return (
    <main className="page pad cm-index">
      <header className="studio__head">
        <Link to="/comunidade" className="faint">← Comunidade</Link>
        <h1 className="t big">Clubes</h1>
        <p className="muted lead">Clubes que não pedem compromisso longo: uma noite, um jogo sem pressa ou a primeira vez de alguém, com quem já zerou por perto.</p>
      </header>
      <div className="cm-index__bar">
        <div className="seg" role="tablist" aria-label="Quais clubes">
          {([['todos', 'Abertos'], ['proximos', 'Próximos encontros'], ...(signed ? [['meus', 'Os seus']] : [])] as [typeof tab, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        <Link className="btn primary" to="/comunidade/clubes/criar">Criar clube</Link>
      </div>
      <div className="club-filter" role="group" aria-label="Formato">
        <button className={`club-chip${!fmt ? ' is-on' : ''}`} aria-pressed={!fmt} onClick={() => setFmt('')}>Todos os formatos</button>
        {FORMATS.map((f) => <button key={f.k} className={`club-chip club-chip--${f.k}${fmt === f.k ? ' is-on' : ''}`} aria-pressed={fmt === f.k} onClick={() => setFmt(f.k)}>{f.label}</button>)}
      </div>
      {list == null ? <p className="faint">Carregando…</p> : shown.length === 0
        ? <div className="soc-empty"><b>{tab === 'meus' ? 'Você ainda não está em nenhum clube.' : tab === 'proximos' ? 'Nenhum encontro marcado para os próximos dias.' : 'Nenhum clube aberto agora.'}</b><p className="muted"><Link to="/comunidade/clubes/criar">Criar um clube</Link></p></div>
        : <div className="club-tiles">{shown.map((c) => <ClubTile key={c.id} c={c} />)}</div>}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Criar e editar                                                       */
/* ------------------------------------------------------------------ */
const localInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

function ClubForm({ initial, editing, busy, err, onSubmit }: { initial: ClubDraft & { game?: GameMini | null }; editing?: Club; busy: boolean; err: string; onSubmit: (d: ClubDraft) => void }) {
  const [format, setFormat] = useState<ClubFormat>(initial.format);
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [description, setDescription] = useState(initial.description);
  const [game, setGame] = useState<GameMini | null>(initial.game ?? null);
  const [access, setAccess] = useState<ClubAccess>(initial.access);
  const [max, setMax] = useState(initial.maxMembers ? String(initial.maxMembers) : '');
  const [startsAt, setStartsAt] = useState(localInput(initial.startsAt));
  const [duration, setDuration] = useState(initial.durationMin);
  const [live, setLive] = useState(initial.liveUrl ?? '');
  const [parts, setParts] = useState<ClubPart[]>(initial.parts.length ? initial.parts : [{ ordinal: 1, title: '' }, { ordinal: 2, title: '' }, { ordinal: 3, title: '' }]);
  const [firstTime, setFirstTime] = useState(initial.firstTime ?? false);
  const [communityId, setCommunityId] = useState(initial.communityId ?? '');
  const [mine, setMine] = useState<Community[]>([]);
  useEffect(() => { communityApi.mine().then(setMine).catch(() => {}); }, []);
  const s = slugTouched ? slug : slugify(name);
  const slugBad = !editing && s.length > 0 && !slugOk(s);
  const liveBad = live.trim() !== '' && !/^https:\/\/\S{4,}$/.test(live.trim());
  const ready = name.trim().length >= 3 && !!game && !slugBad && !!s && !liveBad && (format !== 'encontro' || !!startsAt) && (format !== 'sem_pressa' || parts.some((p) => p.title.trim()));
  const setPart = (i: number, patch: Partial<ClubPart>) => setParts((l) => l.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  return (
    <form className="cm-form club-form" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ slug: s, name, description, format, gameId: game?.id ?? null, access, maxMembers: max ? Math.max(2, Math.min(500, Number(max))) : null, communityId: communityId || null,
        startsAt: format === 'encontro' && startsAt ? new Date(startsAt).toISOString() : null, durationMin: duration, liveUrl: live.trim() || null,
        parts: parts.filter((p) => p.title.trim()).map((p, i) => ({ ...p, ordinal: i + 1 })), firstTime });
    }}>
      {!editing ? (
        <fieldset className="cm-form__f cm-kinds">
          <legend className="kicker">Formato</legend>
          <div className="cm-kinds__opts club-formats">
            {FORMATS.map((f) => (
              <label key={f.k} className={`cm-kinds__o${format === f.k ? ' is-on' : ''}`}>
                <input type="radio" name="fmt" checked={format === f.k} onChange={() => setFormat(f.k)} />
                <b>{f.label}</b><small>{f.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>
      ) : <p className="faint">Formato: <b>{FORMAT_LABEL[editing.format]}</b> (não muda).</p>}

      <div className="cm-form__f"><span className="kicker">Jogo</span>
        {editing ? <p className="muted">{editing.game?.title} (não muda)</p> : <GameSearchPick value={game} onChange={setGame} label="Jogo do clube" />}
      </div>

      <label className="cm-form__f"><span className="kicker">Nome</span>
        <input className="field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={format === 'encontro' ? 'Ex.: Noite de Astro Bot' : format === 'sem_pressa' ? 'Ex.: Elden Ring sem pressa' : 'Ex.: Primeira vez em Hollow Knight'} />
      </label>
      {!editing && (
        <label className="cm-form__f"><span className="kicker">Endereço</span>
          <span className="cm-form__slug"><span className="mono faint">winnerz.com.br/clube/</span><input className="field" value={s} maxLength={32} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} aria-invalid={slugBad} /></span>
          {slugBad && <small className="awards__error">De 3 a 32 letras minúsculas, números ou hífens.</small>}
        </label>
      )}
      <label className="cm-form__f"><span className="kicker">Sobre o clube</span>
        <textarea className="field" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O combinado: quando, como, para quem." />
      </label>

      {format === 'encontro' && (
        <div className="club-form__row">
          <label className="cm-form__f"><span className="kicker">Dia e hora</span><input className="field" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
          <label className="cm-form__f"><span className="kicker">Duração</span>
            <select className="field" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{[60, 90, 120, 180, 240, 360].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`.replace('.5', 'h30').replace(' hh30', 'h30')}</option>)}</select>
          </label>
          <label className="cm-form__f club-form__wide"><span className="kicker">Link da live ou do Discord (opcional)</span>
            <input className="field" value={live} onChange={(e) => setLive(e.target.value)} placeholder="https://twitch.tv/… ou https://discord.gg/…" inputMode="url" aria-invalid={liveBad} />
            {liveBad && <small className="awards__error">Cole o endereço completo, começando com https://</small>}
          </label>
        </div>
      )}

      {format === 'sem_pressa' && (
        <div className="cm-form__f"><span className="kicker">Partes do jogo</span>
          <small className="faint">Quem passar de uma parte abre a conversa dela. As datas são só sugestão.</small>
          <ol className="club-parts-edit">
            {parts.map((p, i) => (
              <li key={i}>
                <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
                <input className="field" value={p.title} maxLength={80} onChange={(e) => setPart(i, { title: e.target.value })} placeholder={i === 0 ? 'Ex.: Até o primeiro chefe' : i === parts.length - 1 ? 'Ex.: Até o final' : 'Ex.: Capítulos 4 a 6'} aria-label={`Parte ${i + 1}`} />
                <input className="field" type="date" value={p.suggestedOn ?? ''} onChange={(e) => setPart(i, { suggestedOn: e.target.value || null })} aria-label={`Data sugerida da parte ${i + 1}`} />
                <button type="button" className="icon-btn" aria-label={`Tirar a parte ${i + 1}`} onClick={() => setParts((l) => l.filter((_, k) => k !== i))} disabled={parts.length <= 1}><Icon name="fechar" size={14} /></button>
              </li>
            ))}
          </ol>
          {parts.length < 30 && <button type="button" className="btn quiet sm club-parts-edit__add" onClick={() => setParts((l) => [...l, { ordinal: l.length + 1, title: '' }])}>+ Mais uma parte</button>}
        </div>
      )}

      {format === 'primeira_vez' && !editing && (
        <fieldset className="cm-form__f cm-spoil"><legend className="kicker">E você?</legend>
          <label className={`cm-spoil__o${firstTime ? ' is-on' : ''}`}><input type="radio" name="ft" checked={firstTime} onChange={() => setFirstTime(true)} /><b>Também é a minha primeira vez</b></label>
          <label className={`cm-spoil__o${!firstTime ? ' is-on' : ''}`}><input type="radio" name="ft" checked={!firstTime} onChange={() => setFirstTime(false)} /><b>Já zerei: entro como guia</b></label>
        </fieldset>
      )}

      <fieldset className="cm-form__f cm-spoil"><legend className="kicker">Quem pode entrar</legend>
        {ACCESS.map((a) => <label key={a.k} className={`cm-spoil__o${access === a.k ? ' is-on' : ''}`}><input type="radio" name="acc" checked={access === a.k} onChange={() => setAccess(a.k)} /><b>{a.label}</b><small>{a.hint}</small></label>)}
      </fieldset>
      <div className="club-form__row">
        <label className="cm-form__f"><span className="kicker">Limite de vagas (opcional)</span><input className="field" type="number" min={2} max={500} value={max} onChange={(e) => setMax(e.target.value)} placeholder="Sem limite" /></label>
        {mine.length > 0 && (
          <label className="cm-form__f"><span className="kicker">Ligar a uma comunidade (opcional)</span>
            <select className="field" value={communityId} onChange={(e) => setCommunityId(e.target.value)}><option value="">Nenhuma</option>{mine.map((c) => <option key={c.id} value={c.id}>w/{c.slug}</option>)}</select>
          </label>
        )}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="cm-form__acts"><button className="btn primary" disabled={busy || !ready}>{busy ? 'Gravando…' : editing ? 'Salvar' : 'Criar clube'}</button></div>
    </form>
  );
}

export function ClubNewPage() {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const games = useStore((s) => s.games);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { document.title = 'Criar clube · WinnerZ'; }, []);
  const q = new URLSearchParams(location.search);
  const pre = q.get('jogo') ? Object.values(games).find((g) => g.slug === q.get('jogo')) : undefined;
  const fmt = (q.get('formato') as ClubFormat) || 'encontro';
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Criar clube</h1><p className="muted lead">Entre na sua conta para criar um clube.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  const submit = async (d: ClubDraft) => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { const c = await clubApi.create(d); await addToJourney(c.game, c.name); navigate(`/clube/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to="/comunidade/clubes" className="faint">← Clubes</Link>
        <h1 className="t big">Criar clube</h1>
        <p className="muted lead">Sempre sobre um jogo. Quem entra ganha o jogo na Jornada, e o progresso de cada um aparece no clube (se a pessoa deixar).</p>
      </header>
      <ClubForm initial={{ slug: '', name: '', description: '', format: FORMATS.some((f) => f.k === fmt) ? fmt : 'encontro', gameId: pre?.id ?? null, game: pre ? { id: pre.id, slug: pre.slug, title: pre.title, cover: pre.cover } : null, access: 'aberto', maxMembers: null, communityId: null, startsAt: null, durationMin: 120, liveUrl: null, parts: [] }}
        busy={busy} err={err} onSubmit={(d) => void submit(d)} />
    </main>
  );
}

export function ClubEditPage({ slug }: { slug: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [c, setC] = useState<ClubFull | ClubLocked | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { clubApi.get(slug).then(setC).catch(() => setC(null)); }, [slug]);
  if (c === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!c || c.locked || (c.me?.role !== 'dono' && !isAdmin)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem criou o clube pode editar.</p><Link to={`/clube/${slug}`}>Voltar</Link></main>;
  const submit = async (d: ClubDraft) => {
    setBusy(true); setErr('');
    try { await clubApi.update(c.id, d); navigate(`/clube/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head"><Link to={`/clube/${c.slug}`} className="faint">← {c.name}</Link><h1 className="t big">Editar</h1></header>
      <ClubForm initial={{ slug: c.slug, name: c.name, description: c.description, format: c.format, gameId: c.game?.id ?? null, game: c.game, access: c.access, maxMembers: c.maxMembers ?? null, communityId: null, startsAt: c.startsAt ?? null, durationMin: c.durationMin, liveUrl: c.liveUrl ?? null, parts: c.parts }}
        editing={c} busy={busy} err={err} onSubmit={(d) => void submit(d)} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* A página do clube                                                    */
/* ------------------------------------------------------------------ */
export function ClubPage({ slug }: { slug: string }) {
  const code = new URLSearchParams(location.search).get('c');
  const [c, setC] = useState<ClubFull | ClubLocked | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setC(await clubApi.get(slug, code)); } catch (e) { setErr(errOf(e)); setC(null); }
  }, [slug, code]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (c) document.title = `${c.name} · Clubes · WinnerZ`; }, [c]);
  useEffect(() => {
    if (!c || c.locked || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  }, [c]);
  if (c === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!c) return <main className="page pad narrow"><h1 className="t big">Clube</h1><p className="muted lead">{err || 'Esse clube não existe (ou saiu do ar).'}</p><Link to="/comunidade/clubes">Ver os clubes</Link></main>;
  if (c.locked) return (
    <main className="page pad narrow club-locked">
      <span className={`club-chip club-chip--${c.format}`}>{FORMAT_LABEL[c.format]}</span>
      <h1 className="t big">{c.name}</h1>
      {c.game && <p className="muted">{c.game.title}</p>}
      <div className="soc-empty"><b>{c.access === 'amigos' ? `Este clube é só para os amigos de @${c.owner?.handle ?? 'quem criou'}.` : 'Este clube é por convite.'}</b>
        <p className="muted">{c.access === 'amigos' ? 'Quando vocês se seguirem, você consegue entrar.' : 'Peça o link a quem criou o clube.'}</p>
        {c.access === 'amigos' && c.owner?.handle && <Link className="btn ghost sm" to={`/@${c.owner.handle.toLowerCase()}`}>Ver o perfil de @{c.owner.handle}</Link>}
      </div>
    </main>
  );
  return <ClubView c={c} code={code} reload={load} setC={setC} />;
}

function ClubView({ c, code, reload, setC }: { c: ClubFull; code: string | null; reload: () => Promise<void>; setC: (c: ClubFull) => void }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const me = c.me;
  const owner = me?.role === 'dono';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [askFirst, setAskFirst] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = encontroNow(c);
  const join = async (firstTime: boolean | null) => {
    if (signedOut) return navigate('/entrar');
    setErr(''); setAskFirst(false);
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await clubApi.join(c.slug, code, firstTime); await addToJourney(c.game, c.name); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const leave = async () => { setBusy(true); try { await clubApi.leave(c.id); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); } };
  const patchMe = async (p: Parameters<typeof clubApi.me>[1]) => { setErr(''); try { await clubApi.me(c.id, p); await reload(); } catch (e) { setErr(errOf(e)); } };
  const ics = () => {
    const blob = new Blob([icsFor(c, location.origin)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${c.slug}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const invite = c.inviteCode ? `${location.origin}/clube/${c.slug}?c=${c.inviteCode}` : `${location.origin}/clube/${c.slug}`;
  const copy = async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem área de transferência */ } };
  const cover = c.game?.cover ?? null;

  return (
    <main className={`club club--${c.format}`}>
      <section className={`club-hero${now ? ' is-now' : ''}`}>
        {cover && <img className="club-hero__bg" src={cover} alt="" aria-hidden="true" />}
        <div className="club-hero__shade" aria-hidden="true" />
        <div className="page club-hero__in">
          <Link to="/comunidade/clubes" className="cm-hero__back">← Clubes</Link>
          <div className="club-hero__grid">
            {c.game && <Link to={`/jogos/${c.game.slug}`} className="club-hero__cv" aria-label={c.game.title}><CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /></Link>}
            <div className="club-hero__tx">
              <span className="club-hero__chips">
                <span className={`club-chip club-chip--${c.format}`}>{FORMAT_LABEL[c.format]}</span>
                {c.access !== 'aberto' && <span className="club-chip">{c.access === 'amigos' ? 'Só amigos' : 'Por convite'}</span>}
                {now && <span className="club-chip club-chip--now"><span className="session-pill__dot" aria-hidden="true" />Acontecendo agora</span>}
                {c.community && <Link to={`/w/${c.community.slug}`} className="club-chip">w/{c.community.slug}</Link>}
              </span>
              <h1 className="t club-hero__t">{c.name}</h1>
              {c.game && <Link to={`/jogos/${c.game.slug}`} className="club-hero__game">{c.game.title}</Link>}
              {c.format === 'encontro' && c.startsAt && <p className="club-hero__when"><Icon name="sino" size={16} />{c.ended ? `Aconteceu ${whenLabel(c.startsAt)}` : whenLabel(c.startsAt)}<span className="faint"> · {c.durationMin >= 60 ? `${c.durationMin / 60} h` : `${c.durationMin} min`}</span></p>}
              {c.description && <p className="club-hero__d">{c.description}</p>}
              {c.hidden && <p className="cm-hero__hidden">Fora do ar por decisão da moderação. Só você ainda consegue abrir.</p>}
              <div className="cm-hero__acts">
                {!me && !c.ended && (c.format === 'primeira_vez'
                  ? (askFirst
                    ? <><button className="btn primary" disabled={busy} onClick={() => void join(true)}>É a minha primeira vez</button><button className="btn ghost" disabled={busy} onClick={() => void join(false)}>Já zerei: entro como guia</button></>
                    : <button className="btn primary" disabled={busy} onClick={() => (signedOut ? navigate('/entrar') : setAskFirst(true))}>Entrar no clube</button>)
                  : <button className="btn primary" disabled={busy} onClick={() => void join(null)}>{c.format === 'encontro' ? 'Vou participar' : 'Entrar no clube'}</button>)}
                {me && c.format === 'encontro' && !c.ended && (
                  <div className="seg club-rsvp" role="group" aria-label="Você vai?">
                    {(['vou', 'talvez', 'nao'] as Rsvp[]).map((r) => <button key={r} aria-pressed={me.rsvp === r} onClick={() => void patchMe({ rsvp: r })}>{RSVP_LABEL[r]}</button>)}
                  </div>
                )}
                {now && me && c.game && <PlayButton gameId={c.game.id} className="btn" idle="Abrir a sessão" />}
                {c.liveUrl && !c.ended && <a className="btn ghost" href={c.liveUrl} target="_blank" rel="noopener noreferrer nofollow">{/twitch|youtube|kick/.test(c.liveUrl) ? 'Abrir a live' : /discord/.test(c.liveUrl) ? 'Abrir o Discord' : 'Abrir o link'} ↗</a>}
                {c.format === 'encontro' && !c.ended && <button className="btn ghost" onClick={ics}>Pôr na agenda</button>}
                {(owner || isAdmin) && <Link className="btn ghost" to={`/clube/${c.slug}/editar`}>Editar</Link>}
              </div>
              <p className="club-hero__n">{c.format === 'encontro' ? `${c.going} ${c.going === 1 ? 'vai' : 'vão'} · ` : ''}{c.members} {c.members === 1 ? 'pessoa' : 'pessoas'}{c.maxMembers ? ` de ${c.maxMembers} vagas` : ''}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="page club__grid">
        <div className="club__main">
          {err && <p className="awards__error" role="alert">{err}</p>}
          {c.format === 'sem_pressa' && <PartsTrack c={c} onStage={(n) => void patchMe({ stage: n })} />}
          {c.format === 'primeira_vez' && me && <FirstTimeBar c={c} onFinish={(v) => void patchMe({ finished: v })} />}
          <ClubThread c={c} reload={reload} setC={setC} />
        </div>
        <aside className="club__side">
          <People c={c} />
          <section className="cm-side">
            <span className="kicker">Convidar</span>
            <p className="muted">{c.access === 'convite' ? 'Só entra quem tem este link.' : c.access === 'amigos' ? 'Só os amigos de quem criou conseguem entrar.' : 'Qualquer pessoa com o link entra.'}</p>
            <button className="btn ghost sm" onClick={() => void copy()}>{copied ? 'Link copiado' : 'Copiar o link'}</button>
          </section>
          <section className="cm-side cm-side--quiet">
            <p className="faint">Valem as <Link to="/regras">regras do WinnerZ</Link>. Ao entrar, o jogo vai para a sua Jornada; o seu progresso aparece aqui só se a sua Jornada estiver aberta.</p>
            {me && !owner && <button className="cm-link" onClick={() => void leave()} disabled={busy}>Sair do clube</button>}
            {!owner && c.owner?.handle && <ReportButton kind="clube" handle={c.owner.handle} refId={c.id} snapshot={{ title: c.name, slug: c.slug, description: c.description, game: c.game?.title }} what={`O clube “${c.name}”: o nome e a descrição.`} label="Denunciar o clube" className="cm-side__report" />}
          </section>
        </aside>
      </div>
    </main>
  );
}

/* ---- Sem pressa: as partes e onde cada um está ---- */
function PartsTrack({ c, onStage }: { c: ClubFull; onStage: (n: number) => void }) {
  const me = c.me;
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  return (
    <section className="club-parts" aria-labelledby="club-parts-t">
      <h2 id="club-parts-t" className="club__h">As partes</h2>
      <ol className="club-parts__list">
        {c.parts.map((p) => {
          const here = c.people.filter((x) => x.stage === p.ordinal);
          const done = (me?.stage ?? 0) >= p.ordinal;
          const due = p.suggestedOn && p.suggestedOn <= today;
          return (
            <li key={p.ordinal} className={`club-part${done ? ' is-done' : ''}${me && me.stage + 1 === p.ordinal ? ' is-next' : ''}`}>
              <span className="club-part__n mono">{String(p.ordinal).padStart(2, '0')}</span>
              <span className="club-part__tx">
                <b>{p.title}</b>
                <small className="faint">{p.suggestedOn ? `${due ? 'Sugerida para' : 'Sugestão:'} ${dateShort(p.suggestedOn)}` : 'Sem data'}{c.hiddenParts[String(p.ordinal)] && !done ? ` · ${c.hiddenParts[String(p.ordinal)]} ${c.hiddenParts[String(p.ordinal)] === 1 ? 'mensagem esperando' : 'mensagens esperando'}` : ''}</small>
              </span>
              <span className="club-part__who" aria-label={`${here.length} ${here.length === 1 ? 'pessoa parou' : 'pessoas pararam'} aqui`}>{here.slice(0, 5).map((x) => <PersonAvatar key={x.id} p={x} size={24} />)}{here.length > 5 && <small className="faint">+{here.length - 5}</small>}</span>
              {me && (done
                ? (me.stage === p.ordinal ? <button className="btn quiet sm" onClick={() => onStage(p.ordinal - 1)}>Desmarcar</button> : <span className="club-part__ok"><Icon name="check" size={14} /></span>)
                : <button className={`btn sm ${me.stage + 1 === p.ordinal ? 'primary' : 'ghost'}`} onClick={() => onStage(p.ordinal)}>Passei daqui</button>)}
            </li>
          );
        })}
      </ol>
      {!me && <p className="faint">Entre no clube para marcar onde você está e abrir a conversa de cada parte.</p>}
    </section>
  );
}

/* ---- Primeira vez: guia ou primeira vez, e o "zerei" ---- */
function FirstTimeBar({ c, onFinish }: { c: ClubFull; onFinish: (v: boolean) => void }) {
  const me = c.me!;
  const finished = c.people.filter((p) => p.firstTime && p.finishedAt);
  return (
    <section className="club-first">
      <div className="club-first__me">
        {me.firstTime ? (
          me.finishedAt
            ? <><span className="club-first__star" aria-hidden="true">★</span><p><b>Você zerou pela primeira vez.</b> Agora pode ajudar quem está começando.</p><button className="btn quiet sm" onClick={() => onFinish(false)}>Desfazer</button></>
            : <><p>Você está aqui pela <b>primeira vez</b>. Pergunte à vontade: os guias respondem sem entregar a história.</p><button className="btn ghost sm" onClick={() => onFinish(true)}>Zerei!</button></>
        ) : <p>Você é <b>guia</b> neste clube: responda sem spoiler. Se precisar contar algo, esconda o trecho entre <span className="mono">||barras||</span>.</p>}
      </div>
      {finished.length > 0 && (
        <div className="club-first__stars">
          <span className="kicker kicker--now">Zeraram pela primeira vez aqui</span>
          <ul>{finished.map((p) => <li key={p.id}><PersonLink p={p} /><small className="faint">{ago(p.finishedAt)}</small></li>)}</ul>
        </div>
      )}
    </section>
  );
}

/* ---- Pessoas ---- */
function People({ c }: { c: ClubFull }) {
  const progressOf = useProgressOf();
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const prog = (p: ClubPerson) => {
    if (p.id === meId && c.game) { const x = progressOf(c.game.id); return x ? (x.completed ? 'zerou' : `${x.progress ?? 0}%`) : null; }
    if (!p.journey || p.journey.progress == null && !p.journey.completed) return null;
    return p.journey.completed ? 'zerou' : `${p.journey.progress ?? 0}%`;
  };
  const groups: [string, ClubPerson[]][] = c.format === 'encontro'
    ? [['Vão', c.people.filter((p) => p.rsvp === 'vou')], ['Talvez', c.people.filter((p) => p.rsvp === 'talvez')], ['Não vão', c.people.filter((p) => p.rsvp === 'nao')]]
    : c.format === 'primeira_vez'
      ? [['Guias', c.people.filter((p) => p.firstTime === false)], ['Primeira vez', c.people.filter((p) => p.firstTime !== false)]]
      : [['Quem está no clube', c.people]];
  return (
    <section className="cm-side club-people">
      {groups.filter(([, l]) => l.length).map(([t, l]) => (
        <div key={t} className="club-people__g">
          <span className="kicker">{t} · {l.length}</span>
          <ul>
            {l.map((p) => {
              const pr = prog(p);
              return (
                <li key={p.id}>
                  <PersonLink p={p} />
                  {p.role === 'dono' && <span className="cm-badge cm-badge--op">Criou</span>}
                  {c.format === 'primeira_vez' && p.firstTime === false && <span className="cm-badge club-badge--guia">Guia</span>}
                  {c.format === 'sem_pressa' && <small className="faint">{p.stage ? `parte ${p.stage}` : 'começando'}</small>}
                  {pr && <small className="mono faint club-people__pr">{pr}</small>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {c.members > c.people.length && <small className="faint">e mais {c.members - c.people.length}</small>}
    </section>
  );
}

/* ---- Conversa ---- */
function ClubThread({ c, reload, setC }: { c: ClubFull; reload: () => Promise<void>; setC: (c: ClubFull) => void }) {
  const me = c.me;
  const [part, setPart] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const isFirst = c.format === 'primeira_vez' && me?.firstTime !== false;
  const ended = c.format === 'encontro' && c.ended;
  const list = c.messages.filter((m) => m.part === part);
  const tops = list.filter((m) => !m.parentId);
  const kids = (id: string) => list.filter((m) => m.parentId === id);
  const guides = new Set(c.people.filter((p) => p.firstTime === false).map((p) => p.id));
  const started = c.startsAt ? Date.parse(c.startsAt) : 0;
  const mural = ended ? tops.filter((m) => Date.parse(m.createdAt) >= started) : [];
  const before = ended ? tops.filter((m) => Date.parse(m.createdAt) < started) : tops;
  const questions = c.format === 'primeira_vez' ? before.filter((m) => m.question) : [];
  const rest = c.format === 'primeira_vez' ? before.filter((m) => !m.question) : before;
  const locked = part > 0 && (!me || me.stage < part);
  const sent = async () => { setReplyTo(null); await reload(); };
  void setC;
  const item = (m: ClubMessage) => (
    <li key={m.id} className="cm-replies__top">
      <ClubMsg m={m} c={c} guide={guides.has(m.author.id)} onReply={() => setReplyTo(m.id)} reload={reload} />
      {(kids(m.id).length > 0 || replyTo === m.id) && (
        <ol className="cm-replies__kids">
          {kids(m.id).map((k) => <li key={k.id}><ClubMsg m={k} c={c} guide={guides.has(k.author.id)} onReply={() => setReplyTo(m.id)} reload={reload} /></li>)}
          {replyTo === m.id && me && <li><ClubComposer c={c} part={part} parentId={m.id} onSent={sent} onCancel={() => setReplyTo(null)} placeholder={m.author.handle ? `Responder a @${m.author.handle}` : 'Responder'} guide={!isFirst && c.format === 'primeira_vez'} /></li>}
        </ol>
      )}
    </li>
  );
  return (
    <section className="cm-thread club-thread" id="conversa" aria-labelledby="club-thread-t">
      <h2 id="club-thread-t" className="club__h">{ended ? 'Como foi' : c.format === 'primeira_vez' ? 'Perguntas e conversa' : 'Conversa'}</h2>
      {c.format === 'sem_pressa' && (
        <div className="seg club-thread__tabs" role="tablist" aria-label="Conversa de cada parte">
          <button role="tab" aria-selected={part === 0} aria-pressed={part === 0} onClick={() => setPart(0)}>Geral</button>
          {c.parts.map((p) => {
            const open = !!me && me.stage >= p.ordinal;
            return <button key={p.ordinal} role="tab" aria-selected={part === p.ordinal} aria-pressed={part === p.ordinal} onClick={() => setPart(p.ordinal)} title={p.title}>{!open && <Icon name="cadeado" size={12} />}Parte {p.ordinal}</button>;
          })}
        </div>
      )}
      {locked ? (
        <div className="cm-shield"><Icon name="cadeado" size={20} /><p><b>A conversa da parte {part} está trancada para você.</b> {me ? 'Marque "Passei daqui" nessa parte para abrir; assim ninguém leva spoiler de quem está na frente.' : 'Entre no clube e marque onde você está.'}{c.hiddenParts[String(part)] ? ` ${c.hiddenParts[String(part)]} ${c.hiddenParts[String(part)] === 1 ? 'mensagem esperando' : 'mensagens esperando'}.` : ''}</p></div>
      ) : (
        <>
          {me ? <ClubComposer c={c} part={part} parentId={null} onSent={sent} question={isFirst} guide={!isFirst && c.format === 'primeira_vez'}
            placeholder={ended ? 'Conte como foi: o momento da noite, uma foto, um print' : isFirst ? 'Pergunte o que quiser: os guias respondem sem spoiler' : part > 0 ? `Sobre a parte ${part}: pode falar sem medo, só quem passou dela vê` : 'Escreva para o clube'} />
            : <p className="cm-thread__login">{c.ended ? '' : 'Entre no clube para participar da conversa.'}</p>}
          {mural.length > 0 && <ol className="cm-replies club-mural">{mural.map(item)}</ol>}
          {ended && before.length > 0 && <h3 className="club__h3">Antes do encontro</h3>}
          {questions.length > 0 && <><h3 className="club__h3">Perguntas</h3><ol className="cm-replies">{questions.map(item)}</ol></>}
          {questions.length > 0 && rest.length > 0 && <h3 className="club__h3">Conversa</h3>}
          {rest.length > 0 && <ol className="cm-replies">{rest.map(item)}</ol>}
          {!tops.length && <p className="muted cm-thread__empty">{part > 0 ? 'Ninguém escreveu sobre esta parte ainda.' : 'Nada por aqui ainda.'}</p>}
        </>
      )}
    </section>
  );
}

function ClubMsg({ m, c, guide, onReply, reload }: { m: ClubMessage; c: ClubFull; guide: boolean; onReply: () => void; reload: () => Promise<void> }) {
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const mine = m.author.id === meId;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState('');
  if (m.deleted) return <div className="cm-reply is-deleted" id={`m-${m.id}`}><p className="faint">Mensagem apagada por quem escreveu.</p></div>;
  const save = async () => { try { await clubApi.editMessage(m.id, text); setEditing(false); await reload(); } catch (e) { setErr(errOf(e)); } };
  const del = async () => { try { await clubApi.deleteMessage(m.id); await reload(); } catch (e) { setErr(errOf(e)); } };
  return (
    <div className={`cm-reply${m.hidden ? ' is-hidden' : ''}${m.question ? ' is-question' : ''}`} id={`m-${m.id}`}>
      <PersonAvatar p={m.author} size={32} />
      <div className="cm-reply__b">
        <div className="cm-reply__by">
          <PersonLink p={m.author} avatar={false} />
          {guide && c.format === 'primeira_vez' && <span className="cm-badge club-badge--guia">Guia</span>}
          {m.question && <span className="cm-chip cm-chip--pergunta">Pergunta</span>}
          <span className="faint">{ago(m.createdAt)}{m.editedAt ? ' · editada' : ''}</span>
          {m.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
        </div>
        {editing ? (
          <div className="cm-compose cm-compose--edit">
            <textarea className="field" rows={3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
            <span className="cm-compose__acts"><button className="btn quiet sm" onClick={() => { setEditing(false); setText(m.body); }}>Cancelar</button><button className="btn primary sm" disabled={!text.trim()} onClick={() => void save()}>Salvar</button></span>
          </div>
        ) : <PostText text={m.body} embeds={2} />}
        <ImageGrid images={m.images} />
        <div className="cm-reply__acts">
          <ReactionBar target="mensagem" id={m.id} value={m.reactions} compact />
          {c.me && <button className="cm-link" onClick={onReply}>Responder</button>}
          {mine && !editing && <button className="cm-link" onClick={() => setEditing(true)}>Editar</button>}
          {mine && (confirmDel ? <><button className="cm-link cm-link--danger" onClick={() => void del()}>Apagar de vez</button><button className="cm-link" onClick={() => setConfirmDel(false)}>Cancelar</button></> : <button className="cm-link" onClick={() => setConfirmDel(true)}>Apagar</button>)}
          {!mine && m.author.handle && <ReportButton kind="mensagem" handle={m.author.handle} refId={m.id} snapshot={{ title: c.name, text: m.body.slice(0, 400), slug: c.slug, community: 'Clube', photo: m.images.length > 0 }} what={`Uma mensagem de @${m.author.handle} no clube “${c.name}”.`} className="cm-link" />}
        </div>
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </div>
  );
}

function ClubComposer({ c, part, parentId, onSent, onCancel, placeholder, question = false, guide = false }: { c: ClubFull; part: number; parentId: string | null; onSent: () => Promise<void>; onCancel?: () => void; placeholder: string; question?: boolean; guide?: boolean }) {
  const [text, setText] = useState('');
  const [isQ, setIsQ] = useState(question);
  const [images, setImages] = useState<string[]>([]);
  const [up, setUp] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const left = useMemo(() => 4 - images.length - up, [images.length, up]);
  const add = async (files: FileList | null) => {
    const l = [...(files ?? [])].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, left));
    setUp((n) => n + l.length);
    for (const f of l) {
      try { const p = await communityApi.uploadImage(await shrink(f, 1600), 'clube'); setImages((x) => [...x, p].slice(0, 4)); } catch (e) { setErr(errOf(e)); } finally { setUp((n) => n - 1); }
    }
  };
  const send = async () => {
    if (!text.trim()) return;
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await clubApi.message(c.id, part, parentId, text, isQ && !parentId, images); setText(''); setImages([]); await onSent(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`cm-compose${parentId ? ' cm-compose--kid' : ''}`}>
      <textarea className="field" rows={parentId ? 2 : 3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
      {images.length > 0 && <div className="cm-editor__imgs club-compose__imgs">{images.map((s) => <span key={s} className="cm-editor__img"><img src={communityImage(s) ?? ''} alt="" /><button type="button" className="icon-btn" aria-label="Tirar a imagem" onClick={() => { setImages((x) => x.filter((y) => y !== s)); void communityApi.removeImages([s]); }}><Icon name="fechar" size={14} /></button></span>)}</div>}
      <span className="cm-compose__acts">
        <small className="faint cm-compose__hint">{guide ? 'Guia: esconda o que entrega a história entre ||barras||.' : '**negrito**, *itálico*, ||spoiler||'}</small>
        {!parentId && c.format === 'primeira_vez' && <label className="club-compose__q"><input type="checkbox" checked={isQ} onChange={(e) => setIsQ(e.target.checked)} /> É uma pergunta</label>}
        {!parentId && left > 0 && <button type="button" className="btn quiet sm" onClick={() => file.current?.click()} disabled={up > 0}><Icon name="camera" size={14} /> {up ? 'Enviando…' : 'Imagem'}</button>}
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        {onCancel && <button className="btn quiet sm" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary sm" disabled={busy || !text.trim() || up > 0} onClick={() => void send()}>{busy ? 'Enviando…' : parentId ? 'Responder' : 'Enviar'}</button>
      </span>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}
