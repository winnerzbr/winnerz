import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Link } from '../lib/router';
import { useStore, actions } from '../data/store';
import { awardsApi, canAdmin, adminResultsOpen, artChoices, nomineeArt, type Award, type AwardFull, type Category, type Nominee } from '../data/awards';
import { igdbSize } from '../lib/backdrop';
import { searchGames, loadGame, type Hit } from '../components/AddGameDialog';
import { CoverArt } from '../components/CoverArt';
import { ConfirmButton } from '../components/Sheet';
import { fmtWhen } from './Awards';
import { AwardsAdminPlus } from './AwardsPlus';

/** datetime-local ⇄ ISO, sempre no horário de Brasília. */
const toLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(Date.parse(iso) - 3 * 3600000);
  return d.toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : undefined);

/** Montar o WinnerZ Awards: edição, datas, categorias e indicados (jogos do IGDB). */
export function AwardsAdminPage() {
  useStore((s) => s.isAdmin);
  const [awards, setAwards] = useState<Award[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [full, setFull] = useState<AwardFull | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadList = useCallback(async () => {
    const l = await awardsApi().list();
    setAwards(l);
    setCurrent((c) => c ?? l[0]?.id ?? null);
  }, []);
  const reload = useCallback(async () => { if (current) setFull(await awardsApi().load(current)); }, [current]);
  useEffect(() => { loadList().catch((e) => setError(String(e?.message ?? e))); }, [loadList]);
  useEffect(() => { reload().catch((e) => setError(String(e?.message ?? e))); }, [reload]);

  const run = async (fn: () => Promise<unknown>, ok?: string): Promise<boolean> => {
    setError(''); setNotice('');
    try { await fn(); await reload(); if (ok) setNotice(ok); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gravar.'); return false; }
  };

  if (!canAdmin()) return (
    <main className="page pad narrow">
      <h1 className="t big">Montar o Awards</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ.</p>
      <Link className="btn ghost" to="/eventos/awards">Ver o WinnerZ Awards</Link>
    </main>
  );

  const createEdition = () => run(async () => {
    const year = new Date().getFullYear() + (awards?.some((a) => a.year === new Date().getFullYear()) ? 1 : 0);
    const a = await awardsApi().saveAward({ year, title: `WinnerZ Awards ${year}`, published: false });
    setCurrent(a.id); await loadList();
  }, 'Edição criada como rascunho.');

  return (
    <main className="page pad awards-admin">
      <Link to="/eventos/awards" className="faint">← WinnerZ Awards</Link>
      <h1 className="t big">Montar o Awards</h1>
      <div className="awards-admin__bar">
        {awards && awards.length > 0 && (
          <label>
            <span className="muted">Edição</span>
            <select className="field" value={current ?? ''} onChange={(e) => setCurrent(e.target.value)}>
              {awards.map((a) => <option key={a.id} value={a.id}>{a.title}{a.published ? '' : ' (rascunho)'}</option>)}
            </select>
          </label>
        )}
        <button className="btn ghost sm" onClick={createEdition}>Nova edição</button>
      </div>
      {error && <p className="awards__error" role="alert">{error}</p>}
      {notice && <p className="muted" role="status">{notice}</p>}
      {awards?.length === 0 && <p className="muted">Nenhuma edição ainda. Rode a migração 0006 (ela cria a edição de 2026 com as categorias) ou crie uma nova.</p>}
      {full && (
        <section className="card awards-admin__reveal" aria-label="Revelação">
          {adminResultsOpen(full.award)
            ? <><p><strong>O resultado já chegou para você.</strong> {full.award.publicResultsAt && Date.parse(full.award.publicResultsAt) > Date.now() ? `O público vê em ${fmtWhen(full.award.publicResultsAt, true)}.` : 'O público também já vê.'}</p><Link className="btn primary" to="/eventos/awards/revelar">Abrir a apresentação da revelação</Link></>
            : <p><strong>Resultado trancado.</strong> {full.award.resultsAt ? `Ninguém vê a contagem até ${fmtWhen(full.award.resultsAt, true)}, nem você.` : 'Marque quando o resultado chega para você.'} Esta tela nunca mostra votos.</p>}
        </section>
      )}
      {full && <EditionForm key={full.award.id} award={full.award} onSave={(a) => run(async () => { await awardsApi().saveAward(a); await loadList(); }, 'Edição gravada.')} />}
      {full && <AwardsAdminPlus key={`plus-${full.award.id}`} full={full} run={run} onSaved={() => void loadList()} />}
      {full && (
        <section className="awards-admin__cats" aria-labelledby="cats-h">
          <h2 id="cats-h" className="t">Categorias e indicados</h2>
          <p className="muted">Os indicados são jogos do catálogo. A ordem das categorias segue o número de cada uma.</p>
          {full.categories.map((c) => <CategoryEditor key={c.id} cat={c} year={full.award.year} run={run} />)}
          <NewCategory awardId={full.award.id} position={(full.categories.at(-1)?.position ?? 0) + 1} run={run} />
        </section>
      )}
    </main>
  );
}

function EditionForm({ award, onSave }: { award: Award; onSave: (a: Award) => void }) {
  const [a, setA] = useState(award);
  const [bad, setBad] = useState('');
  const set = (p: Partial<Award>) => { setA({ ...a, ...p }); setBad(''); };
  const check = () => {
    const t = (x?: string) => (x ? Date.parse(x) : NaN);
    if (a.votingOpens && a.votingCloses && t(a.votingCloses) <= t(a.votingOpens)) return 'A votação precisa fechar depois de abrir.';
    if (a.resultsAt && a.votingCloses && t(a.resultsAt) < t(a.votingCloses)) return 'O resultado precisa aparecer depois que a votação fecha.';
    if (a.publicResultsAt && a.resultsAt && t(a.publicResultsAt) < t(a.resultsAt)) return 'O resultado público precisa vir depois de o resultado chegar para você.';
    if (a.publicResultsAt && !a.resultsAt) return 'Marque também quando o resultado chega para você.';
    if (a.published && !a.votingOpens) return 'Para publicar, marque quando a votação abre.';
    return '';
  };
  return (
    <form className="card awards-admin__form" onSubmit={(e) => { e.preventDefault(); const m = check(); if (m) setBad(m); else onSave(a); }}>
      <div className="awards-admin__grid">
        <label><span>Título</span><input className="field" value={a.title} onChange={(e) => set({ title: e.target.value })} required /></label>
        <label><span>Ano</span><input className="field" type="number" value={a.year} onChange={(e) => set({ year: Number(e.target.value) })} required /></label>
        <label className="awards-admin__wide"><span>Apresentação</span><textarea className="field" rows={2} value={a.intro ?? ''} onChange={(e) => set({ intro: e.target.value || undefined })} /></label>
        <label><span>Votação abre (Brasília)</span><input className="field" type="datetime-local" value={toLocal(a.votingOpens)} onChange={(e) => set({ votingOpens: fromLocal(e.target.value) })} /></label>
        <label><span>Votação fecha</span><input className="field" type="datetime-local" value={toLocal(a.votingCloses)} onChange={(e) => set({ votingCloses: fromLocal(e.target.value) })} /></label>
        <label><span>Resultado chega para você</span><input className="field" type="datetime-local" value={toLocal(a.resultsAt)} onChange={(e) => set({ resultsAt: fromLocal(e.target.value) })} /></label>
        <label><span>Resultado público no site</span><input className="field" type="datetime-local" value={toLocal(a.publicResultsAt)} onChange={(e) => set({ publicResultsAt: fromLocal(e.target.value) })} /></label>
        <p className="faint awards-admin__wide">Até “Resultado chega para você”, ninguém vê a contagem, nem a administração: o site não mostra antes. A partir dela, só você vê, na apresentação da revelação, para gravar o vídeo. O público vê no site a partir do “Resultado público” (em branco = na mesma hora). A votação fecha, no máximo, quando o resultado chega para você.</p>
        <label className="awards-admin__check"><input type="checkbox" checked={a.published} onChange={(e) => set({ published: e.target.checked })} /> Publicada (todos veem a página)</label>
      </div>
      {bad && <p className="awards__error" role="alert">{bad}</p>}
      <button className="btn primary">Gravar a edição</button>
    </form>
  );
}

type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;

function NewCategory({ awardId, position, run }: { awardId: string; position: number; run: Run }) {
  const [name, setName] = useState('');
  return (
    <form className="awards-admin__new" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; void run(() => awardsApi().saveCategory({ awardId, name: name.trim(), position }), 'Categoria criada.').then(() => setName('')); }}>
      <input className="field" placeholder="Nova categoria (ex.: Melhor Remake)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da nova categoria" />
      <button className="btn ghost" disabled={!name.trim()}>Adicionar categoria</button>
    </form>
  );
}

function CategoryEditor({ cat, year, run }: { cat: Category; year: number; run: Run }) {
  const [name, setName] = useState(cat.name);
  const [desc, setDesc] = useState(cat.description ?? '');
  const [pos, setPos] = useState(cat.position);
  const [open, setOpen] = useState(false);
  const dirty = name !== cat.name || desc !== (cat.description ?? '') || pos !== cat.position;
  return (
    <details className="card awards-admin__cat" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary><span className="awards-admin__pos">{cat.position}</span> <strong>{cat.name}</strong> <span className="muted">{cat.nominees.length} {cat.nominees.length === 1 ? 'indicado' : 'indicados'}</span></summary>
      <div className="awards-admin__catform">
        <label><span>Nome</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span>Número</span><input className="field" type="number" value={pos} onChange={(e) => setPos(Number(e.target.value))} /></label>
        <label className="awards-admin__wide"><span>Descrição</span><input className="field" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <div className="awards-admin__row">
          <button className="btn ghost sm" disabled={!dirty || !name.trim()} onClick={() => run(() => awardsApi().saveCategory({ id: cat.id, awardId: cat.awardId, name: name.trim(), description: desc.trim() || undefined, position: pos }), 'Categoria gravada.')}>Gravar</button>
          <ConfirmButton label="Apagar categoria" confirm="Apagar com indicados e votos?" onConfirm={() => run(() => awardsApi().deleteCategory(cat.id), 'Categoria apagada.')} />
        </div>
      </div>
      <ul className="awards-admin__noms">
        {cat.nominees.map((n) => <NomineeRow key={n.id} n={n} run={run} />)}
      </ul>
      {open && <NomineePicker cat={cat} year={year} run={run} />}
    </details>
  );
}

function NomineeRow({ n, run }: { n: Nominee; run: Run }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={open ? 'is-open' : undefined}>
      <span className="awards-admin__art" style={{ backgroundImage: `url("${igdbSize(nomineeArt(n), 't_screenshot_med')}")`, backgroundPosition: n.focus || '50% 50%' }} aria-hidden="true" />
      <span>{n.game.title}{n.game.year ? <span className="faint"> ({n.game.year})</span> : null}{n.art ? null : <span className="faint"> · arte automática</span>}</span>
      <span className="awards-admin__acts">
        <button className="btn quiet sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'Fechar' : 'Arte'}</button>
        <button className="btn quiet sm" onClick={() => run(() => awardsApi().deleteNominee(n.id))} aria-label={`Tirar ${n.game.title}`}>Tirar</button>
      </span>
      {open && <NomineeArtEditor n={n} run={run} onDone={() => setOpen(false)} />}
    </li>
  );
}

/**
 * Escolher a imagem do indicado na votação e o ponto dela que fica à vista.
 * Toque na imagem grande para mudar o ponto; as prévias mostram o cartão reduzido e o aberto.
 */
function NomineeArtEditor({ n, run, onDone }: { n: Nominee; run: Run; onDone: () => void }) {
  const choices = artChoices(n.game);
  const [art, setArt] = useState(nomineeArt(n));
  const [focus, setFocus] = useState(n.focus || '50% 50%');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async (a: string | null, f: string | null, ok: string) => {
    setBusy(true); setMsg('');
    let err = '';
    const done = await run(() => awardsApi().setNomineeArt(n.id, a, f).catch((e) => { err = e instanceof Error ? e.message : String(e); throw e; }), ok);
    setBusy(false);
    if (done) onDone(); else setMsg(err || 'Não consegui gravar a arte.');
  };
  const list = [...new Set([art, ...choices])].filter(Boolean);
  const pickPoint = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100);
    setFocus(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  };
  const [fx, fy] = focus.split(' ');
  return (
    <div className="artpick">
      <p className="muted artpick__help">Escolha uma imagem sem logo e toque nela no ponto que deve ficar à vista quando o cartão estiver reduzido.</p>
      <div className="artpick__thumbs" role="radiogroup" aria-label="Imagens do jogo">
        {list.map((u) => (
          <button key={u} role="radio" aria-checked={u === art} className={`artpick__thumb${u === art ? ' is-on' : ''}`} onClick={() => setArt(u)}>
            <img src={igdbSize(u, 't_screenshot_med')} alt="" loading="lazy" />
          </button>
        ))}
        {list.length === 0 && <span className="muted">Este jogo não tem artes nem capturas no catálogo. Cole o endereço de uma imagem abaixo.</span>}
      </div>
      <div className="artpick__url">
        <input className="field" placeholder="Ou cole o endereço de outra imagem (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Endereço de outra imagem" />
        <button className="btn ghost sm" disabled={!/^https:\/\//.test(url.trim())} onClick={() => { setArt(url.trim()); setUrl(''); }}>Usar</button>
      </div>
      <div className="artpick__stage">
        <div className="artpick__full" onClick={pickPoint} role="presentation">
          <img src={art} alt="" />
          <span className="artpick__dot" style={{ left: fx, top: fy }} aria-hidden="true" />
        </div>
        <div className="artpick__previews">
          <figure><div className="artpick__strip" style={{ backgroundImage: `url("${art}")`, backgroundPosition: focus }} /><figcaption>Reduzido</figcaption></figure>
          <figure><div className="artpick__band" style={{ backgroundImage: `url("${art}")`, backgroundPosition: focus }} /><figcaption>Reduzido no celular</figcaption></figure>
          <figure><div className="artpick__wide" style={{ backgroundImage: `url("${art}")`, backgroundPosition: focus }} /><figcaption>Aberto (seu voto)</figcaption></figure>
        </div>
      </div>
      <div className="awards-admin__row">
        <button className="btn primary sm" disabled={busy} onClick={() => save(art, focus, 'Arte gravada.')}>{busy ? 'Gravando…' : 'Gravar arte'}</button>
        {(n.art || n.focus) && <button className="btn ghost sm" disabled={busy} onClick={() => save(null, null, 'Voltou para a arte automática.')}>Voltar ao automático</button>}
        {msg && <p className="awards__error" role="alert" style={{ margin: 0, flexBasis: '100%' }}>{msg}</p>}
      </div>
    </div>
  );
}

/** Indicados: busca no IGDB, ou sugestões dos mais bem avaliados do ano. */
function NomineePicker({ cat, year, run }: { cat: Category; year: number; run: Run }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState('');
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => { setHits((await searchGames(q.trim(), Object.values(games))).hits.slice(0, 8)); setLabel('Resultados'); }, 300);
    return () => clearTimeout(t);
  }, [q, games]);
  const suggest = async () => {
    setBusy('sugestoes');
    try {
      const r = await fetch(`/api/igdb?explore=1&sort=rating&from=${year}&to=${year}&page=0`);
      setHits(r.ok && (r.headers.get('content-type') ?? '').includes('json') ? ((await r.json()) as Hit[]).slice(0, 12) : []);
      setLabel(`Mais bem avaliados de ${year}`);
    } finally { setBusy(''); }
  };
  const add = async (h: Hit) => {
    setBusy(h.slug);
    await run(async () => {
      const g = h.local ?? Object.values(games).find((x) => x.igdbId && x.igdbId === h.igdbId) ?? (await loadGame(h));
      if (!g) throw new Error('Não consegui carregar a ficha deste jogo.');
      actions.mergeGames([g]);
      await awardsApi().addNominee(cat.id, g, cat.nominees.length);
    }, `${h.title} indicado.`);
    setBusy('');
  };
  const already = new Set(cat.nominees.map((n) => n.game.slug));
  return (
    <div className="awards-admin__pick">
      <div className="awards-admin__row">
        <input className="field" placeholder="Buscar jogo no catálogo para indicar" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Buscar indicado para ${cat.name}`} />
        <button className="btn ghost sm" onClick={suggest} disabled={busy === 'sugestoes'}>{busy === 'sugestoes' ? 'Buscando…' : `Sugestões de ${year}`}</button>
      </div>
      {hits.length > 0 && <p className="faint">{label}</p>}
      <ul className="awards-admin__hits">
        {hits.map((h) => (
          <li key={h.slug}>
            <button className="awards-admin__hit" disabled={already.has(h.slug) || busy === h.slug} onClick={() => add(h)}>
              <span className="awards-admin__cover"><CoverArt game={h} /></span>
              <span>{h.title}{h.year ? ` (${h.year})` : ''}</span>
              <span className="faint">{already.has(h.slug) ? 'Indicado' : busy === h.slug ? 'Indicando…' : 'Indicar'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
