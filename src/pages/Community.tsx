import { useCallback, useEffect, useMemo, useState } from 'react';
import { FriendsNow } from '../components/Presence';
import { Link, navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { socialApi, type Activity } from '../data/socialApi';
import {
  PATHS, communityApi, useCanCreateCommunity, postHref, postTitle, refreshNews,
  type Community, type Post, type PracaPath, type PracaSide,
} from '../data/communityApi';
import { clubApi, type Club } from '../data/clubApi';
import { jogatinaApi, jogatinaNow, type Jogatina } from '../data/jogatinaApi';
import { notifApi, refreshNotifs, useNotifCount, type Notif } from '../data/notifApi';
import { ensureRules } from '../data/moderationApi';
import { FriendsActivity } from '../components/Social';
import { MentionArea, PersonAvatar, PostCard, ago } from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { CommunityTile } from './Communities';
import { ClubTile } from './Clubs';
import { JogatinaTile } from './Jogatina';
import { whenLabel } from '../lib/when';
import { clearDraft, readDraft, useDraft, writeDraft } from '../lib/draft';
import { FEATURES } from '../lib/features';

/**
 * Enquanto o site é pequeno, a Praça mostra só os caminhos que já têm o que mostrar (Etapa 1 da revisão).
 * Amigos, Discussões e Novos por aqui voltam quando houver gente; o código deles continua aqui.
 */
const HIDDEN_PATHS: PracaPath[] = ['amigos', 'discussoes', 'novos'];
const SHOWN = PATHS.filter((p) => !HIDDEN_PATHS.includes(p.k));
const isPath = (x: string | null): x is PracaPath => !!x && SHOWN.some((p) => p.k === x);
const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
const greeting = () => { const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' })); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const today = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });

/**
 * A Praça (/comunidade): os caminhos à esquerda, a conversa no meio, o que está acontecendo à direita.
 * No celular: os blocos de atalho em cima e os caminhos numa fileira que rola.
 */
export function CommunityPage() {
  const canCreate = useCanCreateCommunity();
  const path = usePath();
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const can = mode === 'demo' || signed;
  const q = new URLSearchParams(path.split('?')[1] ?? '');
  const cam: PracaPath = isPath(q.get('c')) ? (q.get('c') as PracaPath) : 'para';
  const setCam = (k: PracaPath) => navigate(k === 'para' ? '/comunidade' : `/comunidade?c=${k}`, { replace: true, keepScroll: true });
  const [side, setSide] = useState<PracaSide | null>(null);
  const [clubs, setClubs] = useState<{ next: Jogatina[]; all: Club[] } | null>(null);
  const [mine, setMine] = useState<Community[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => { document.title = 'Praça · Comunidade · WinnerZ'; }, []);
  useEffect(() => {
    if (!can) return;
    let alive = true;
    communityApi.side().then((x) => alive && setSide(x)).catch(() => alive && setSide({ entrar: [], continuam: [], novos: [] }));
    Promise.all([jogatinaApi.list('proximas', { limit: 12 }).catch(() => []), clubApi.list('todos').catch(() => [])]).then(([next, all]) => alive && setClubs({ next, all }));
    communityApi.mine().then((x) => alive && setMine(x)).catch(() => {});
    socialApi.activity().then((x) => alive && setActivity(x)).catch(() => {});
    return () => { alive = false; };
  }, [can, tick]);

  if (!can) return (
    <main className="page pad narrow praca-out">
      <span className="kicker">Comunidade</span>
      <h1 className="t big">Praça</h1>
      <p className="muted lead">É onde as conversas acontecem: perguntas, dicas, enquetes, o que chegou na coleção e as jogatinas. Entre na sua conta para participar.</p>
      <Link className="btn primary" to="/entrar">Entrar</Link>
    </main>
  );

  const info = PATHS.find((p) => p.k === cam)!;
  const encontros = (clubs?.next ?? []).filter((j) => !j.ended && !j.canceled);
  const myClubs = (clubs?.all ?? []).filter((c) => c.me);
  return (
    <main className="praca">
      <div className="page praca__grid">
        <aside className="praca__rail" aria-label="Caminhos da Praça">
          <nav className="praca__paths">
            {SHOWN.map((p) => (
              <button key={p.k} className={`praca__path${cam === p.k ? ' is-on' : ''}`} aria-current={cam === p.k ? 'page' : undefined} onClick={() => setCam(p.k)}>
                <Icon name={p.icon} size={17} /><span>{p.label}</span>
                {p.k === 'jogatinas' && encontros.length > 0 && <small className="mono">{encontros.length}</small>}
                {p.k === 'novos' && (side?.novos.length ?? 0) > 0 && <small className="mono">{side!.novos.length}</small>}
              </button>
            ))}
          </nav>
          {mine.length > 0 && (
            <div className="praca__railsec">
              <span className="kicker">Comunidades que você segue</span>
              <ul>{mine.slice(0, 8).map((c) => <li key={c.id}><Link to={`/w/${c.slug}`}><RailArt c={c} />w/{c.slug}</Link></li>)}</ul>
              <Link to="/comunidade?c=comunidades" onClick={(e) => { e.preventDefault(); setCam('comunidades'); }} className="praca__more">Ver todas →</Link>
            </div>
          )}
          {myClubs.length > 0 && (
            <div className="praca__railsec">
              <span className="kicker">Seus clubes</span>
              <ul>{myClubs.slice(0, 6).map((c) => <li key={c.id}><Link to={`/clube/${c.slug}`}><span className="praca__railart">{c.game ? <CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /> : null}</span>{c.name}</Link></li>)}</ul>
            </div>
          )}
          <div className="praca__railsec praca__raillinks">
            {canCreate && <Link to="/comunidade/criar">Criar comunidade</Link>}
            {FEATURES.clubes && <Link to="/comunidade/clubes">Clubes</Link>}
            <Link to="/comunidade/pessoas">Pessoas</Link>
            <Link to="/listas">Listas</Link>
          </div>
        </aside>

        <section className="praca__main" aria-labelledby="praca-t">
          <header className="praca__head">
            <span className="kicker">{today()}</span>
            <h1 id="praca-t" className="t praca__t">Praça</h1>
          </header>
          <Away activity={activity} encontros={encontros} />
          <QuickComposer onPosted={() => setTick((t) => t + 1)} />
          <Tiles cam={cam} setCam={setCam} encontros={encontros} />
          <nav className="praca__chips" aria-label="Caminhos">
            {SHOWN.map((p) => <button key={p.k} className={`chip${cam === p.k ? ' is-on' : ''}`} aria-pressed={cam === p.k} onClick={() => setCam(p.k)}>{p.label}</button>)}
          </nav>
          <p className="praca__why">{info.why}</p>
          {cam === 'comunidades' ? <CommunitiesPath /> : cam === 'jogatinas' ? <JogatinasPath jogs={clubs ? encontros : null} clubs={clubs?.all ?? []} /> : (
            <>
              {cam === 'amigos' && <div className="praca__friends"><span className="kicker">O que andaram jogando</span><FriendsActivity /></div>}
              <Feed key={`${cam}-${tick}`} path={cam} />
            </>
          )}
        </section>

        <aside className="praca__side" aria-label="Acontecendo">
          <FriendsNow />
          {encontros.length > 0 && (
            <section className="cm-side">
              <span className="kicker kicker--now">Acontecendo</span>
              <ul className="praca__events">
                {encontros.slice(0, 3).map((c) => (
                  <li key={c.id}><Link to={`/jogatina/${c.id}`}>
                    <span className="praca__ev-cv">{c.game ? <CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /> : null}</span>
                    <span><b>{jogatinaNow(c) && <span className="praca__live" aria-label="Agora" />}{c.title}</b><small className="faint">{jogatinaNow(c) ? 'Agora' : whenLabel(c.startsAt)} · {c.going} {c.going === 1 ? 'vai' : 'vão'}{c.me ? ` · você: ${c.me.rsvp === 'vou' ? 'vai' : c.me.rsvp === 'talvez' ? 'talvez' : 'não vai'}` : ''}</small></span>
                  </Link></li>
                ))}
              </ul>
            </section>
          )}
          {side && side.entrar.length > 0 && (
            <section className="cm-side">
              <span className="kicker">Boa conversa para entrar</span>
              {side.entrar.slice(0, 2).map((p) => (
                <Link key={p.id} to={postHref(p)} className="praca__entrar">
                  <b>{postTitle(p)}</b>
                  <small className="faint">@{p.author.handle ?? 'conta apagada'}{p.author.novo ? ' chegou agora' : ''} · {p.why}</small>
                </Link>
              ))}
            </section>
          )}
          {side && side.novos.length > 0 && (
            <section className="cm-side">
              <span className="kicker">Novos por aqui</span>
              <div className="cm-people">{side.novos.map((p) => <Link key={p.id} to={p.post ? `/conversa/${p.post.id}` : `/@${(p.handle ?? '').toLowerCase()}`} title={`@${p.handle}${p.post ? `: ${p.post.title}` : ''}`}><PersonAvatar p={p} size={38} /></Link>)}</div>
              <small className="faint">{side.novos.length === 1 ? 'Chegou' : `${side.novos.length} pessoas chegaram`} nas últimas semanas e {side.novos.length === 1 ? 'topou' : 'toparam'} aparecer aqui. Diga oi.</small>
            </section>
          )}
          {side && side.continuam.length > 0 && (
            <section className="cm-side">
              <span className="kicker">Conversas que continuam</span>
              {side.continuam.map((p) => <Link key={p.id} to={postHref(p)} className="praca__entrar"><b>{postTitle(p)}</b><small className="faint">{p.why}</small></Link>)}
            </section>
          )}
          <section className="cm-side cm-side--quiet">
            <small className="faint">Os caminhos não usam algoritmo escondido: cada conversa diz por que apareceu. Avisos, “Novos por aqui” e o jogo ao lado do nome se ajustam em <Link to="/preferencias#comunidade">Preferências</Link>.</small>
          </section>
        </aside>
      </div>
    </main>
  );
}

function RailArt({ c }: { c: Community }) {
  const img = c.cover ? (c.cover.startsWith('/') || c.cover.startsWith('http') ? c.cover : null) : c.game?.cover ?? null;
  return <span className="praca__railart">{img ? <img src={img} alt="" /> : c.name.slice(0, 1)}</span>;
}

/* ------------------------------------------------------------------ */
/* Enquanto você estava fora                                            */
/* ------------------------------------------------------------------ */
function Away({ activity, encontros }: { activity: Activity[]; encontros: Jogatina[] }) {
  const [unread, setUnread] = useState<Notif[] | null>(null);
  useEffect(() => { notifApi.list('naolidos', null, 50).then((r) => setUnread(r.items)).catch(() => setUnread([])); }, []);
  const count = (k: (n: Notif) => boolean) => (unread ?? []).filter(k).length;
  const resp = count((n) => n.kind === 'resposta' || n.kind === 'clube_resposta' || n.kind === 'jogatina_resposta');
  const menc = count((n) => n.kind === 'mencao' || n.kind === 'clube_mencao' || n.kind === 'jogatina_mencao');
  const acomp = count((n) => n.kind === 'acompanhando');
  const conv = count((n) => n.kind === 'jogatina_convite' || n.kind === 'clube_convite');
  const reac = count((n) => n.kind === 'reacao');
  const day = Date.now() - 86_400_000;
  const friends = activity.filter((a) => Date.parse(a.at) > day && a.kind !== 'momento').slice(0, 2);
  const tonight = encontros.filter((c) => new Date(c.startsAt).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) === new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  const bits: string[] = [];
  if (conv) bits.push(conv === 1 ? '1 convite' : `${conv} convites`);
  if (resp) bits.push(resp === 1 ? '1 resposta para você' : `${resp} respostas para você`);
  if (menc) bits.push(menc === 1 ? '1 menção' : `${menc} menções`);
  if (reac) bits.push(reac === 1 ? 'reações numa mensagem sua' : `reações em ${reac} mensagens suas`);
  if (acomp) bits.push(acomp === 1 ? '1 novidade numa conversa que você acompanha' : `${acomp} novidades em conversas que você acompanha`);
  friends.forEach((a) => bits.push(`@${a.handle} ${a.kind === 'zerou' ? 'zerou' : 'começou'} ${a.title}`));
  if (tonight.length) bits.push(tonight.length === 1 ? `1 jogatina hoje: ${tonight[0].title}, ${whenLabel(tonight[0].startsAt).replace('hoje, ', '')}` : `${tonight.length} jogatinas hoje`);
  const list = (bits.length > 1 ? `${bits.slice(0, -1).join(', ')} e ${bits[bits.length - 1]}` : bits[0]) ?? '';
  return (
    <section className={`praca__away${bits.length ? '' : ' is-quiet'}`} aria-live="polite">
      <Icon name="sino" size={16} />
      <p><b>{greeting()}!</b> {bits.length ? <>Enquanto você estava fora: {list}.</> : 'Nada novo para você desde a última visita.'}</p>
      {(unread?.length ?? 0) > 0 && <Link className="btn ghost sm" to="/avisos?f=naolidos">Ver avisos</Link>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Escrever direto na Praça                                             */
/* ------------------------------------------------------------------ */
const QUICK_KEY = 'praca:rapido';
function QuickComposer({ onPosted }: { onPosted: () => void }) {
  const initial = useStore((s) => s.profile?.initial ?? 'V');
  const avatar = useStore((s) => s.profile?.avatar ?? null);
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [text, setText] = useState(() => readDraft<string>(QUICK_KEY) ?? '');
  const [open, setOpen] = useState(() => !!readDraft<string>(QUICK_KEY));
  const [places, setPlaces] = useState<Community[]>([]);
  const [place, setPlace] = useState('');
  const [question, setQuestion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const savedAt = useDraft(QUICK_KEY, text, !text.trim());
  useEffect(() => { if (open && !places.length) communityApi.list().then((l) => setPlaces(l.filter((c) => !c.official || isAdmin))).catch(() => {}); }, [open, places.length, isAdmin]);
  const slug = places.find((c) => c.id === place)?.slug;
  // Os outros tipos abrem o editor completo, levando o que já foi escrito.
  const full = (tipo: string) => {
    if (tipo === 'jogatina') return navigate('/jogatina/criar');
    if (text.trim()) writeDraft(`p:novo:${slug ?? 'praca'}`, { kind: tipo, title: '', body: text, game: null, spoiler: null, spoilerNote: '', clip: '', poll: ['', ''] });
    clearDraft(QUICK_KEY);
    navigate(`/escrever?tipo=${tipo}${slug ? `&w=${slug}` : ''}`);
  };
  const send = async () => {
    if (!text.trim()) return;
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try {
      const p = await communityApi.createPost(place || null, { kind: question ? 'pergunta' : 'discussao', title: '', body: text, gameId: null, spoiler: null, images: [], clip: null });
      clearDraft(QUICK_KEY); setText(''); setOpen(false); onPosted(); void refreshNews(); void refreshNotifs();
      navigate(postHref(p));
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <section className={`praca__compose${open ? ' is-open' : ''}`} aria-label="Escrever na Praça">
      <div className="praca__compose-row">
        <span className={`avatar praca__me${avatar ? ' avatar--img' : ''}`} aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : initial}</span>
        {open
          ? <MentionArea className="field" rows={3} maxLength={10000} value={text} onChange={setText} people={[]} autoFocus placeholder="O que você está jogando? Conte, pergunte, mostre." aria-label="Escrever na Praça"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
          : <button className="praca__compose-fake" onClick={() => setOpen(true)}>O que você está jogando? Conte, pergunte, mostre.</button>}
        {!open && <button className="btn primary sm" onClick={() => setOpen(true)}>Escrever</button>}
      </div>
      <div className="praca__types">
        <button className="chip" onClick={() => full('discussao')}><Icon name="imagem" size={14} />Imagem</button>
        <button className="chip" onClick={() => full('clipe')}><Icon name="play" size={12} />Vídeo</button>
        <button className={`chip${question ? ' is-on' : ''}`} aria-pressed={question} onClick={() => { setQuestion((v) => !v); setOpen(true); }}><Icon name="pergunta" size={14} />Pergunta</button>
        <button className="chip" onClick={() => full('enquete')}><Icon name="enquete" size={14} />Enquete</button>
        <button className="chip" onClick={() => full('aquisicao')}><Icon name="caixa" size={14} />Chegou na coleção</button>
        <button className="chip" onClick={() => full('jogatina')}><Icon name="jogos" size={14} />Jogatina</button>
      </div>
      {open && (
        <div className="praca__compose-acts">
          <label className="praca__where"><span className="faint">Em</span>
            <select className="field" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Onde publicar">
              <option value="">Praça</option>
              {places.map((c) => <option key={c.id} value={c.id}>w/{c.slug}</option>)}
            </select>
          </label>
          <small className="faint">{savedAt && text.trim() ? `Rascunho salvo ${ago(new Date(savedAt).toISOString())}` : '**negrito**, ||spoiler||, @pessoa'}</small>
          <button className="btn quiet sm" onClick={() => setOpen(false)}>Fechar</button>
          <button className="btn primary sm" disabled={busy || !text.trim()} onClick={() => void send()}>{busy ? 'Publicando…' : 'Publicar'}</button>
        </div>
      )}
      {err && <p className="awards__error" role="alert">{err}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Celular: blocos de atalho                                            */
/* ------------------------------------------------------------------ */
function Tiles({ cam, setCam, encontros }: { cam: PracaPath; setCam: (k: PracaPath) => void; encontros: Jogatina[] }) {
  const fresh = useNotifCount()?.unread ?? 0;
  const next = encontros[0];
  return (
    <div className="praca__tiles" aria-label="Atalhos">
      <button className={`praca__tile praca__tile--cool${cam === 'jogatinas' ? ' is-on' : ''}`} onClick={() => setCam('jogatinas')}>
        <span className="kicker">Jogatinas</span>
        {next ? <><b className="praca__big">{jogatinaNow(next) ? 'Agora' : whenLabel(next.startsAt).split(',')[0]}</b><small>{next.title}</small></> : <small className="faint">Nada marcado. Marque uma!</small>}
      </button>
      <button className={`praca__tile${cam === 'para' ? ' is-on' : ''}`} onClick={() => setCam('para')}>
        <span className="kicker">Para você</span>
        <small>{fresh ? `${fresh} ${fresh === 1 ? 'novidade' : 'novidades'} para você` : 'As conversas que têm a ver com você'}</small>
      </button>
      <button className={`praca__tile${cam === 'comunidades' ? ' is-on' : ''}`} onClick={() => setCam('comunidades')}>
        <span className="kicker">Comunidades</span>
        <small className="faint">Os espaços por assunto</small>
      </button>
      <button className={`praca__tile praca__tile--mint${cam === 'seguindo' ? ' is-on' : ''}`} onClick={() => setCam('seguindo')}>
        <span className="kicker">Seguindo</span>
        <small>Sem sugestão no meio</small>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Os caminhos                                                          */
/* ------------------------------------------------------------------ */
function Feed({ path }: { path: PracaPath }) {
  const [list, setList] = useState<Post[] | null>(null);
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async (before?: string) => {
    setBusy(true);
    try {
      const l = await communityApi.praca(path, before);
      setList((x) => (before ? [...(x ?? []), ...l] : l));
      setMore(l.length >= 30 && path !== 'discussoes');
    } catch (e) { setErr(errOf(e)); setList((x) => x ?? []); } finally { setBusy(false); }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  const empty = useMemo(() => ({
    para: 'Ainda não há conversas para você. Siga comunidades e pessoas, ou ponha jogos na sua Jornada, e elas aparecem aqui.',
    amigos: 'Seus amigos ainda não postaram nada. Amigos são as pessoas que seguem você de volta.',
    seguindo: 'Siga pessoas e comunidades para ver aqui só o que vem delas.',
    discussoes: 'Nenhuma conversa animada esta semana. Que tal puxar uma?',
    salvos: 'Nada salvo ainda. Toque em “Salvar” numa conversa para guardar aqui.',
    novos: 'Ninguém novo por aqui esta semana (ou quem chegou preferiu não aparecer).',
    comunidades: '', jogatinas: '',
  }[path]), [path]);
  if (list == null) return <p className="faint">Carregando…</p>;
  return (
    <div className="cm-list praca__feed">
      {err && <p className="awards__error" role="alert">{err}</p>}
      {list.length === 0 ? <div className="soc-empty"><p className="muted">{empty}</p>{path === 'para' && <Link className="btn ghost sm" to="/comunidade?c=comunidades">Ver as comunidades</Link>}</div>
        : list.map((p) => <PostCard key={p.id} post={p} />)}
      {more && list.length > 0 && <button className="btn ghost cm-more" disabled={busy} onClick={() => void load(list[list.length - 1]?.createdAt)}>{busy ? 'Carregando…' : 'Mais conversas'}</button>}
    </div>
  );
}

function CommunitiesPath() {
  const canCreate = useCanCreateCommunity();
  const [all, setAll] = useState<Community[] | null>(null);
  useEffect(() => { communityApi.list().then(setAll).catch(() => setAll([])); }, []);
  if (all == null) return <p className="faint">Carregando…</p>;
  const sorted = [...all].sort((a, b) => Number(!!b.role) - Number(!!a.role));
  return (
    <div className="praca__comms">
      <div className="cm-tiles">{sorted.map((c) => <CommunityTile key={c.id} c={c} />)}</div>
      <div className="praca__commacts"><Link className="btn ghost sm" to="/comunidade/comunidades">Buscar comunidades</Link>{canCreate && <Link className="btn primary sm" to="/comunidade/criar">Criar comunidade</Link>}</div>
    </div>
  );
}

function JogatinasPath({ jogs, clubs }: { jogs: Jogatina[] | null; clubs: Club[] }) {
  if (jogs == null) return <p className="faint">Carregando…</p>;
  const mine = clubs.filter((c) => c.me);
  const open = clubs.filter((c) => !c.me).slice(0, 4);
  return (
    <div className="praca__comms">
      {jogs.length === 0 ? <div className="soc-empty"><p className="muted">Nenhuma jogatina marcada. Que tal a primeira?</p></div>
        : <div className="jog-cards">{jogs.map((j) => <JogatinaTile key={j.id} j={j} />)}</div>}
      <div className="praca__commacts"><Link className="btn primary sm" to="/jogatina/criar">Marcar uma jogatina</Link></div>
      {(mine.length > 0 || open.length > 0) && (
        <>
          <span className="kicker praca__sub">Clubes: grupos que continuam</span>
          <div className="club-tiles">{[...mine, ...open].slice(0, 6).map((c) => <ClubTile key={c.id} c={c} />)}</div>
          <div className="praca__commacts"><Link className="btn ghost sm" to="/comunidade/clubes">Todos os clubes</Link><Link className="btn ghost sm" to="/comunidade/clubes/criar">Criar clube</Link></div>
        </>
      )}
    </div>
  );
}
