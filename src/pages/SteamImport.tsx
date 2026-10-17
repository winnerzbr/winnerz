import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, commit, getState, uid, slugify } from '../data/store';
import type { Copy, Game, MyGame } from '../data/types';
import { SubNav } from '../components/SubNav';
import { gameFromApi } from '../components/AddGameDialog';
import { canonicalPlatform } from '../lib/platforms';
import { accessToken } from '../data/supabaseAdapter';
import { isOutdated } from '../lib/version';
import { track } from '../lib/track';

type SteamGame = { appid: number; name: string; minutes: number; lastPlayed?: string; igdbId?: number };
const PC = 'PC (Microsoft Windows)';
const KEY = 'wz.steam.perfil';
const fmtH = (min: number) => (min < 60 ? `${min} min` : `${(Math.round(min / 6) / 10).toLocaleString('pt-BR')} h`);

/**
 * Importar da Steam: os jogos da conta viram cópias digitais de PC na estante, e as horas
 * ficam guardadas como "Informado pela Steam". Nenhuma Jornada é criada: horas não dizem se você zerou.
 */
export function SteamImportPage() {
  const s = useStore((x) => x);
  const [profile, setProfile] = useState(() => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } });
  const [step, setStep] = useState<'perfil' | 'buscando' | 'revisar' | 'gravando' | 'pronto'>('perfil');
  const [error, setError] = useState('');
  const [lib, setLib] = useState<SteamGame[]>([]);
  const [opts, setOpts] = useState({ add: true, hours: true, unmatched: false });
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState({ copies: 0, hours: 0, manual: 0 });

  const byIgdb = useMemo(() => new Map(Object.values(s.games).filter((g) => g.igdbId).map((g) => [g.igdbId!, g])), [s.games]);
  const onPc = (gameId: string) => s.copies.some((c) => c.gameId === gameId && canonicalPlatform(c.platform) === canonicalPlatform(PC));
  const plan = useMemo(() => {
    const matched = lib.filter((g) => g.igdbId);
    const unmatched = lib.filter((g) => !g.igdbId);
    const already = matched.filter((g) => { const x = byIgdb.get(g.igdbId!); return x && onPc(x.id); });
    const manualByTitle = new Map(Object.values(s.games).filter((g) => g.source === 'manual').map((g) => [g.title.toLowerCase(), g]));
    const unmatchedNew = unmatched.filter((g) => { const x = manualByTitle.get(g.name.toLowerCase()); return !(x && onPc(x.id)); });
    return { matched, unmatched, already, toAdd: matched.length - already.length, unmatchedNew, withHours: lib.filter((g) => g.minutes > 0) };
  }, [lib, byIgdb, s]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLib = async () => {
    setError(''); setStep('buscando');
    try { localStorage.setItem(KEY, profile.trim()); } catch { /* ok */ }
    try {
      const token = await accessToken();
      const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ steam: profile.trim() }) });
      const j = await r.json().catch(() => ({ error: 'A Steam não respondeu agora.' }));
      if (!r.ok) throw new Error(j.error ?? 'A Steam não respondeu agora.');
      setLib((j.games as SteamGame[]).sort((a, b) => b.minutes - a.minutes));
      setStep('revisar');
      track('steam.buscar');
    } catch (e) { setError(e instanceof Error ? e.message : 'Algo deu errado.'); setStep('perfil'); }
  };

  const save = async () => {
    if (await isOutdated()) { setError('O WinnerZ foi atualizado enquanto esta página estava aberta. Recarregue a página antes de importar.'); return; }
    setStep('gravando'); setError('');
    try {
      const st = getState();
      const known = new Map(Object.values(st.games).filter((g) => g.igdbId).map((g) => [g.igdbId!, g]));
      const need = [...new Set(plan.matched.map((g) => g.igdbId!))].filter((id) => !known.has(id));
      const fresh: Game[] = [];
      for (let i = 0; i < need.length; i += 100) {
        setProgress(`Trazendo fichas do catálogo (${Math.min(need.length, i + 100)} de ${need.length})`);
        const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cache: need.slice(i, i + 100) }) });
        if (r.ok) for (const row of (await r.json()) as any[]) { const g = gameFromApi(row); fresh.push(g); known.set(g.igdbId!, g); }
      }
      setProgress('Gravando na sua coleção');
      const pcHas = (id: string) => st.copies.some((c) => c.gameId === id && canonicalPlatform(c.platform) === canonicalPlatform(PC));
      const copies: Copy[] = [], myGames: MyGame[] = [], manual: Game[] = [];
      const seen = new Set<string>();
      const manualByTitle = new Map(Object.values(st.games).filter((g) => g.source === 'manual').map((g) => [g.title.toLowerCase(), g]));
      for (const sg of lib) {
        let g = sg.igdbId ? known.get(sg.igdbId) : undefined;
        if (!g && !sg.igdbId && opts.unmatched) {
          g = manualByTitle.get(sg.name.toLowerCase());
          if (!g) {
            const id = `wz-${uid().replace(/-/g, '').slice(0, 12)}`;
            g = { id, slug: `${slugify(sg.name) || 'jogo'}-${id.slice(3, 9)}`, title: sg.name, cover: '', platforms: [PC], source: 'manual', createdBy: st.profile?.id };
            manual.push(g); manualByTitle.set(sg.name.toLowerCase(), g);
          }
        }
        if (!g || seen.has(g.id)) continue;
        seen.add(g.id);
        if (opts.add && !pcHas(g.id)) copies.push({ id: uid(), gameId: g.id, platform: PC, kind: 'digital', origin: 'Steam', createdAt: new Date().toISOString() });
        // Horas só para o que fica na estante; o resto do que você já anotou continua.
        const owned = pcHas(g.id) || copies.some((c) => c.gameId === g!.id);
        if (opts.hours && owned && sg.minutes > 0 && st.myGames[g.id]?.steamMinutes !== sg.minutes) myGames.push({ ...st.myGames[g.id], gameId: g.id, steamMinutes: sg.minutes });
      }
      await commit({ type: 'import.bulk', data: { games: [...fresh, ...manual], copies, myGames, journeys: [], histories: [], events: [], reviews: [] } });
      setDone({ copies: copies.length, hours: myGames.length, manual: manual.length });
      setStep('pronto');
      track('steam.importar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'A gravação parou no meio. Recarregue e tente de novo: o que entrou não se repete.');
      setStep('revisar');
    }
  };

  const blocked = s.mode !== 'supabase' ? 'Disponível com conta: no modo demonstração não dá para ler a Steam.' : !s.schemaV6 ? 'Falta rodar a migração 0006 no Supabase para guardar as horas da Steam.' : '';

  return (
    <main className="page pad importer steam">
      <header className="page-head">
        <div className="page-head__text">
          <Link className="back" to="/colecao/importar">← Importar planilha</Link>
          <h1 className="t big">Importar da Steam</h1>
          <p className="muted lead">Os jogos da sua conta entram na estante como cópias digitais de PC. O tempo jogado fica guardado como “Informado pela Steam”. Nenhuma Jornada é criada: horas não dizem se você zerou, e isso é você quem conta.</p>
        </div>
        <SubNav pillar="colecao" />
      </header>

      {step === 'pronto' ? (
        <section className="card import-done">
          <p className="t">Pronto.</p>
          <p className="muted">{done.copies} {done.copies === 1 ? 'jogo entrou' : 'jogos entraram'} na estante como PC (Steam){done.manual ? `, ${done.manual} deles sem ficha do catálogo` : ''}. {done.hours} {done.hours === 1 ? 'jogo ganhou' : 'jogos ganharam'} as horas da Steam. Dá para importar de novo quando quiser: o que já está lá não se repete, e as horas se atualizam.</p>
          <div className="import__actions"><Link className="btn primary lg" to="/colecao">Ver a estante</Link></div>
        </section>
      ) : blocked ? (
        <div className="card tl-empty"><p className="muted">{blocked}</p></div>
      ) : step === 'perfil' || step === 'buscando' ? (
        <section className="card steam__form">
          <label htmlFor="steam-perfil" className="t steam__label">Seu perfil da Steam</label>
          <p className="muted">Cole o endereço do perfil (ex.: steamcommunity.com/id/seunome) ou o número de 17 dígitos. O perfil precisa mostrar “Detalhes do jogo” como público, nas configurações de privacidade da Steam.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (profile.trim()) void fetchLib(); }} className="steam__row">
            <input id="steam-perfil" className="field" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="https://steamcommunity.com/id/…" autoComplete="off" />
            <button className="btn primary" disabled={!profile.trim() || step === 'buscando'}>{step === 'buscando' ? 'Buscando…' : 'Buscar meus jogos'}</button>
          </form>
          {error && <p className="steam__error" role="alert">{error}</p>}
        </section>
      ) : (
        <section aria-labelledby="steam-h">
          <h2 id="steam-h" className="t import__h">{lib.length} jogos na sua Steam</h2>
          <div className="kpis">
            <div className="kpi"><span className="kpi__n t">{plan.matched.length.toLocaleString('pt-BR')}</span><span className="kpi__l">com ficha do catálogo</span></div>
            <div className="kpi"><span className="kpi__n t">{plan.already.length.toLocaleString('pt-BR')}</span><span className="kpi__l">já na estante como PC</span></div>
            <div className="kpi"><span className="kpi__n t">{plan.withHours.length.toLocaleString('pt-BR')}</span><span className="kpi__l">com tempo jogado</span></div>
          </div>
          <div className="steam__opts">
            <label><input type="checkbox" checked={opts.add} onChange={(e) => setOpts({ ...opts, add: e.target.checked })} /> Adicionar à estante os {plan.toAdd} que ainda não estão lá como PC</label>
            <label><input type="checkbox" checked={opts.hours} onChange={(e) => setOpts({ ...opts, hours: e.target.checked })} /> Guardar o tempo jogado (Informado pela Steam)</label>
            {plan.unmatchedNew.length > 0 && <label><input type="checkbox" checked={opts.unmatched} onChange={(e) => setOpts({ ...opts, unmatched: e.target.checked })} /> Incluir também os {plan.unmatchedNew.length} sem ficha do catálogo (entram como jogos sem ficha; dá para ligar depois)</label>}
          </div>
          <ul className="steam__list">
            {lib.slice(0, 40).map((g) => {
              const x = g.igdbId ? byIgdb.get(g.igdbId) : undefined;
              return (
                <li key={g.appid}>
                  <span className="steam__name">{g.name}</span>
                  <span className="muted">{g.minutes ? fmtH(g.minutes) : 'Não jogado'}{!g.igdbId ? ' · sem ficha do catálogo' : x && onPc(x.id) ? ' · já na estante' : ''}</span>
                </li>
              );
            })}
          </ul>
          {lib.length > 40 && <p className="faint">E mais {lib.length - 40}.</p>}
          {error && <p className="steam__error" role="alert">{error}</p>}
          <div className="import__actions import__actions--sticky">
            <button className="btn primary lg" disabled={step === 'gravando' || !(opts.add || opts.hours)} onClick={save}>{step === 'gravando' ? progress || 'Gravando…' : 'Importar'}</button>
            <button className="btn quiet" onClick={() => setStep('perfil')}>Trocar perfil</button>
          </div>
        </section>
      )}
    </main>
  );
}
