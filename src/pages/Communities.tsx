import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import {
  communityApi, communityImage, postTitle, slugOk, slugify,
  type Community, type CommunityDraft, type CommunityPage, type CommunitySort, type GameMini, type ModHistory, type ModLogItem, type Post,
} from '../data/communityApi';
import { jogatinaApi, type Jogatina } from '../data/jogatinaApi';
import { clubApi, type Club } from '../data/clubApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import { GameSearchPick, PersonAvatar, PersonLink, PostCard, PostText, ago } from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { renderCover } from '../lib/avatar';
import { gameBySlug } from '../components/AddGameDialog';
import { JogatinaTile } from './Jogatina';
import { ClubTile } from './Clubs';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
const num = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const since = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const handles = (l: { handle: string | null }[]) => { const x = l.map((p) => `@${p.handle ?? '?'}`); return x.length > 1 ? `${x.slice(0, -1).join(', ')} e ${x[x.length - 1]}` : x[0] ?? ''; };

/* ------------------------------------------------------------------ */
/* Cartão de comunidade                                                 */
/* ------------------------------------------------------------------ */
export function CommunityTile({ c }: { c: Community }) {
  const cover = communityImage(c.cover) ?? c.game?.cover ?? null;
  return (
    <Link to={`/w/${c.slug}`} className={`cm-tile${c.official ? ' is-official' : ''}`}>
      <span className="cm-tile__art" aria-hidden="true">{cover ? <img src={cover} alt="" loading="lazy" /> : <span className="cm-tile__ini">{c.name.slice(0, 1)}</span>}</span>
      <span className="cm-tile__tx">
        <span className="cm-tile__name">{c.name}{c.official && <span className="cm-badge">Oficial</span>}</span>
        <small className="mono faint">w/{c.slug}</small>
        {c.description && <span className="cm-tile__d">{c.description}</span>}
        <small className="faint">{num(c.members, 'pessoa segue', 'pessoas seguem')} · {num(c.posts, 'postagem', 'postagens')}{c.role ? ' · você segue' : ''}</small>
      </span>
    </Link>
  );
}

/** Ficha do jogo: a comunidade do jogo (ou o convite para criar). */
export function GameCommunity({ gameId, slug, title }: { gameId: string; slug: string; title: string }) {
  const [list, setList] = useState<Community[] | null>(null);
  useEffect(() => {
    let alive = true;
    communityApi.ofGame(gameId).then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gameId]);
  if (list == null) return null;
  return (
    <section aria-labelledby="comunidade-jogo" className="cm-gamesec">
      <div className="sec-head"><h2 id="comunidade-jogo" className="t sec-title">{list.length > 1 ? `Comunidades de ${title}` : `Comunidade de ${title}`}</h2></div>
      {list.length ? <div className="cm-tiles">{list.map((c) => <CommunityTile key={c.id} c={c} />)}</div>
        : <p className="muted">Ainda não há uma comunidade de {title}. <Link to={`/comunidade/criar?jogo=${encodeURIComponent(slug)}&nome=${encodeURIComponent(title)}`}>Criar a comunidade</Link></p>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Todas as comunidades                                                 */
/* ------------------------------------------------------------------ */
export function CommunitiesIndexPage() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Community[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { document.title = 'Comunidades · WinnerZ'; }, []);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { communityApi.list(q).then((l) => alive && setList(l)).catch((e) => alive && (setErr(errOf(e)), setList([]))); }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  return (
    <main className="page pad cm-index">
      <header className="studio__head">
        <Link to="/comunidade" className="back">← Comunidade</Link>
        <h1 className="t big">Comunidades</h1>
        <p className="muted lead">Espaços por assunto: um jogo, uma plataforma, um jeito de jogar. Qualquer pessoa pode criar a sua.</p>
      </header>
      <div className="cm-index__bar">
        <label className="cm-index__q"><Icon name="busca" size={16} /><input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comunidade" aria-label="Buscar comunidade" /></label>
        <Link className="btn primary" to="/comunidade/criar">Criar comunidade</Link>
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {list == null ? <p className="faint">Carregando…</p> : list.length === 0 ? (
        <div className="soc-empty"><b>{q ? 'Nenhuma comunidade com esse nome.' : 'Nenhuma comunidade ainda.'}</b><p className="muted">Que tal criar? <Link to={`/comunidade/criar${q ? `?nome=${encodeURIComponent(q)}` : ''}`}>Criar “{q || 'a primeira'}”</Link></p></div>
      ) : <div className="cm-tiles">{list.map((c) => <CommunityTile key={c.id} c={c} />)}</div>}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Criar e editar                                                       */
/* ------------------------------------------------------------------ */
function CommunityForm({ initial, editing, onSubmit, busy, err }: { initial: CommunityDraft & { game?: GameMini | null }; editing?: Community; onSubmit: (d: CommunityDraft) => void; busy: boolean; err: string }) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(!!editing);
  const [description, setDescription] = useState(initial.description);
  const [rules, setRules] = useState(initial.rules);
  const [game, setGame] = useState<GameMini | null>(initial.game ?? null);
  const [cover, setCover] = useState<string | null>(initial.cover ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState('');
  const [similar, setSimilar] = useState<Community[]>([]);
  const [different, setDifferent] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const s = slugTouched ? slug : slugify(name);
  const slugBad = !editing && s.length > 0 && !slugOk(s);
  useEffect(() => { if (!game && initial.game) setGame(initial.game); }, [initial.game]); // eslint-disable-line react-hooks/exhaustive-deps
  // Aviso de nome parecido: antes de criar, mostra as comunidades que já existem com nome, endereço ou jogo parecido.
  useEffect(() => {
    if (editing || (name.trim().length < 3 && !game)) { setSimilar([]); return; }
    let alive = true;
    const t = setTimeout(() => { communityApi.similar(name, s, game?.id ?? null).then((l) => alive && setSimilar(l)).catch(() => {}); }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [name, s, game?.id, editing]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickCover = async (f?: File) => {
    if (!f) return;
    setCoverBusy(true); setCoverErr('');
    try { setCover(await communityApi.uploadImage(await renderCover(f), 'capa')); } catch (e) { setCoverErr(errOf(e)); } finally { setCoverBusy(false); }
  };
  const blocked = !editing && similar.length > 0 && !different;
  return (
    <form className="cm-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ slug: s, name, description, rules, gameId: game?.id ?? null, cover }); }}>
      <label className="cm-form__f"><span className="kicker">Nome</span>
        <input className="field" value={name} maxLength={48} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Soulslike sem sofrer" required />
      </label>
      {!editing ? (
        <label className="cm-form__f"><span className="kicker">Endereço</span>
          <span className="cm-form__slug"><span className="mono faint">winnerz.com.br/w/</span><input className="field" value={s} maxLength={32} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} aria-invalid={slugBad} /></span>
          <small className={slugBad ? 'awards__error' : 'faint'}>{slugBad ? 'De 3 a 32 letras minúsculas, números ou hífens (sem hífen no começo ou no fim).' : 'Só a administração troca depois.'}</small>
        </label>
      ) : <p className="faint">Endereço: <span className="mono">winnerz.com.br/w/{editing.slug}</span> (só a administração troca).</p>}
      <div className="cm-form__f"><span className="kicker">É sobre um jogo? (opcional)</span>
        <GameSearchPick value={game} onChange={setGame} label="Jogo da comunidade" />
      </div>
      {!editing && similar.length > 0 && (
        <div className="cm-similar" role="status">
          <b>Já existe algo parecido.</b>
          <p className="muted">Que tal participar de uma delas? Conversa espalhada em duas comunidades iguais esvazia as duas.</p>
          <div className="cm-tiles">{similar.map((c) => <CommunityTile key={c.id} c={c} />)}</div>
          <label className="cm-similar__ok"><input type="checkbox" checked={different} onChange={(e) => setDifferent(e.target.checked)} /> É outra coisa: quero criar mesmo assim</label>
        </div>
      )}
      <label className="cm-form__f"><span className="kicker">Sobre o que é</span>
        <textarea className="field" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Uma ou duas frases: quem deveria participar e do que se fala aqui." />
        <small className="faint">{description.length}/300</small>
      </label>
      <label className="cm-form__f"><span className="kicker">Combinados da comunidade (opcional)</span>
        <textarea className="field" rows={3} maxLength={1000} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Ex.: spoiler do DLC só marcado. As regras do WinnerZ valem sempre." />
        <small className="faint">As duas primeiras linhas aparecem na porta de entrada da comunidade.</small>
      </label>
      {editing && (
        <div className="cm-form__f"><span className="kicker">Capa</span>
          <div className="cm-form__cover">
            {cover ? <img src={communityImage(cover) ?? ''} alt="" /> : <span className="faint">Sem capa: usamos a capa do jogo, se houver.</span>}
            <span className="cm-form__coveracts">
              <button type="button" className="btn ghost sm" disabled={coverBusy} onClick={() => file.current?.click()}>{coverBusy ? 'Enviando…' : cover ? 'Trocar a capa' : 'Enviar uma capa'}</button>
              {cover && <button type="button" className="btn quiet sm" onClick={() => setCover(null)}>Tirar</button>}
            </span>
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {coverErr && <small className="awards__error">{coverErr}</small>}
        </div>
      )}
      {err && <p className="awards__error" role="alert">{err}</p>}
      <div className="cm-form__acts">
        <button className="btn primary" disabled={busy || coverBusy || name.trim().length < 3 || slugBad || !s || blocked}>{busy ? 'Gravando…' : editing ? 'Salvar' : 'Criar comunidade'}</button>
      </div>
    </form>
  );
}

export function CommunityNewPage() {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const games = useStore((s) => s.games);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = new URLSearchParams(location.search);
  const jogo = q.get('jogo');
  const local = jogo ? Object.values(games).find((g) => g.slug === jogo) : undefined;
  const [pre, setPre] = useState<GameMini | null>(local ? { id: local.id, slug: local.slug, title: local.title, cover: local.cover } : null);
  useEffect(() => { document.title = 'Criar comunidade · WinnerZ'; }, []);
  useEffect(() => { if (jogo && !local) gameBySlug(jogo).then((g) => g && setPre({ id: g.id, slug: g.slug, title: g.title, cover: g.cover })).catch(() => {}); }, [jogo]); // eslint-disable-line react-hooks/exhaustive-deps
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Criar comunidade</h1><p className="muted lead">Entre na sua conta para criar uma comunidade.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  const name = q.get('nome') ?? '';
  const submit = async (d: CommunityDraft) => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { const c = await communityApi.create(d); navigate(`/w/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to="/comunidade/comunidades" className="back">← Comunidades</Link>
        <h1 className="t big">Criar comunidade</h1>
        <p className="muted lead">Você vira dono da comunidade: edita, troca a capa, monta a porta de entrada e chama quem ajuda a moderar. As regras do WinnerZ valem em todas.</p>
      </header>
      <CommunityForm initial={{ slug: slugify(name), name, description: '', rules: '', gameId: pre?.id ?? null, game: pre }} onSubmit={(d) => void submit(d)} busy={busy} err={err} />
    </main>
  );
}

export function CommunityEditPage({ slug }: { slug: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [c, setC] = useState<Community | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { communityApi.get(slug).then(setC).catch(() => setC(null)); }, [slug]);
  if (c === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  const owner = c?.role === 'dono' || isAdmin;
  if (!c || (!owner && !c.canModerate)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem cuida da comunidade pode editar.</p><Link to={`/w/${slug}`}>Voltar para a comunidade</Link></main>;
  const submit = async (d: CommunityDraft) => {
    setBusy(true); setErr('');
    try { await communityApi.update(c.id, d); navigate(`/w/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to={`/w/${c.slug}`} className="back">← {c.name}</Link>
        <h1 className="t big">{owner ? 'Editar' : 'Moderar'}</h1>
        {!owner && <p className="muted lead">Você ajuda a moderar w/{c.slug}: monta a porta de entrada, fixa, tira e devolve conversas. Nome, capa e combinados ficam com quem criou.</p>}
      </header>
      {owner && <CommunityForm initial={{ slug: c.slug, name: c.name, description: c.description, rules: c.rules, gameId: c.game?.id ?? null, game: c.game ?? null, cover: c.cover ?? null }} editing={c} onSubmit={(d) => void submit(d)} busy={busy} err={err} />}
      <DoorEditor c={c} onChange={setC} />
      {owner && <ModsEditor c={c} onChange={setC} />}
      {isAdmin && <OfficialToggle c={c} onChange={setC} />}
    </main>
  );
}

/** Porta de entrada: o convite para se apresentar e até 3 boas conversas para começar. */
function DoorEditor({ c, onChange }: { c: Community; onChange: (c: Community) => void }) {
  const [welcome, setWelcome] = useState(c.welcome ?? '');
  const [starters, setStarters] = useState<string[]>((c.starters ?? []).map((s) => s.id));
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    Promise.all([communityApi.page(c.slug, 'recentes'), communityApi.page(c.slug, 'destacadas')]).then(([a, b]) => {
      const all = [...(a && 'posts' in a ? [...a.pinned, ...a.posts] : []), ...(b && 'posts' in b ? b.posts : [])];
      setPosts(all.filter((p, i) => !p.hidden && all.findIndex((x) => x.id === p.id) === i));
    }).catch(() => {});
  }, [c.slug]);
  const toggle = (id: string) => setStarters((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= 3 ? l : [...l, id]));
  const save = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { onChange(await communityApi.door(c.id, welcome, starters)); setMsg('Porta de entrada salva.'); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <section className="cm-form__admin cm-door-edit" aria-labelledby="porta-t">
      <h2 id="porta-t" className="t">Porta de entrada</h2>
      <p className="muted">O que quem chega vê primeiro: os combinados, até 3 boas conversas para começar e um convite para se apresentar.</p>
      <label className="cm-form__f"><span className="kicker">Convite para se apresentar (opcional)</span>
        <input className="field" value={welcome} maxLength={160} onChange={(e) => setWelcome(e.target.value)} placeholder="Ex.: Apresente-se jogando: conte em que parte você está." />
      </label>
      <div className="cm-form__f"><span className="kicker">Boas conversas para começar ({starters.length} de 3)</span>
        {posts.length === 0 ? <p className="faint">Ainda não há conversas na comunidade.</p> : (
          <ul className="cm-door-edit__list">
            {posts.slice(0, 15).map((p) => (
              <li key={p.id}><label className={starters.includes(p.id) ? 'is-on' : ''}>
                <input type="checkbox" checked={starters.includes(p.id)} disabled={!starters.includes(p.id) && starters.length >= 3} onChange={() => toggle(p.id)} />
                <span><b>{postTitle(p)}</b><small className="faint">@{p.author.handle ?? 'conta apagada'} · {num(p.replies, 'resposta', 'respostas')}</small></span>
              </label></li>
            ))}
          </ul>
        )}
      </div>
      {err && <p className="awards__error" role="alert">{err}</p>}
      {msg && <p className="jog-invite__note" role="status">{msg}</p>}
      <div className="cm-form__acts"><button className="btn primary" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar a porta de entrada'}</button></div>
    </section>
  );
}

/** Quem ajuda a moderar (só quem criou e a administração mexem aqui). */
function ModsEditor({ c, onChange }: { c: Community; onChange: (c: Community) => void }) {
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = async (h: string, on: boolean) => {
    setBusy(true); setErr('');
    try { onChange(await communityApi.setMod(c.id, h, on)); setHandle(''); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const mods = (c.mods ?? []).filter((m) => m.role === 'mod');
  return (
    <section className="cm-form__admin" aria-labelledby="mods-t">
      <h2 id="mods-t" className="t">Moderação</h2>
      <p className="muted">Chame até 10 pessoas para ajudar. Quem modera fixa, tira e devolve conversas da comunidade, sempre com motivo. Tudo aparece no <Link to={`/w/${c.slug}/moderacao`}>histórico aberto</Link>. Não mexe no que é seu nem da administração.</p>
      {mods.length > 0 ? (
        <ul className="cm-mods-edit">
          {mods.map((m) => <li key={m.id}><PersonLink p={m} /><button className="cm-link" disabled={busy} onClick={() => void set(m.handle ?? '', false)}>Tirar da moderação</button></li>)}
        </ul>
      ) : <p className="faint">Só você modera por enquanto.</p>}
      <form className="cm-mods-edit__add" onSubmit={(e) => { e.preventDefault(); if (handle.trim()) void set(handle, true); }}>
        <input className="field" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@ da pessoa" aria-label="@ de quem vai moderar" autoCapitalize="none" spellCheck={false} />
        <button className="btn ghost" disabled={busy || !handle.trim() || mods.length >= 10}>Chamar para moderar</button>
      </form>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </section>
  );
}

function OfficialToggle({ c, onChange }: { c: Community; onChange: (c: Community) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="cm-form__admin">
      <span className="kicker">Administração</span>
      <p className="muted">{c.official ? 'Esta é uma comunidade oficial do canal: só a administração publica, todo mundo responde.' : 'Marcar como oficial do canal: fica no topo, ganha o selo e só a administração publica.'}</p>
      <button className="btn ghost sm" disabled={busy} onClick={async () => { setBusy(true); try { await communityApi.setOfficial(c.id, !c.official); onChange({ ...c, official: !c.official }); } finally { setBusy(false); } }}>{c.official ? 'Tirar o selo de oficial' : 'Marcar como oficial'}</button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Página da comunidade: /w/nome                                        */
/* ------------------------------------------------------------------ */
type Tab = 'conversas' | 'destacadas' | 'jogatinas' | 'clubes' | 'sobre';
const TABS: [Tab, string][] = [['conversas', 'Conversas'], ['destacadas', 'Destacadas'], ['jogatinas', 'Jogatinas'], ['clubes', 'Clubes'], ['sobre', 'Sobre e regras']];
const SORTS: [CommunitySort, string, string][] = [
  ['recentes', 'Recentes', 'Sem algoritmo: da mais nova para a mais antiga.'],
  ['conversadas', 'Conversas que continuam', 'As que mais receberam respostas nos últimos 7 dias.'],
  ['semresposta', 'Perguntas sem resposta', 'Perguntas que ainda não tiveram a resposta escolhida por quem perguntou.'],
];
const doorKey = (slug: string) => `wz.porta.${slug}`;
const doorClosed = (slug: string) => { try { return localStorage.getItem(doorKey(slug)) === '1'; } catch { return false; } };

export function CommunityView({ slug }: { slug: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [tab, setTabState] = useState<Tab>(() => (TABS.some(([k]) => `#${k}` === location.hash) ? (location.hash.slice(1) as Tab) : 'conversas'));
  const [sort, setSort] = useState<CommunitySort>('recentes');
  const [data, setData] = useState<CommunityPage | null | undefined>(undefined);
  const [more, setMore] = useState<Post[]>([]);
  const [end, setEnd] = useState(false);
  const [err, setErr] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [jogs, setJogs] = useState<Jogatina[] | null>(null);
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [door, setDoor] = useState(() => !doorClosed(slug));
  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', `${location.pathname}${t === 'conversas' ? '' : `#${t}`}`); };
  const effSort: CommunitySort = tab === 'destacadas' ? 'destacadas' : sort;
  const load = useCallback(async () => {
    setErr('');
    try {
      const d = await communityApi.page(slug, effSort);
      if (d && 'moved' in d && d.moved && !('posts' in d)) { navigate(`/w/${d.moved}${location.hash}`, { replace: true }); return; }
      const page = d as CommunityPage | null;
      setData(page); setMore([]); setEnd((page?.posts.length ?? 0) < 30);
    } catch (e) { setErr(errOf(e)); setData(null); }
  }, [slug, effSort]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data) document.title = `${data.community.name} · Comunidades · WinnerZ`; }, [data]);
  useEffect(() => {
    let alive = true;
    jogatinaApi.list('proximas', { community: slug, limit: 10 }).then((l) => alive && setJogs(l)).catch(() => alive && setJogs([]));
    clubApi.list('todos', undefined, slug).then((l) => alive && setClubs(l)).catch(() => alive && setClubs([]));
    return () => { alive = false; };
  }, [slug]);

  if (data === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!data) return (
    <main className="page pad narrow">
      <h1 className="t big">w/{slug}</h1>
      <p className="muted lead">{err || 'Essa comunidade não existe (ou saiu do ar).'}</p>
      <p><Link to="/comunidade/comunidades">Ver as comunidades</Link>{!err && <> · <Link to={`/comunidade/criar?nome=${encodeURIComponent(slug)}`}>Criar w/{slug}</Link></>}</p>
    </main>
  );
  const c = data.community;
  const cover = communityImage(c.cover) ?? c.game?.cover ?? null;
  const art = c.game?.backdrop ?? communityImage(c.cover) ?? c.game?.cover ?? null;
  const canWrite = !c.official || isAdmin;
  const owner = c.role === 'dono';
  const mods = c.mods ?? [];
  const join = async () => {
    if (signedOut) return navigate('/entrar');
    setJoinBusy(true); setErr('');
    try { const n = await communityApi.join(c.id, !c.role); setData({ ...data, community: n }); } catch (e) { setErr(errOf(e)); } finally { setJoinBusy(false); }
  };
  const older = async () => {
    const last = [...data.posts, ...more].at(-1);
    if (!last) return;
    const d = await communityApi.page(slug, 'recentes', last.createdAt);
    const page = d && 'posts' in d ? d : null;
    setMore((m) => [...m, ...(page?.posts ?? [])]); setEnd((page?.posts.length ?? 0) < 30);
  };
  const closeDoor = () => { setDoor(false); try { localStorage.setItem(doorKey(c.slug), '1'); } catch { /* sem armazenamento: só nesta visita */ } };
  const posts = [...data.posts, ...more];
  const ruleLines = c.rules.split('\n').map((l) => l.trim()).filter(Boolean);
  const starters = c.starters?.length ? c.starters : data.pinned.slice(0, 2).map((p) => ({ id: p.id, title: postTitle(p), kind: p.kind, replies: p.replies }));
  const meta = [`w/${c.slug}`, num(c.members, 'pessoa segue', 'pessoas seguem'), !c.official && c.owner?.handle ? `criada por @${c.owner.handle}` : null, mods.length ? `moderada por ${handles(mods)}` : null].filter(Boolean).join(' · ');

  return (
    <main className="cm2">
      <section className={`cm2-hero${art ? ' has-art' : ''}`}>
        {art && <img className="cm2-hero__bg" src={art} alt="" aria-hidden="true" />}
        <div className="cm2-hero__shade" aria-hidden="true" />
        <div className="page cm2-hero__in">
          <Link to="/comunidade/comunidades" className="back cm-hero__back">← Comunidades</Link>
          <div className="cm2-hero__row">
            <span className="cm2-hero__av" aria-hidden="true">{cover ? <img src={cover} alt="" /> : <span>{c.name.slice(0, 1)}</span>}</span>
            <div className="cm2-hero__tx">
              <span className={`kicker${c.official ? ' kicker--now' : ''}`}>{c.official ? 'Comunidade oficial do canal' : c.game ? `Comunidade · ${c.game.title}` : 'Comunidade'}</span>
              <h1 className="t cm2-hero__t">{c.name}</h1>
              <span className="mono cm2-hero__meta">{meta}</span>
            </div>
            <div className="cm2-hero__acts">
              {!owner && <button className={`btn ${c.role ? 'ghost' : 'primary'}`} disabled={joinBusy} onClick={() => void join()} aria-pressed={!!c.role}>{c.role ? <><Icon name="check" size={14} />Seguindo</> : 'Seguir'}</button>}
              {canWrite && <Link className="btn ghost" to={signedOut ? '/entrar' : `/w/${c.slug}/escrever`}><Icon name="mais" size={14} />Escrever aqui</Link>}
              {(owner || isAdmin || c.canModerate) && <Link className="btn ghost" to={`/w/${c.slug}/editar`}>{owner || isAdmin ? 'Editar' : 'Moderar'}</Link>}
            </div>
          </div>
          {c.hidden && <p className="cm-hero__hidden">Fora do ar por decisão da moderação. Só você ainda consegue abrir.</p>}
        </div>
      </section>

      <nav className="club2-tabs cm2-tabs" aria-label="Seções da comunidade">
        <div className="page club2-tabs__in" role="tablist">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}{k === 'jogatinas' && jogs?.length ? <small className="mono"> {jogs.length}</small> : null}</button>)}
        </div>
      </nav>

      <div className="page cm-view__grid cm2__grid">
        <div className="cm-view__main">
          {err && <p className="awards__error" role="alert">{err}</p>}
          {tab === 'conversas' && (
            <>
              {door ? (
                <section className="cm-door" aria-label="Porta de entrada">
                  <div className="cm-door__card">
                    <span className="kicker kicker--now">01 · Porta de entrada</span>
                    <b>{ruleLines.length ? 'Combinados daqui' : 'Regras essenciais'}</b>
                    <p className="muted">{ruleLines.length ? ruleLines.slice(0, 2).join(' ') : 'Valem as regras do WinnerZ: respeito, spoiler só com aviso, sem spam.'}</p>
                    <button className="cm-link" onClick={() => setTab('sobre')}>Ler tudo</button>
                  </div>
                  {starters.length > 0 && (
                    <div className="cm-door__card">
                      <span className="kicker">02</span>
                      <b>Boas conversas para começar</b>
                      <ul>{starters.map((s) => <li key={s.id}><Link to={`/conversa/${s.id}`}>“{s.title}”</Link><small className="faint"> · {num(s.replies, 'resposta', 'respostas')}</small></li>)}</ul>
                    </div>
                  )}
                  <div className="cm-door__card">
                    <span className="kicker">{starters.length ? '03' : '02'} · Opcional</span>
                    <b>Apresente-se</b>
                    <p className="muted">{c.welcome || 'Conte o que você está jogando e o que te trouxe aqui. Ninguém é obrigado.'}</p>
                    {canWrite && <Link className="cm-link" to={signedOut ? '/entrar' : `/w/${c.slug}/escrever?tipo=discussao`}>Escrever a apresentação</Link>}
                  </div>
                  <button className="cm-door__close cm-link" onClick={closeDoor} title="Esconder a porta de entrada neste navegador">Já conheço</button>
                </section>
              ) : <button className="cm-link cm-door__open" onClick={() => setDoor(true)}>Mostrar a porta de entrada</button>}
              {!canWrite && <p className="cm-note"><Icon name="escudo" size={14} />Só o canal publica aqui. Dá para responder e reagir às postagens.</p>}
              <div className="cm2-sort">
                <div className="cm2-sort__chips" role="group" aria-label="Ordem das conversas">
                  {SORTS.map(([k, l]) => <button key={k} className={`chip${sort === k ? ' is-on' : ''}`} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}
                </div>
                <small className="faint">{SORTS.find(([k]) => k === sort)?.[2]}</small>
              </div>
              {sort === 'recentes' && data.pinned.length > 0 && <div className="cm-list cm-list--pinned">{data.pinned.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>}
              {posts.length === 0 ? (
                <div className="soc-empty"><b>{sort === 'conversadas' ? 'Nenhuma conversa nesta semana.' : sort === 'semresposta' ? 'Nenhuma pergunta esperando resposta.' : 'Nada publicado ainda.'}</b>{canWrite && sort === 'recentes' && <p className="muted">Que tal abrir a primeira conversa? <Link to={`/w/${c.slug}/escrever`}>Escrever</Link></p>}</div>
              ) : <div className="cm-list">{posts.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>}
              {sort === 'recentes' && !end && posts.length > 0 && <button className="btn ghost cm-more" onClick={() => void older()}>Ver mais antigas</button>}
            </>
          )}
          {tab === 'destacadas' && (
            <>
              <p className="faint cm2-hint">As fixadas pela moderação e as conversas com mais reações nos últimos 30 dias.</p>
              {data.pinned.length > 0 && <div className="cm-list cm-list--pinned">{data.pinned.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>}
              {posts.length > 0 ? <div className="cm-list">{posts.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>
                : !data.pinned.length && <div className="soc-empty"><b>Nada em destaque ainda.</b><p className="muted">Reaja às conversas de que você gostou: elas sobem para cá.</p></div>}
            </>
          )}
          {tab === 'jogatinas' && (
            <section className="club-agenda">
              <div className="club2-sechead"><h2 className="club__h">Jogatinas desta comunidade</h2>{!signedOut && <Link className="btn primary sm" to={`/jogatina/criar?w=${c.slug}${c.game ? `&jogo=${encodeURIComponent(c.game.slug)}` : ''}`}>Marcar uma jogatina</Link>}</div>
              {jogs == null ? <p className="faint">Carregando…</p> : jogs.length ? <div className="jog-cards">{jogs.map((j) => <JogatinaTile key={j.id} j={j} />)}</div>
                : <div className="soc-empty"><p className="muted">Nenhuma jogatina marcada aqui. Marque a primeira: ela aparece para quem segue a comunidade.</p></div>}
            </section>
          )}
          {tab === 'clubes' && (
            <section className="club-agenda">
              <div className="club2-sechead"><h2 className="club__h">Clubes ligados</h2>{!signedOut && <Link className="btn ghost sm" to={`/comunidade/clubes/criar${c.game ? `?jogo=${encodeURIComponent(c.game.slug)}` : ''}`}>Criar clube</Link>}</div>
              {clubs == null ? <p className="faint">Carregando…</p> : clubs.length ? <div className="club-tiles">{clubs.map((k) => <ClubTile key={k.id} c={k} />)}</div>
                : <div className="soc-empty"><p className="muted">Nenhum clube ligado a esta comunidade. Ao criar um clube, escolha w/{c.slug} em “Ligar a uma comunidade”.</p></div>}
            </section>
          )}
          {tab === 'sobre' && (
            <section className="cm2-about">
              {c.description && <p className="lead">{c.description}</p>}
              <h2 className="club__h3">Combinados daqui</h2>
              {c.rules ? <PostText text={c.rules} /> : <p className="muted">Esta comunidade não escreveu combinados próprios.</p>}
              <p className="faint">Valem também as <Link to="/regras">regras do WinnerZ</Link>. Spoiler marcado fica coberto para quem ainda não chegou naquela parte do jogo.</p>
              <h2 className="club__h3">Sobre</h2>
              <dl className="cm-side__facts">
                {c.owner && !c.official && <div><dt>Criada por</dt><dd><PersonLink p={c.owner} /></dd></div>}
                <div><dt>Desde</dt><dd>{since(c.createdAt)}</dd></div>
                {c.lastAt && <div><dt>Última postagem</dt><dd>{ago(c.lastAt)}</dd></div>}
                <div><dt>Conversas</dt><dd>{c.posts}</dd></div>
              </dl>
              {c.game && <Link to={`/jogos/${c.game.slug}`} className="cm-side__game"><span className="cm-side__cv"><CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /></span><span>{c.game.title}</span></Link>}
              {!owner && c.owner?.handle && <ReportButton kind="comunidade" handle={c.owner.handle} refId={c.id} snapshot={{ title: c.name, slug: c.slug, description: c.description }} what={`A comunidade “${c.name}” (w/${c.slug}): o nome, a descrição e a capa.`} label="Denunciar a comunidade" className="cm-side__report" />}
            </section>
          )}
        </div>
        <aside className="cm-view__side">
          <section className="cm-side cm2-side--jog">
            <span className="kicker kicker--now">Jogatinas desta comunidade</span>
            {jogs == null ? <p className="faint">Carregando…</p> : jogs.length ? <div className="jog-cards jog-cards--side">{jogs.slice(0, 3).map((j) => <JogatinaTile key={j.id} j={j} compact />)}</div> : <p className="faint">Nenhuma marcada.</p>}
            {!signedOut && <Link className="btn ghost sm" to={`/jogatina/criar?w=${c.slug}${c.game ? `&jogo=${encodeURIComponent(c.game.slug)}` : ''}`}><Icon name="mais" size={14} />Marcar uma jogatina</Link>}
          </section>
          {clubs && clubs.length > 0 && (
            <section className="cm-side">
              <span className="kicker">Clubes ligados</span>
              <ul className="cm2-side__clubs">{clubs.slice(0, 3).map((k) => <li key={k.id}><Link to={`/clube/${k.slug}`}><span className="praca__railart">{k.game ? <CoverArt game={{ title: k.game.title, cover: k.game.cover ?? '' }} /> : null}</span><span><b>{k.name}</b><small className="faint">{k.game?.title}</small></span></Link></li>)}</ul>
            </section>
          )}
          <section className="cm-side">
            <span className="kicker">Moderação</span>
            {c.official ? <p className="faint">A administração do WinnerZ cuida desta comunidade.</p> : (
              <ul className="cm2-side__mods">{mods.map((m) => <li key={m.id}><PersonLink p={m} /><span className={`cm-badge${m.role === 'dono' ? ' cm-badge--op' : ''}`}>{m.role === 'dono' ? 'Criou' : 'Modera'}</span></li>)}</ul>
            )}
            <Link to={`/w/${c.slug}/moderacao`} className="cm-link">Histórico de moderação desta comunidade →</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Histórico de moderação (aberto)                                      */
/* ------------------------------------------------------------------ */
const ACTION_LINE: Record<ModLogItem['action'], (x: ModLogItem) => string> = {
  fixar: (x) => `fixou ${x.title ? `“${x.title}”` : 'uma conversa'}`,
  soltar: (x) => `soltou ${x.title ? `“${x.title}”` : 'uma conversa'}`,
  tirar: (x) => `tirou ${x.kind === 'resposta' ? 'uma resposta' : 'uma postagem'}${x.person?.handle ? ` de @${x.person.handle}` : ''}${x.title ? ` em “${x.title}”` : ''}`,
  devolver: (x) => `devolveu ${x.kind === 'resposta' ? 'uma resposta' : 'uma postagem'}${x.person?.handle ? ` de @${x.person.handle}` : ''}${x.title ? ` em “${x.title}”` : ''}`,
  mod_entrou: (x) => `chamou ${x.person?.handle ? `@${x.person.handle}` : 'alguém'} para moderar`,
  mod_saiu: (x) => `tirou ${x.person?.handle ? `@${x.person.handle}` : 'alguém'} da moderação`,
  porta: () => 'mudou a porta de entrada',
  renomear: () => 'mudou o nome ou o endereço da comunidade',
  juntar: () => 'juntou outra comunidade a esta',
};

export function ModHistoryPage({ slug }: { slug: string }) {
  const [h, setH] = useState<ModHistory | null | undefined>(undefined);
  const load = useCallback(() => { communityApi.modHistory(slug).then(setH).catch(() => setH(null)); }, [slug]);
  useEffect(load, [load]);
  useEffect(() => { if (h) document.title = `Moderação · ${h.community.name} · WinnerZ`; }, [h]);
  if (h === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!h) return <main className="page pad narrow"><h1 className="t big">Moderação</h1><p className="muted lead">Essa comunidade não existe (ou saiu do ar).</p><Link to="/comunidade/comunidades">Ver as comunidades</Link></main>;
  const c = h.community;
  return (
    <main className="page pad narrow cm-modhist">
      <header className="studio__head">
        <Link to={`/w/${c.slug}`} className="back">← w/{c.slug}</Link>
        <h1 className="t big">Moderação de {c.name}</h1>
        <p className="muted lead">Tudo o que quem modera fez aqui, com o motivo. O texto do que saiu do ar só aparece para quem modera.</p>
      </header>
      <section className="cm-side cm-modhist__who">
        <span className="kicker">Quem modera</span>
        <ul className="cm2-side__mods">{(c.mods ?? []).map((m) => <li key={m.id}><PersonLink p={m} /><span className={`cm-badge${m.role === 'dono' ? ' cm-badge--op' : ''}`}>{m.role === 'dono' ? 'Criou' : 'Modera'}</span></li>)}</ul>
      </section>
      {h.items.length === 0 ? <div className="soc-empty"><p className="muted">Nenhuma ação de moderação ainda.</p></div> : (
        <ol className="cm-modhist__list">
          {h.items.map((x) => (
            <li key={x.id} className={`cm-modhist__i is-${x.action}`}>
              {x.actor ? <PersonAvatar p={x.actor} size={32} /> : <span className="soc-av" style={{ width: 32, height: 32 }} />}
              <div>
                <p><b>{x.actor?.handle ? `@${x.actor.handle}` : 'A moderação'}</b> {ACTION_LINE[x.action](x)}</p>
                {x.reason && <p className="cm-modhist__why">Motivo: {x.reason}</p>}
                {x.text && <blockquote className="cm-modhist__text">{x.text}</blockquote>}
                <small className="faint">{ago(x.at)}{x.post && (x.action !== 'tirar' || h.canModerate) ? <> · <Link to={`/conversa/${x.post}${x.kind === 'resposta' && x.targetId ? `#r-${x.targetId}` : ''}`}>ver a conversa</Link></> : null}{x.hiddenNow === false && x.action === 'tirar' ? ' · já foi devolvida' : ''}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
