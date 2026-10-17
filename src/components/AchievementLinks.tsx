/**
 * C3 · "Conquistas ligadas" na lista do jogo: cada conquista de história da Steam e do RetroAchievements e o item da
 * lista em que a pessoa fica depois de desbloquear. A IA liga uma vez por jogo; quem tem o jogo na Jornada corrige
 * (vale para todo mundo, e a IA não refaz por cima). Os nomes das conquistas podem contar o que vem à frente: ficam
 * cobertos até a pessoa pedir.
 */
import { useEffect, useMemo, useState } from 'react';
import { achievementApi, PROVIDER_NAME, type AchLink, type AchLinks } from '../data/bridgeApi';
import { unitOf, type GameOutline } from '../lib/outline';
import { applyPartMoves } from './Bridges';

const STATE_TEXT: Record<string, string> = {
  feito: 'Conquistas ligadas. Se você já tinha alguma, a sua marca andou.',
  pronto: 'Este jogo já tinha as conquistas ligadas. Conferimos as suas.',
  limite: 'O limite de jogos de hoje acabou. Tente amanhã.',
  sem_conquistas: 'Não achamos conquistas de história para ligar neste jogo.',
  rodando: 'As conquistas já estão sendo ligadas. Volte em instantes.',
  desistiu: 'Tentamos há pouco. Tente mais tarde.',
  sem_lista: 'O jogo precisa de uma lista primeiro.',
  sem_ia: 'A IA ainda não foi ligada no servidor.',
  erro: 'Não deu agora. Tente de novo.',
};

export function AchievementLinks({ gameId, outline }: { gameId: string; outline: GameOutline }) {
  const [data, setData] = useState<AchLinks | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(false);
  const [all, setAll] = useState(false);
  const parts = useMemo(() => [...outline.parts].sort((a, b) => a.pct - b.pct), [outline.parts]);
  const u = unitOf(outline);
  const nOf = (id: string | null) => (id ? parts.findIndex((p) => p.id === id) : -1);

  const load = () => achievementApi.links(gameId).then(setData).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu para carregar.'));
  useEffect(() => { void load(); }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  const linkNow = async () => {
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await achievementApi.linkNow(gameId);
      setMsg(r.reason ?? STATE_TEXT[r.state] ?? STATE_TEXT.erro);
      await load();
      if (r.moves) await applyPartMoves();
    } catch (e) { setErr(e instanceof Error ? e.message : STATE_TEXT.erro); }
    finally { setBusy(false); }
  };
  const change = async (l: AchLink, partId: string) => {
    setErr('');
    try { setData(await achievementApi.setLink(gameId, l, partId || null)); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); }
  };

  if (!data) return <div className="ach" role="status">{err ? <p className="form-error">{err}</p> : <p className="muted">Carregando as conquistas…</p>}</div>;
  const linked = data.links.filter((l) => l.partId).sort((a, b) => nOf(a.partId) - nOf(b.partId));
  const rest = data.links.filter((l) => !l.partId);
  const rows = all ? [...linked, ...rest] : linked;
  const canLink = data.canEdit && data.bridges.length > 0;

  return (
    <section className="ach" aria-label="Conquistas ligadas">
      <h3 className="ach__title">Conquistas ligadas</h3>
      <p className="muted ach__lead">Quando você desbloqueia uma destas na Steam ou no RetroAchievements, a sua marca na lista anda sozinha, com a data da conquista. Nunca volta para trás e nunca passa por cima do que você marcou depois.</p>
      {!data.links.length ? (
        <>
          <p className="ach__empty">{data.job === 'sem_conquistas' ? STATE_TEXT.sem_conquistas : 'Nenhuma conquista ligada a esta lista ainda.'}</p>
          {canLink
            ? <button className="btn ghost sm" disabled={busy} onClick={() => void linkNow()}>{busy ? 'Ligando…' : 'Ligar as conquistas agora'}</button>
            : !data.bridges.length && <p className="faint ach__hint">Ligue a Steam ou o RetroAchievements nas Preferências para o jogo andar sozinho.</p>}
        </>
      ) : !shown ? (
        <div className="ach__cover">
          <span><b>{linked.length} {linked.length === 1 ? 'conquista ligada' : 'conquistas ligadas'}</b> <span className="muted">Os nomes podem contar o que vem à frente.</span></span>
          <button className="btn ghost sm" onClick={() => setShown(true)}>Mostrar</button>
        </div>
      ) : (
        <>
          <ul className="ach__list">
            {rows.map((l) => (
              <li key={`${l.provider}:${l.key}`} className={`ach__row${l.partId ? '' : ' is-off'}`}>
                <div className="ach__name">
                  <b>{l.name}</b>
                  <small>{PROVIDER_NAME[l.provider]} · {l.origin === 'pessoa' ? 'corrigida pela comunidade' : 'ligada pela IA'}</small>
                </div>
                <label className="ach__pick">
                  <span className="sr-only">Item da lista para {l.name}</span>
                  <select className="field" value={l.partId ?? ''} disabled={!data.canEdit} onChange={(e) => void change(l, e.target.value)}>
                    <option value="">Não indica {u.one.toLowerCase()}</option>
                    {parts.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.name}</option>)}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          {rest.length > 0 && <button className="btn quiet sm" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Só as ligadas' : `Ver também as que não indicam ${u.one.toLowerCase()} (${rest.length})`}</button>}
          {!data.canEdit && <p className="faint ach__hint">Quem tem o jogo na Jornada pode corrigir.</p>}
        </>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
      {err && <p className="form-error" role="alert">{err}</p>}
    </section>
  );
}
