import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { communityApi, communityImage, slugOk, slugify, type Community, type CommunityDraft, type CommunityPage, type GameMini, type Post } from '../data/communityApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import { GameSearchPick, PersonLink, PostCard, PostText, ago } from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { renderCover } from '../lib/avatar';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');
const num = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const since = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

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
        <Link to="/comunidade" className="faint">← Comunidade</Link>
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
  const file = useRef<HTMLInputElement>(null);
  const s = slugTouched ? slug : slugify(name);
  const slugBad = !editing && s.length > 0 && !slugOk(s);
  const pickCover = async (f?: File) => {
    if (!f) return;
    setCoverBusy(true); setCoverErr('');
    try { setCover(await communityApi.uploadImage(await renderCover(f), 'capa')); } catch (e) { setCoverErr(errOf(e)); } finally { setCoverBusy(false); }
  };
  return (
    <form className="cm-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ slug: s, name, description, rules, gameId: game?.id ?? null, cover }); }}>
      <label className="cm-form__f"><span className="kicker">Nome</span>
        <input className="field" value={name} maxLength={48} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Soulslike sem sofrer" required />
      </label>
      {!editing ? (
        <label className="cm-form__f"><span className="kicker">Endereço</span>
          <span className="cm-form__slug"><span className="mono faint">winnerz.com.br/w/</span><input className="field" value={s} maxLength={32} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} aria-invalid={slugBad} /></span>
          <small className={slugBad ? 'awards__error' : 'faint'}>{slugBad ? 'De 3 a 32 letras minúsculas, números ou hífens (sem hífen no começo ou no fim).' : 'Não dá para trocar depois.'}</small>
        </label>
      ) : <p className="faint">Endereço: <span className="mono">winnerz.com.br/w/{editing.slug}</span> (não muda).</p>}
      <label className="cm-form__f"><span className="kicker">Sobre o que é</span>
        <textarea className="field" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Uma ou duas frases: quem deveria participar e do que se fala aqui." />
        <small className="faint">{description.length}/300</small>
      </label>
      <label className="cm-form__f"><span className="kicker">Combinados da comunidade (opcional)</span>
        <textarea className="field" rows={3} maxLength={1000} value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Ex.: spoiler do DLC só marcado. As regras do WinnerZ valem sempre." />
      </label>
      <div className="cm-form__f"><span className="kicker">É sobre um jogo? (opcional)</span>
        <GameSearchPick value={game} onChange={setGame} label="Jogo da comunidade" />
      </div>
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
        <button className="btn primary" disabled={busy || coverBusy || name.trim().length < 3 || slugBad || !s}>{busy ? 'Gravando…' : editing ? 'Salvar' : 'Criar comunidade'}</button>
      </div>
    </form>
  );
}

export function CommunityNewPage() {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { document.title = 'Criar comunidade · WinnerZ'; }, []);
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Criar comunidade</h1><p className="muted lead">Entre na sua conta para criar uma comunidade.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  const name = new URLSearchParams(location.search).get('nome') ?? '';
  const submit = async (d: CommunityDraft) => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { const c = await communityApi.create(d); navigate(`/w/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to="/comunidade/comunidades" className="faint">← Comunidades</Link>
        <h1 className="t big">Criar comunidade</h1>
        <p className="muted lead">Você vira dono da comunidade: pode editar, trocar a capa e fixar até 3 postagens. As regras do WinnerZ valem em todas.</p>
      </header>
      <CommunityForm initial={{ slug: slugify(name), name, description: '', rules: '', gameId: null }} onSubmit={(d) => void submit(d)} busy={busy} err={err} />
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
  if (!c || (c.role !== 'dono' && !isAdmin)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem criou a comunidade pode editar.</p><Link to={`/w/${slug}`}>Voltar para a comunidade</Link></main>;
  const submit = async (d: CommunityDraft) => {
    setBusy(true); setErr('');
    try { await communityApi.update(c.id, d); navigate(`/w/${c.slug}`); } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  return (
    <main className="page pad narrow cm-new">
      <header className="studio__head">
        <Link to={`/w/${c.slug}`} className="faint">← {c.name}</Link>
        <h1 className="t big">Editar</h1>
      </header>
      <CommunityForm initial={{ slug: c.slug, name: c.name, description: c.description, rules: c.rules, gameId: c.game?.id ?? null, game: c.game ?? null, cover: c.cover ?? null }} editing={c} onSubmit={(d) => void submit(d)} busy={busy} err={err} />
      {isAdmin && <OfficialToggle c={c} onChange={setC} />}
    </main>
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
export function CommunityView({ slug }: { slug: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [sort, setSort] = useState<'recentes' | 'conversadas'>('recentes');
  const [data, setData] = useState<CommunityPage | null | undefined>(undefined);
  const [more, setMore] = useState<Post[]>([]);
  const [end, setEnd] = useState(false);
  const [err, setErr] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const load = useCallback(async () => {
    setErr('');
    try { const d = await communityApi.page(slug, sort); setData(d); setMore([]); setEnd((d?.posts.length ?? 0) < 30); } catch (e) { setErr(errOf(e)); setData(null); }
  }, [slug, sort]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data) document.title = `${data.community.name} · Comunidades · WinnerZ`; }, [data]);

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
  const canWrite = !c.official || isAdmin;
  const owner = c.role === 'dono';
  const join = async () => {
    if (signedOut) return navigate('/entrar');
    setJoinBusy(true); setErr('');
    try { const n = await communityApi.join(c.id, !c.role); setData({ ...data, community: n }); } catch (e) { setErr(errOf(e)); } finally { setJoinBusy(false); }
  };
  const older = async () => {
    const last = [...data.posts, ...more].at(-1);
    if (!last) return;
    const d = await communityApi.page(slug, 'recentes', last.createdAt);
    setMore((m) => [...m, ...(d?.posts ?? [])]); setEnd((d?.posts.length ?? 0) < 30);
  };
  const posts = [...data.posts, ...more];
  return (
    <main className="cm-view">
      <section className={`cm-hero${cover ? ' has-cover' : ''}`}>
        {cover && <img className="cm-hero__img" src={cover} alt="" aria-hidden="true" />}
        <div className="cm-hero__shade" aria-hidden="true" />
        <div className="page cm-hero__in">
          <Link to="/comunidade/comunidades" className="cm-hero__back">← Comunidades</Link>
          <span className={`kicker${c.official ? ' kicker--now' : ''}`}>{c.official ? 'Comunidade oficial do canal' : c.game ? `Comunidade · ${c.game.title}` : 'Comunidade'}</span>
          <h1 className="t cm-hero__t">{c.name}</h1>
          <span className="mono cm-hero__slug">w/{c.slug}</span>
          {c.description && <p className="cm-hero__d">{c.description}</p>}
          {c.hidden && <p className="cm-hero__hidden">Fora do ar por decisão da moderação. Só você ainda consegue abrir.</p>}
          <div className="cm-hero__acts">
            {canWrite && <Link className="btn primary" to={signedOut ? '/entrar' : `/w/${c.slug}/escrever`}>Escrever</Link>}
            {!owner && <button className={`btn ${c.role ? 'ghost' : canWrite ? 'ghost' : 'primary'}`} disabled={joinBusy} onClick={() => void join()} aria-pressed={!!c.role}>{c.role ? <><Icon name="check" size={14} />Seguindo</> : 'Seguir'}</button>}
            {(owner || isAdmin) && <Link className="btn ghost" to={`/w/${c.slug}/editar`}>Editar</Link>}
            <span className="cm-hero__n">{num(c.members, 'pessoa segue', 'pessoas seguem')} · {num(c.posts, 'postagem', 'postagens')}</span>
          </div>
        </div>
      </section>

      <div className="page cm-view__grid">
        <div className="cm-view__main">
          {err && <p className="awards__error" role="alert">{err}</p>}
          {!canWrite && <p className="cm-note"><Icon name="escudo" size={14} />Só o canal publica aqui. Dá para responder e reagir às postagens.</p>}
          {data.pinned.length > 0 && <div className="cm-list cm-list--pinned">{data.pinned.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>}
          <div className="seg cm-sort" role="tablist" aria-label="Ordem das postagens">
            <button role="tab" aria-selected={sort === 'recentes'} aria-pressed={sort === 'recentes'} onClick={() => setSort('recentes')}>Recentes</button>
            <button role="tab" aria-selected={sort === 'conversadas'} aria-pressed={sort === 'conversadas'} onClick={() => setSort('conversadas')}>Mais conversadas da semana</button>
          </div>
          <p className="faint cm-sort__hint">{sort === 'recentes' ? 'Da mais nova para a mais antiga. Sem algoritmo.' : 'As que mais receberam respostas nos últimos 7 dias.'}</p>
          {posts.length === 0 ? (
            <div className="soc-empty"><b>{sort === 'conversadas' ? 'Nenhuma conversa nesta semana.' : 'Nada publicado ainda.'}</b>{canWrite && sort === 'recentes' && <p className="muted">Que tal abrir a primeira conversa? <Link to={`/w/${c.slug}/escrever`}>Escrever</Link></p>}</div>
          ) : <div className="cm-list">{posts.map((p) => <PostCard key={p.id} post={p} showCommunity={false} why={false} />)}</div>}
          {sort === 'recentes' && !end && posts.length > 0 && <button className="btn ghost cm-more" onClick={() => void older()}>Ver mais antigas</button>}
        </div>
        <aside className="cm-view__side">
          <section className="cm-side">
            <span className="kicker">Sobre</span>
            {c.game && <Link to={`/jogos/${c.game.slug}`} className="cm-side__game"><span className="cm-side__cv"><CoverArt game={{ title: c.game.title, cover: c.game.cover ?? '' }} /></span><span>{c.game.title}</span></Link>}
            <dl className="cm-side__facts">
              {c.owner && !c.official && <div><dt>Criada por</dt><dd><PersonLink p={c.owner} /></dd></div>}
              <div><dt>Desde</dt><dd>{since(c.createdAt)}</dd></div>
              {c.lastAt && <div><dt>Última postagem</dt><dd>{ago(c.lastAt)}</dd></div>}
            </dl>
          </section>
          {c.rules && <section className="cm-side"><span className="kicker">Combinados daqui</span><PostText text={c.rules} /></section>}
          <section className="cm-side cm-side--quiet">
            <p className="faint">Valem também as <Link to="/regras">regras do WinnerZ</Link>. Spoiler marcado fica coberto para quem ainda não chegou naquela parte do jogo.</p>
            {!owner && c.owner?.handle && <ReportButton kind="comunidade" handle={c.owner.handle} refId={c.id} snapshot={{ title: c.name, slug: c.slug, description: c.description }} what={`A comunidade “${c.name}” (w/${c.slug}): o nome, a descrição e a capa.`} label="Denunciar a comunidade" className="cm-side__report" />}
          </section>
        </aside>
      </div>
    </main>
  );
}
