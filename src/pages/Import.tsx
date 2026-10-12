import { useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, getState, commit, uid, nowIso, journeyForGame, slugify } from '../data/store';
import { track } from '../lib/track';
import { isOutdated } from '../lib/version';
import type { Copy, Game, History, Journey, MyGame, Review, TimelineEvent } from '../data/types';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { gameFromApi } from '../components/AddGameDialog';
import { readSpreadsheet, type Sheet } from '../lib/xlsx';
import { planSheet, buildItems, pickBest, simplerTitle, titleKey, FIELD_LABEL, type Field, type Item, type Match, type Role, type SheetPlan, type Candidate } from '../lib/importer';
import { canonicalPlatform, shortPlatform } from '../lib/platforms';
import { normalize } from '../lib/rating';

type Step = 'arquivo' | 'abas' | 'resumo' | 'buscando' | 'revisar' | 'gravando' | 'pronto' | 'falhou';
const ROLES: [Role, string][] = [['lista', 'Lista de jogos (coleção)'], ['zerados', 'Jogos zerados'], ['detalhes', 'Detalhes das cópias'], ['ignorar', 'Ignorar esta aba']];
const FIELDS_BY_ROLE: Record<Role, Field[]> = {
  lista: ['title', 'platform', 'format', 'status', 'priority', 'estHours', 'genre'],
  zerados: ['title', 'platform', 'date', 'hours', 'rating', 'comment', 'genre'],
  detalhes: ['title', 'platform', 'region', 'edition', 'condition', 'boxCondition', 'items', 'purchasedOn', 'purchasePlace', 'pricePaid', 'priceNow'],
  ignorar: [],
};

/** Chama a função do IGDB; se o IGDB pedir calma (limite de 4 pedidos por segundo), espera e tenta de novo. */
async function post(body: unknown, tries = 3): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error(`IGDB indisponível (${r.status})`);
      return await r.json();
    } catch (e) {
      if (i >= tries - 1) throw e;
      await new Promise((ok) => setTimeout(ok, 1200 * (i + 1)));
    }
  }
}

/** Roda tarefas com no máximo n ao mesmo tempo. */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>, stop: () => boolean) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length && !stop()) await fn(items[i++]); }));
}

export function ImportPage() {
  const s = useStore((x) => x);
  const [step, setStep] = useState<Step>('arquivo');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [plans, setPlans] = useState<SheetPlan[]>([]);
  const [error, setError] = useState('');
  const [mergeDups, setMergeDups] = useState(true);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [result, setResult] = useState<{ copies: number; games: number; finished: number; manual: number; reviews: number; linked: number } | null>(null);
  const cancel = useRef(false);
  const blocked = !!s.loadIncomplete || (s.mode === 'supabase' && !s.schemaV4);
  const input = useRef<HTMLInputElement>(null);

  const built = useMemo(() => (plans.length ? buildItems(sheets, plans).items : []), [sheets, plans]);
  const titles = useMemo(() => {
    const by = new Map<string, { title: string; platforms: string[]; items: Item[] }>();
    for (const it of built) {
      const k = titleKey(it.title);
      const e = by.get(k) ?? { title: it.title, platforms: [], items: [] };
      if (it.platform && !e.platforms.includes(it.platform)) e.platforms.push(it.platform);
      e.items.push(it);
      by.set(k, e);
    }
    return by;
  }, [built]);

  const open = async (file: File) => {
    setError('');
    try {
      const sh = await readSpreadsheet(file);
      const ps = sh.map(planSheet);
      if (!ps.some((p) => p.role !== 'ignorar')) throw new Error('Não encontrei uma coluna com o nome dos jogos. A primeira linha da aba precisa ter os títulos das colunas, como “Nome do jogo” e “Plataforma”.');
      setFileName(file.name); setSheets(sh); setPlans(ps); setMatches({}); setStep('abas');
      track('importar.arquivo');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não consegui ler este arquivo.'); }
  };

  const setRole = (i: number, role: Role) => setPlans(plans.map((p, k) => (k === i ? { ...p, role } : p)));
  const setMap = (i: number, f: Field, col: number | null) => setPlans(plans.map((p, k) => {
    if (k !== i) return p;
    const map = { ...p.map };
    if (col == null) delete map[f]; else map[f] = col;
    return { ...p, map };
  }));

  const counts = useMemo(() => {
    const st = getState();
    const copies = built.filter((i) => i.kind).reduce((a, i) => a + 1 + (mergeDups ? 0 : i.duplicates), 0);
    return {
      games: titles.size, copies,
      fisico: built.filter((i) => i.kind === 'fisico').length, digital: built.filter((i) => i.kind === 'digital').length,
      finished: built.filter((i) => i.finish?.state === 'concluida').length, dropped: built.filter((i) => i.finish?.state === 'dropada').length,
      playing: built.filter((i) => i.finish?.state === 'ativa' || i.finish?.state === 'pausada').length,
      rated: built.filter((i) => i.rating != null).length, dups: built.filter((i) => i.duplicates > 0).length,
      prio: built.filter((i) => i.priority).length, already: st.copies.length,
    };
  }, [built, titles, mergeDups]);

  /* Busca no IGDB ---------------------------------------------------------- */
  const search = async () => {
    if (await isOutdated()) { setError('O WinnerZ foi atualizado enquanto esta página estava aberta. Recarregue a página antes de importar.'); return; }
    cancel.current = false;
    setStep('buscando');
    const list = [...titles.entries()].filter(([k]) => !matches[k]);
    const out: Record<string, Match> = { ...matches };
    let done = 0, failed = 0;
    setProgress({ done: 0, total: list.length, label: 'Procurando as fichas no IGDB' });
    const batches: (typeof list)[] = [];
    for (let i = 0; i < list.length; i += 10) batches.push(list.slice(i, i + 10));
    await pool(batches, 2, async (batch) => {
      try {
        const res: { title: string; candidates: Candidate[] }[] = await post({ match: batch.map(([, e]) => ({ title: e.title })) });
        batch.forEach(([k, e], j) => { out[k] = pickBest(e.title, e.platforms, res[j]?.candidates ?? []); });
      } catch { failed += batch.length; }
      done += batch.length;
      setProgress((p) => ({ ...p, done }));
    }, () => cancel.current);
    // Segunda tentativa, com o título mais curto, para quem não achou nada.
    const retry = [...titles.entries()].filter(([k, e]) => out[k] && out[k].confidence === 'nenhuma' && simplerTitle(e.title));
    if (retry.length && !cancel.current) {
      setProgress({ done: 0, total: retry.length, label: 'Tentando de novo com títulos mais curtos' });
      let d2 = 0;
      const b2: (typeof retry)[] = [];
      for (let i = 0; i < retry.length; i += 10) b2.push(retry.slice(i, i + 10));
      await pool(b2, 2, async (batch) => {
        try {
          const res: { candidates: Candidate[] }[] = await post({ match: batch.map(([, e]) => ({ title: simplerTitle(e.title) })) });
          batch.forEach(([k, e], j) => {
            const m = pickBest(e.title, e.platforms, res[j]?.candidates ?? []);
            // Achado pelo título curto: nunca é certeza, a pessoa confere.
            if (m.chosen) out[k] = { ...m, confidence: m.confidence === 'alta' ? 'media' : m.confidence };
          });
        } catch { /* fica sem ficha */ }
        d2 += batch.length;
        setProgress((p) => ({ ...p, done: d2 }));
      }, () => cancel.current);
    }
    setMatches(out);
    if (failed === list.length && list.length) setError('A busca no IGDB não respondeu. Você pode tentar de novo depois, ou importar agora sem as fichas (dá para ligar cada jogo ao IGDB mais tarde).');
    setStep('revisar');
    track('importar.busca');
  };

  /* Gravação ---------------------------------------------------------------- */
  const save = async () => {
    if (await isOutdated()) { setError('O WinnerZ foi atualizado enquanto esta página estava aberta. Recarregue a página antes de importar.'); return; }
    setStep('gravando'); setError('');
    try {
      let st = getState();
      const chosen = new Map<string, number>(); // titleKey → igdbId
      for (const [k, m] of Object.entries(matches)) if (m.chosen) chosen.set(k, m.chosen);
      // Fichas do IGDB: as que já estão no site são reaproveitadas; as outras vêm em lotes de 100.
      const byIgdb = new Map<number, Game>(Object.values(st.games).filter((g) => g.igdbId).map((g) => [g.igdbId!, g]));
      const need = [...new Set(chosen.values())].filter((id) => !byIgdb.has(id));
      setProgress({ done: 0, total: need.length, label: 'Trazendo capas e fichas' });
      const fetched: Game[] = [];
      for (let i = 0; i < need.length; i += 100) {
        try {
          const rows: any[] = await post({ cache: need.slice(i, i + 100) });
          for (const r of rows) { const g = gameFromApi(r); fetched.push(g); byIgdb.set(g.igdbId!, g); }
        } catch { /* esses ficam como jogos sem ficha */ }
        setProgress((p) => ({ ...p, done: Math.min(need.length, i + 100) }));
      }

      // Jogos que entraram antes sem ficha e agora acharam a ficha: tudo deles passa para a ficha (sem duplicar).
      const relink: { fromId: string; to: Game }[] = [];
      for (const g0 of Object.values(st.games)) {
        if (g0.source !== 'manual') continue;
        const id = chosen.get(titleKey(g0.title));
        const to = id ? byIgdb.get(id) : undefined;
        if (to && to.id !== g0.id && !relink.some((r) => r.fromId === g0.id)) relink.push({ fromId: g0.id, to });
      }
      if (relink.length) {
        setProgress({ done: 0, total: 1, label: `Ligando ${relink.length} jogos às fichas do IGDB` });
        await commit({ type: 'games.relinkMany', pairs: relink });
        st = getState();
      }

      setProgress({ done: 0, total: 1, label: 'Gravando na sua coleção' });
      const manualByTitle = new Map<string, Game>(Object.values(st.games).filter((g) => g.source === 'manual').map((g) => [titleKey(g.title), g]));
      const newGames: Game[] = [...fetched];
      const gameFor = (k: string, e: { title: string; items: Item[] }): Game => {
        const id = chosen.get(k);
        const g = id ? byIgdb.get(id) : undefined;
        if (g) return g;
        const existing = manualByTitle.get(k);
        if (existing) return existing;
        const gid = `wz-${uid().replace(/-/g, '').slice(0, 12)}`;
        const genre = e.items.find((i) => i.genre)?.genre;
        const m: Game = { id: gid, slug: `${slugify(e.title) || 'jogo'}-${gid.slice(3, 9)}`, title: e.title, cover: '', platforms: [...new Set(e.items.map((i) => i.platform).filter(Boolean))], genres: genre, source: 'manual', createdBy: st.profile?.id };
        manualByTitle.set(k, m); newGames.push(m);
        return m;
      };

      const copies: Copy[] = [], journeys: Journey[] = [], histories: History[] = [], events: TimelineEvent[] = [];
      // Dois títulos da planilha podem cair na mesma ficha do IGDB: tudo é agrupado pelo jogo do site.
      const want = new Map<string, { gameId: string; platform: string; kind: Copy['kind']; n: number; detail?: Item['detail'] }>();
      const myMap = new Map<string, { mine: MyGame; changed: boolean }>();
      const reviewMap = new Map<string, Review>();
      const journeyDone = new Set<string>();
      let finished = 0;
      for (const [k, e] of titles) {
        const g = gameFor(k, e);
        // Parte do que já existe no banco, para não apagar recado, prioridade etc. ao importar de novo.
        const entry = myMap.get(g.id) ?? { mine: { ...st.myGames[g.id], gameId: g.id }, changed: false };
        const mine = entry.mine;
        for (const it of e.items) {
          if (it.kind) {
            const platform = it.platform || 'Outra plataforma';
            const key = `${g.id}|${canonicalPlatform(platform)}|${it.kind}`;
            const w = want.get(key) ?? { gameId: g.id, platform, kind: it.kind, n: 0 };
            w.n += 1 + (mergeDups ? 0 : it.duplicates);
            w.detail = w.detail ?? it.detail;
            want.set(key, w);
          }
          if (it.priority) { mine.priority = it.priority; entry.changed = true; }
          if (it.estHours != null) { mine.estHours = Math.round(it.estHours * 10) / 10; entry.changed = true; }
          if (it.genre && !mine.genre) { mine.genre = it.genre; entry.changed = true; }
          if (it.wontPlay) { mine.wontPlay = true; entry.changed = true; }
        }
        myMap.set(g.id, entry);
        const fin = e.items.find((i) => i.finish)?.finish;
        if (fin && !journeyForGame(st, g.id) && !journeyDone.has(g.id)) {
          journeyDone.add(g.id);
          const j: Journey = { id: uid(), gameId: g.id, mood: fin.state === 'pausada' ? 'pausado' : 'jogando', createdAt: nowIso() };
          const when = fin.when ?? { iso: nowIso(), precision: 'desconhecida' as const };
          const closed = fin.state === 'concluida' || fin.state === 'dropada';
          const h: History = {
            id: uid(), journeyId: j.id, ordinal: 1, title: 'Primeira vez', state: fin.state,
            startedAt: when.iso, startedPrecision: 'desconhecida', completedAt: closed ? when.iso : undefined, completedPrecision: closed ? when.precision : undefined,
            progress: fin.state === 'concluida' ? 100 : undefined, hours: fin.hours,
          };
          const hoursText = fin.hours ? `, ${String(fin.hours).replace('.', ',')} horas informadas` : '';
          events.push(closed
            ? { id: uid(), journeyId: j.id, historyId: h.id, kind: 'marco', at: when.iso, precision: when.precision, title: fin.state === 'concluida' ? 'Zerou' : 'Largou', text: `Veio da sua planilha${hoursText}.` }
            : { id: uid(), journeyId: j.id, historyId: h.id, kind: 'inicio', at: when.iso, precision: 'desconhecida', title: 'Primeira vez', text: 'Veio da sua planilha.' });
          journeys.push(j); histories.push(h);
          if (fin.state === 'concluida') finished++;
        }
        const rated = e.items.find((i) => i.rating != null);
        if (rated && !reviewMap.has(g.id) && !st.reviews.some((r) => r.mine && r.gameId === g.id)) {
          reviewMap.set(g.id, { id: uid(), gameId: g.id, mine: true, author: { name: st.profile?.name ?? 'Você', initial: st.profile?.initial ?? 'V', color: '#5A4630' }, rating: normalize(rated.rating!, 'TEN_POINT'), title: '', text: rated.comment ?? '', writtenAt: nowIso() });
        }
      }
      // Cópias: só a diferença entre o que a planilha tem e o que já está na coleção.
      const have = new Map<string, number>();
      for (const c of st.copies) { const key = `${c.gameId}|${canonicalPlatform(c.platform)}|${c.kind}`; have.set(key, (have.get(key) ?? 0) + 1); }
      for (const [key, w] of want) {
        for (let x = have.get(key) ?? 0; x < w.n; x++) copies.push({ id: uid(), gameId: w.gameId, platform: w.platform, kind: w.kind, createdAt: nowIso(), ...w.detail });
      }
      const myGames = [...myMap.values()].filter((x) => x.changed).map((x) => x.mine);
      const reviews = [...reviewMap.values()];
      // Fichas do IGDB já gravadas pela função; aqui entram só as dos jogos sem ficha (e as do IGDB vão para a tela).
      await commit({ type: 'import.bulk', data: { games: newGames, copies, myGames, journeys, histories, events, reviews } });
      setResult({ copies: copies.length, games: titles.size, finished, manual: newGames.filter((g) => g.source === 'manual').length, reviews: reviews.length, linked: relink.length });
      setStep('pronto');
      track('importar.concluido');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado ao gravar.');
      setStep('falhou');
    }
  };

  return (
    <main className="page pad importer">
      <SubNav pillar="colecao" />
      <h1 className="t big">Importar planilha</h1>
      <p className="muted lead">Traga sua coleção de uma vez. Você confere tudo antes de gravar, e pode importar de novo depois: o que já está no site não duplica.</p>
      {error && <p className="card import-error" role="alert">{error}</p>}

      {step === 'arquivo' && (
        <section className="card drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) open(f); }}>
          <p className="t drop__title">Escolha sua planilha</p>
          <p className="muted">Excel (.xlsx) ou CSV. A primeira linha de cada aba precisa ter os nomes das colunas, como “Nome do jogo”, “Plataforma”, “Formato”, “Status”.</p>
          <input ref={input} type="file" accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) open(f); e.target.value = ''; }} />
          <button className="btn primary lg" onClick={() => input.current?.click()}>Escolher arquivo</button>
          <p className="faint">O arquivo é lido aqui no seu navegador. Só os dados dos jogos vão para a sua conta.</p>
        </section>
      )}

      {step === 'abas' && (
        <section aria-labelledby="abas-h">
          <h2 id="abas-h" className="t import__h">Abas de “{fileName}”</h2>
          <p className="muted">Reconheci as abas pelo nome das colunas. Confira e ajuste se algo estiver errado.</p>
          <div className="import-sheets">
            {plans.map((p, i) => (
              <article key={p.name + i} className={`card import-sheet${p.role === 'ignorar' ? ' is-off' : ''}`}>
                <div className="import-sheet__head">
                  <div><strong>{p.name}</strong><span className="muted">{p.dataRows ? `${p.dataRows} linhas com jogos` : 'sem lista de jogos'}</span></div>
                  <label><span className="sr-only">O que é esta aba</span>
                    <select className="field" value={p.role} onChange={(e) => setRole(i, e.target.value as Role)}>{ROLES.map(([r, l]) => <option key={r} value={r}>{l}</option>)}</select>
                  </label>
                </div>
                {p.role !== 'ignorar' && (
                  <details className="import-sheet__map">
                    <summary>{FIELDS_BY_ROLE[p.role].filter((f) => p.map[f] != null).map((f) => FIELD_LABEL[f]).join(', ') || 'Nenhuma coluna reconhecida'}. Ajustar colunas</summary>
                    <div className="import-map">
                      {FIELDS_BY_ROLE[p.role].map((f) => (
                        <label key={f}>{FIELD_LABEL[f]}
                          <select className="field" value={p.map[f] ?? ''} onChange={(e) => setMap(i, f, e.target.value === '' ? null : Number(e.target.value))}>
                            <option value="">Não tem</option>
                            {p.columns.map((c, k) => c && <option key={k} value={k}>{c}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            ))}
          </div>
          <div className="import__actions">
            <button className="btn primary lg" disabled={!built.length} onClick={() => setStep('resumo')}>Continuar</button>
            <button className="btn quiet" onClick={() => setStep('arquivo')}>Escolher outro arquivo</button>
          </div>
        </section>
      )}

      {step === 'resumo' && (
        <section aria-labelledby="resumo-h">
          <h2 id="resumo-h" className="t import__h">O que vai entrar</h2>
          <div className="kpis">
            <div className="kpi"><span className="kpi__n t">{counts.games.toLocaleString('pt-BR')}</span><span className="kpi__l">jogos</span><span className="kpi__s">{counts.copies.toLocaleString('pt-BR')} cópias: {counts.fisico} físicas, {counts.digital} digitais</span></div>
            <div className="kpi"><span className="kpi__n t">{counts.finished}</span><span className="kpi__l">zerados</span><span className="kpi__s">{counts.rated ? `${counts.rated} com nota` : 'sem notas'}{counts.dropped ? `, ${counts.dropped} largados` : ''}</span></div>
            <div className="kpi"><span className="kpi__n t">{counts.prio.toLocaleString('pt-BR')}</span><span className="kpi__l">com prioridade</span><span className="kpi__s">alimentam o “O que jogar”</span></div>
          </div>
          {counts.dups > 0 && (
            <label className="card import-dups">
              <input type="checkbox" checked={mergeDups} onChange={(e) => setMergeDups(e.target.checked)} />
              <span><strong>Juntar linhas repetidas ({counts.dups})</strong><span className="muted">O mesmo jogo, na mesma plataforma, aparece mais de uma vez na lista. Desmarque se você tem mais de uma cópia de verdade.</span></span>
            </label>
          )}
          {counts.already > 0 && <p className="muted">Sua coleção já tem {counts.already} cópias. O que já existe não será duplicado.</p>}
          <div className="import__actions">
            <button className="btn primary lg" disabled={blocked} onClick={search}>Procurar capas e fichas no IGDB</button>
            <button className="btn ghost" disabled={blocked} onClick={() => setStep('revisar')}>Importar sem buscar no IGDB</button>
            <button className="btn quiet" onClick={() => setStep('abas')}>Voltar</button>
          </div>
          <p className="faint">A busca leva alguns minutos (cerca de 5 para 900 jogos); deixe esta página aberta. Depois você revisa os casos duvidosos.</p>
        </section>
      )}

      {(step === 'buscando' || step === 'gravando') && (
        <section className="card import-progress" aria-live="polite">
          <p className="t">{progress.label}…</p>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 30}%` }} /></div>
          <p className="muted">{progress.total > 1 ? `${progress.done} de ${progress.total}` : 'Quase lá.'}</p>
          {step === 'buscando' && <button className="btn quiet" onClick={() => { cancel.current = true; }}>Parar e revisar o que já achou</button>}
        </section>
      )}

      {step === 'revisar' && <Review titles={titles} matches={matches} setMatches={setMatches} onSave={save} onBack={() => setStep('resumo')} blocked={blocked} />}

      {step === 'falhou' && (
        <section className="card import-done">
          <p className="t">A gravação parou no meio</p>
          <p className="muted">Parte da coleção pode já ter sido gravada. Recarregue a página e importe a mesma planilha de novo: o que já entrou é reconhecido e não duplica.</p>
          <div className="import__actions"><button className="btn primary lg" onClick={() => location.reload()}>Recarregar a página</button></div>
        </section>
      )}

      {step === 'pronto' && result && (
        <section className="card import-done">
          <p className="t">Pronto. Sua coleção chegou.</p>
          {result.linked > 0 && <p className="muted">{result.linked.toLocaleString('pt-BR')} jogos que tinham entrado sem ficha agora estão ligados ao IGDB, com capa.</p>}
          <p className="muted">{result.copies.toLocaleString('pt-BR')} cópias novas de {result.games.toLocaleString('pt-BR')} jogos, {result.finished} zerados na Jornada{result.reviews ? `, ${result.reviews} notas` : ''}.{result.manual ? ` ${result.manual} jogos ficaram sem ficha do IGDB; dá para ligar cada um na página do jogo.` : ''}</p>
          <div className="import__actions">
            <Link className="btn primary lg" to="/colecao">Ver a estante</Link>
            <Link className="btn ghost" to="/colecao/estatisticas">Ver as estatísticas</Link>
            <Link className="btn quiet" to="/jornada/concluidas">Histórias concluídas</Link>
          </div>
        </section>
      )}
      {s.loadIncomplete && step !== 'pronto' && (
        <p className="card import-error">Parte da sua coleção não carregou (falha de conexão). Recarregue a página antes de importar, para nada ser duplicado.</p>
      )}
      {s.mode === 'supabase' && !s.schemaV4 && step !== 'pronto' && (
        <p className="card import-error">Antes de importar, rode a migração 0004 no Supabase (SQL Editor). Sem ela, os jogos sem ficha e os dados novos não podem ser gravados.</p>
      )}
    </main>
  );
}

const CONF_LABEL: Record<Match['confidence'], string> = { alta: 'Certeza', media: 'Confira', baixa: 'Duvidoso', nenhuma: 'Não achei' };

function Review({ titles, matches, setMatches, onSave, onBack, blocked }: { titles: Map<string, { title: string; platforms: string[]; items: Item[] }>; matches: Record<string, Match>; setMatches: (m: Record<string, Match>) => void; onSave: () => void; onBack: () => void; blocked: boolean }) {
  const [tab, setTab] = useState<'revisar' | 'casados' | 'sem'>('revisar');
  const [limit, setLimit] = useState(40);
  const entries = [...titles.entries()].map(([k, e]) => ({ k, e, m: matches[k] ?? { candidates: [], chosen: null, confidence: 'nenhuma' as const } }));
  const groups = {
    revisar: entries.filter((x) => x.m.chosen && x.m.confidence !== 'alta'),
    casados: entries.filter((x) => x.m.chosen && x.m.confidence === 'alta'),
    sem: entries.filter((x) => !x.m.chosen),
  };
  const list = groups[tab].sort((a, b) => a.e.title.localeCompare(b.e.title, 'pt-BR'));
  const choose = (k: string, id: number | null) => setMatches({ ...matches, [k]: { ...(matches[k] ?? { candidates: [], confidence: 'nenhuma' }), chosen: id, confidence: id ? 'alta' : 'nenhuma' } });
  const searched = Object.keys(matches).length > 0;

  return (
    <section aria-labelledby="rev-h">
      <h2 id="rev-h" className="t import__h">{searched ? 'Confira as fichas' : 'Pronto para importar'}</h2>
      {searched ? (
        <p className="muted">{groups.casados.length} jogos casaram com certeza. {groups.revisar.length ? `${groups.revisar.length} precisam de uma olhada rápida.` : ''} {groups.sem.length ? `${groups.sem.length} ficam sem ficha por enquanto (com capa de texto); dá para ligar depois.` : ''}</p>
      ) : (
        <p className="muted">Sem a busca, todos os {titles.size} jogos entram sem ficha do IGDB, com capas de texto. Dá para ligar cada um à ficha depois, na página do jogo.</p>
      )}
      {searched && (
        <div className="seg import-tabs" role="tablist">
          {([['revisar', 'Para conferir'], ['casados', 'Com certeza'], ['sem', 'Sem ficha']] as const).map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => { setTab(id); setLimit(40); }}>{l} ({groups[id].length})</button>
          ))}
        </div>
      )}
      {searched && (
        <ul className="import-review">
          {list.slice(0, limit).map(({ k, e, m }) => {
            const c = m.candidates.find((x) => x.igdbId === m.chosen);
            return (
              <li key={k} className="import-row">
                <div className="import-row__src"><strong>{e.title}</strong><span className="muted">{e.platforms.map(shortPlatform).join(', ') || 'sem plataforma'}</span></div>
                <div className="import-row__pick">
                  <span className="import-row__cover"><CoverArt game={{ title: c?.title ?? e.title, cover: c?.cover ?? '' }} /></span>
                  <div>
                    <span className={`import-conf import-conf--${m.confidence}`}>{CONF_LABEL[m.confidence]}</span>
                    <label className="sr-only" htmlFor={`pick-${k}`}>Ficha para {e.title}</label>
                    <select id={`pick-${k}`} className="field" value={m.chosen ?? ''} onChange={(ev) => choose(k, ev.target.value ? Number(ev.target.value) : null)}>
                      <option value="">Sem ficha do IGDB</option>
                      {m.candidates.map((x) => <option key={x.igdbId} value={x.igdbId}>{x.title}{x.year ? ` (${x.year})` : ''}{x.platforms.length ? `, ${x.platforms.slice(0, 3).map(shortPlatform).join(', ')}` : ''}</option>)}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
          {list.length === 0 && <li className="muted">Nada aqui.</li>}
        </ul>
      )}
      {limit < list.length && <button className="btn ghost" onClick={() => setLimit(limit + 80)}>Mostrar mais ({list.length - limit})</button>}
      <div className="import__actions import__actions--sticky">
        <button className="btn primary lg" disabled={blocked} onClick={onSave}>Importar {titles.size.toLocaleString('pt-BR')} jogos</button>
        <button className="btn quiet" onClick={onBack}>Voltar</button>
      </div>
    </section>
  );
}
