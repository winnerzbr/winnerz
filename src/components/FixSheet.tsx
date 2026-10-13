import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store';
import type { Game } from '../data/types';
import { canReview, fixesApi, type MyReport } from '../data/fixesApi';
import { FIX_FIELDS, checkFix, fixLabel, shownValue, showProposed, type FixField } from '../lib/fixes';
import { PLATFORM_NAMES, shortPlatform } from '../lib/platforms';
import { Sheet } from './Sheet';
import { Link } from '../lib/router';
import { track } from '../lib/track';

export type FixDraft = string | string[];

/** Valor de partida do editor: o que a ficha mostra agora. */
export const draftOf = (g: Game, k: FixField, from?: unknown): FixDraft => {
  if (from !== undefined && from !== null) return Array.isArray(from) ? from.map(String) : String(from);
  return k === 'platforms' ? [...g.platforms] : k === 'outro' ? '' : shownValue(g, k);
};

/** O campo de edição de cada tipo de informação (também usado na revisão da administração). */
export function FixEditor({ game, field, value, onChange, id }: { game: Game; field: FixField; value: FixDraft; onChange: (v: FixDraft) => void; id: string }) {
  const [extra, setExtra] = useState('');
  if (field === 'outro') return null;
  if (field === 'platforms') {
    const list = value as string[];
    const all = [...new Set([...PLATFORM_NAMES, ...game.platforms, ...list])];
    const toggle = (p: string) => onChange(list.includes(p) ? list.filter((x) => x !== p) : [...list, p]);
    return (
      <div className="fixed__plats" role="group" aria-label="Plataformas certas">
        {all.map((p) => (
          <label key={p} className={`fixed__plat${list.includes(p) ? ' is-on' : ''}${game.platforms.includes(p) !== list.includes(p) ? ' is-changed' : ''}`}>
            <input type="checkbox" checked={list.includes(p)} onChange={() => toggle(p)} />{shortPlatform(p)}
          </label>
        ))}
        <span className="fixed__add">
          <input className="field" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Outra plataforma" aria-label="Outra plataforma"
            onKeyDown={(e) => { if (e.key === 'Enter' && extra.trim()) { e.preventDefault(); onChange([...list, extra.trim()]); setExtra(''); } }} />
          <button type="button" className="btn ghost sm" disabled={!extra.trim()} onClick={() => { onChange([...list, extra.trim()]); setExtra(''); }}>Incluir</button>
        </span>
      </div>
    );
  }
  if (field === 'summary') return <textarea id={id} className="field fixed__text" rows={7} maxLength={4000} value={value as string} onChange={(e) => onChange(e.target.value)} />;
  if (field === 'cover') {
    const v = (value as string).trim();
    return (
      <div className="fixed__cover">
        <span className="fixed__covers">
          <figure><img src={game.cover} alt="" /><figcaption className="faint">Agora</figcaption></figure>
          {v && v !== game.cover && /^https?:\/\/images\.igdb\.com\//.test(v) && <figure><img src={v.replace(/^http:/, 'https:')} alt="" /><figcaption className="faint">Sugerida</figcaption></figure>}
        </span>
        <input id={id} className="field" value={value as string} onChange={(e) => onChange(e.target.value)} placeholder="https://images.igdb.com/igdb/image/upload/t_cover_big/..." inputMode="url" />
        <small className="faint">No igdb.com, abra o jogo, toque com o botão direito na capa certa e copie o endereço da imagem.</small>
      </div>
    );
  }
  return <input id={id} className="field" value={value as string} onChange={(e) => onChange(e.target.value)} inputMode={field === 'year' ? 'numeric' : undefined} maxLength={field === 'year' ? 4 : field === 'title' ? 200 : 120} />;
}

const STATUS: Record<string, string> = { aberta: 'Esperando revisão', aceita: 'Aceita', recusada: 'Não aceita' };

/** "Algo errado nesta ficha?": escolher o que está errado, sugerir o certo e acompanhar o andamento. */
export function FixSheet({ game, onClose, initial }: { game: Game; onClose: () => void; initial?: FixField }) {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [field, setField] = useState<FixField | null>(initial ?? null);
  const [value, setValue] = useState<FixDraft>('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<'' | 'enviada' | 'aplicada'>('');
  const [mine, setMine] = useState<MyReport[]>([]);
  const signedIn = mode === 'demo' || !!profile;
  const admin = isAdmin && canReview();

  useEffect(() => { if (signedIn) fixesApi.mine(game.id).then(setMine).catch(() => null); }, [game.id, signedIn, done]);
  useEffect(() => { if (field) { setValue(draftOf(game, field)); setErr(''); } }, [field]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => new Set(mine.filter((r) => r.status === 'aberta').map((r) => r.field)), [mine]);

  const send = async (apply: boolean) => {
    if (!field) return;
    const c = checkFix(field, value, game);
    if ('error' in c) { setErr(c.error); return; }
    if (field === 'outro' && note.trim().length < 10) { setErr('Conte em poucas palavras o que está errado.'); return; }
    if (source.trim() && !/^https?:\/\//i.test(source.trim())) { setErr('A fonte precisa ser um link (https://...).'); return; }
    setBusy(true); setErr('');
    try {
      if (apply) { await fixesApi.fix(game.id, field, c.value); track('correcao.aplicada'); setDone('aplicada'); }
      else { await fixesApi.report(game.id, field, c.value, note.trim(), source.trim()); track('correcao.sugerida'); setDone('enviada'); }
      setField(null); setNote(''); setSource('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora. Tente de novo.'); }
    setBusy(false);
  };

  return (
    <Sheet title="Algo errado nesta ficha?" onClose={onClose} labelId="fix-sheet" wide>
      {!signedIn ? (
        <p className="muted">Entre na sua conta para sugerir uma correção. <Link to="/entrar">Entrar</Link></p>
      ) : (
        <div className="fixs">
          <p className="muted fixs__lead">As informações vêm do IGDB, que às vezes erra. Diga o que está errado em <b>{game.title}</b>: a equipe do WinnerZ confere e, se estiver certo, a correção vale para todo mundo.</p>
          {done && (
            <p className="fixs__done" role="status">{done === 'aplicada' ? 'Correção aplicada na ficha.' : 'Obrigado! A sua sugestão entrou na fila de revisão. O andamento aparece aqui embaixo.'}</p>
          )}
          {!field ? (
            <div className="fixs__fields" role="list">
              {FIX_FIELDS.map((f) => {
                const now = shownValue(game, f.k);
                return (
                  <button key={f.k} type="button" role="listitem" className="fixs__field" onClick={() => { setField(f.k); setDone(''); }}>
                    <b>{f.label}{game.fixes?.[f.k] ? <span className="fixs__ok">revisado</span> : null}{pending.has(f.k) ? <span className="fixs__wait">sugestão sua na fila</span> : null}</b>
                    <span className="faint">{f.k === 'cover' ? 'Trocar a imagem da capa' : f.k === 'summary' ? (now ? `${now.slice(0, 90)}${now.length > 90 ? '…' : ''}` : 'Sem sinopse') : now || (f.k === 'outro' ? f.hint : 'Não informado')}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="fixs__form">
              <div className="fixs__head"><b>{fixLabel(field)}</b><button type="button" className="btn quiet sm" onClick={() => setField(null)}>Escolher outra coisa</button></div>
              <small className="faint">{FIX_FIELDS.find((f) => f.k === field)?.hint}</small>
              {field !== 'outro' && field !== 'cover' && field !== 'platforms' && (
                <p className="fixs__now"><span className="faint">Agora:</span> {shownValue(game, field) || <i className="faint">não informado</i>}</p>
              )}
              {field !== 'outro' && <label htmlFor="fix-v" className="fixs__lab">O certo é</label>}
              <FixEditor game={game} field={field} value={value} onChange={setValue} id="fix-v" />
              <label htmlFor="fix-n" className="fixs__lab">{field === 'outro' ? 'O que está errado' : 'Uma nota para quem revisa (opcional)'}</label>
              <textarea id="fix-n" className="field" rows={field === 'outro' ? 4 : 2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder={field === 'outro' ? 'Ex.: a ficha mistura a versão original com o remake.' : 'Ex.: na capa do jogo está escrito assim.'} />
              <label htmlFor="fix-s" className="fixs__lab">Onde conferir (opcional)</label>
              <input id="fix-s" className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://..." inputMode="url" maxLength={300} />
              {err && <p className="awards__error" role="alert">{err}</p>}
              <div className="acct__row">
                <button type="button" className="btn primary" disabled={busy} onClick={() => send(false)}>{busy ? 'Enviando…' : 'Enviar sugestão'}</button>
                {admin && field !== 'outro' && <button type="button" className="btn ghost" disabled={busy} onClick={() => send(true)}>Corrigir agora (administração)</button>}
              </div>
              {mode === 'demo' && <small className="faint">Na demonstração, a sugestão fica neste navegador e aparece na fila de correções.</small>}
            </div>
          )}
          {mine.length > 0 && (
            <div className="fixs__mine">
              <span className="kicker">Suas sugestões para este jogo</span>
              <ul>
                {mine.map((r) => (
                  <li key={r.id}>
                    <span className={`fixs__st fixs__st--${r.status}`}>{STATUS[r.status]}</span>
                    <b>{fixLabel(r.field)}</b>{r.field !== 'outro' && <span className="muted"> → {showProposed(r.proposed).slice(0, 120)}</span>}
                    {r.reply && <span className="fixs__reply">Resposta da equipe: {r.reply}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {admin && <Link to="/studio/correcoes" className="fixs__studio">Abrir a fila de correções →</Link>}
        </div>
      )}
    </Sheet>
  );
}
