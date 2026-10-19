import { useEffect, useRef, useState } from 'react';
import { actions, useStore, hasV8, currentHistory } from '../data/store';
import { useOutline } from '../data/outlineApi';
import { useVideos } from '../data/videoApi';
import { partAt, unitOf } from '../lib/outline';
import { PartVideoButton } from './PartVideo';
import type { Capsule, ID } from '../data/types';
import { recapFor, wantsRecap, awayLabel } from '../lib/recap';
import { shrink, toDataUrl } from '../lib/image';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { track } from '../lib/track';
import { setupNote } from '../lib/setupNote';

export const CAPSULE_FIELDS: { key: keyof Omit<Capsule, 'ai' | 'updatedAt'>; label: string; hint: string }[] = [
  { key: 'where', label: 'Onde estou', hint: 'Ex.: Capítulo 4, na entrada do castelo' },
  { key: 'doing', label: 'O que eu fazia', hint: 'Ex.: procurando as três chaves do porão' },
  { key: 'next', label: 'O que fazer depois', hint: 'Ex.: voltar ao ferreiro e melhorar a espada' },
  { key: 'remember', label: 'Não esquecer', hint: 'Ex.: o chefe é fraco a fogo; salvar antes da ponte' },
];

/**
 * "Anteriormente na sua Jornada…": aparece quando você volta depois de alguns dias (ou com a História pausada).
 * `always` mostra mesmo sem a distância (ex.: no começo da sessão, quando há algo registrado).
 */
export function Previously({ journeyId, always = false, showCapsule = true, onEditCapsule, hideNote }: { journeyId: ID; always?: boolean; showCapsule?: boolean; onEditCapsule?: () => void; hideNote?: string | null }) {
  const s = useStore((x) => x);
  const r = recapFor(s, journeyId);
  if (!r || !r.any || (!always && !wantsRecap(r))) return null;
  // Sem nada além da Cápsula (que aparece logo abaixo), não repete.
  if (!showCapsule && !r.last?.note && !r.last?.whereStopped && !r.points.length && !r.moments.some((m) => m.image)) return null;
  const cap = showCapsule ? r.capsule : undefined;
  return (
    <section className="card previously" aria-labelledby={`prev-${journeyId}`}>
      <div className="previously__head">
        <h2 id={`prev-${journeyId}`} className="t">Anteriormente na sua Jornada…</h2>
        {r.daysAway != null && <span className="muted">Último registro {awayLabel(r.daysAway)}{r.sessionsCount ? `, depois de ${r.sessionsCount} ${r.sessionsCount === 1 ? 'sessão' : 'sessões'}` : ''}.</span>}
      </div>
      {cap && (
        <dl className="previously__capsule">
          {CAPSULE_FIELDS.filter((f) => cap[f.key]).map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{cap[f.key]}</dd></div>)}
        </dl>
      )}
      {(r.last?.whereStopped || r.last?.note) && (
        <div className="previously__last">
          {r.last.whereStopped && <p><span className="muted">Você parou em</span> {r.last.whereStopped}</p>}
          {r.last.note && r.last.note !== hideNote && <p className="quote">“{r.last.note}”</p>}
        </div>
      )}
      <PreviouslyPart journeyId={journeyId} />
      {r.points.length > 0 && (
        <div className="previously__points">
          <div className="muted previously__k">Pontos para voltar</div>
          <ul>
            {r.points.slice(0, 4).map((p) => (
              <li key={p.id}>
                {p.image ? <img src={p.image} alt="" /> : <span className="previously__pin"><Icon name="pin" size={14} /></span>}
                <span><strong>{p.title || 'Ponto para voltar'}</strong>{p.text && <span className="muted"> {p.text}</span>}</span>
                <button className="btn quiet sm" onClick={() => { actions.resolveWaypoint(p.id); track('retomada.ponto-resolvido'); }}>Resolvido</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.moments.some((m) => m.image) && (
        <div className="previously__moments" aria-label="Últimos momentos">
          {r.moments.filter((m) => m.image).map((m) => <figure key={m.id}><img src={m.image} alt="" /><figcaption>{m.title}</figcaption></figure>)}
        </div>
      )}
      {onEditCapsule && <button className="btn ghost sm" onClick={onEditCapsule}>{cap ? 'Atualizar a Cápsula' : 'Montar a Cápsula de Retomada'}</button>}
    </section>
  );
}

type Ai = { enabled: boolean; used: number; limit: number } | null;
type Suggest = { suggestion: Partial<Capsule>; seen?: string; confidence?: string };

/** Folha para escrever (ou pedir à IA) a Cápsula. A sugestão da IA vem marcada como "Inferido" até você guardar. */
export function CapsuleSheet({ historyId, gameTitle, onClose }: { historyId: ID; gameTitle: string; onClose: () => void }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId);
  const r = h ? recapFor(s, h.journeyId) : null;
  const [form, setForm] = useState<Capsule>(() => ({ ...(h?.capsule ?? {}), where: h?.capsule?.where ?? r?.last?.whereStopped ?? '' }));
  const [inferred, setInferred] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState<Ai>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [seen, setSeen] = useState<Suggest | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const canSave = hasV8(s);
  const online = s.mode === 'supabase' && !!s.profile;

  useEffect(() => {
    if (!online) return;
    (async () => {
      try {
        const { accessToken } = await import('../data/supabaseAdapter');
        const t = await accessToken();
        const res = await fetch('/api/retomada', { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) setAi(await res.json());
      } catch { /* sem IA: a Cápsula funciona igual */ }
    })();
  }, [online]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  if (!h) return null;
  const set = (k: keyof Capsule, v: string) => { setForm({ ...form, [k]: v }); if (inferred.has(k)) { const n = new Set(inferred); n.delete(k); setInferred(n); } };

  const pick = async (f?: File) => {
    if (!f) return;
    try { const blob = await shrink(f, 1280); setPhoto({ blob, url: URL.createObjectURL(blob) }); setErr(''); } catch { setErr('Não consegui abrir essa imagem.'); }
  };

  const ask = async () => {
    if (!photo) return;
    setBusy(true); setErr('');
    try {
      const { accessToken } = await import('../data/supabaseAdapter');
      const t = await accessToken();
      const context = [h.capsule?.where && `Onde estava: ${h.capsule.where}`, r?.last?.whereStopped && `Parou em: ${r.last.whereStopped}`, r?.last?.note && `Recado: ${r.last.note}`].filter(Boolean).join('. ');
      const res = await fetch('/api/retomada', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ image: await toDataUrl(photo.blob), note, game: gameTitle, context }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'A IA não respondeu agora.');
      const sug = j as Suggest & { used: number; limit: number };
      const next = { ...form };
      const inf = new Set(inferred);
      for (const f of CAPSULE_FIELDS) { const v = sug.suggestion[f.key]; if (typeof v === 'string' && v) { next[f.key] = v; inf.add(f.key); } }
      setForm(next); setInferred(inf); setSeen(sug);
      setAi((a) => (a ? { ...a, used: sug.used, limit: sug.limit } : a));
      track('retomada.ia');
    } catch (e) { setErr(e instanceof Error ? e.message : 'A IA não respondeu agora.'); }
    finally { setBusy(false); }
  };

  const save = () => { actions.setCapsule(h.id, { ...form, ai: inferred.size > 0 || (!!h.capsule?.ai && !CAPSULE_FIELDS.some((f) => form[f.key] !== h.capsule?.[f.key])) }); onClose(); };

  return (
    <Sheet title="Cápsula de Retomada" onClose={onClose} labelId="cap-sheet" wide>
      <p className="muted">O que você precisa saber para voltar a {gameTitle}. Tudo opcional.</p>
      <div className="capsule-form">
        {CAPSULE_FIELDS.map((f) => (
          <label key={f.key} className="capsule-form__field">
            <span className="finish__label">{f.label}{inferred.has(f.key) && <span className="prov prov--inferido" title="Sugerido pela IA a partir da foto. Vira seu quando você guardar.">Inferido</span>}</span>
            <textarea className={`field${inferred.has(f.key) ? ' is-inferred' : ''}`} rows={2} value={form[f.key] ?? ''} placeholder={f.hint} onChange={(e) => set(f.key, e.target.value)} />
          </label>
        ))}
      </div>

      <section className="capsule-ai" aria-label="Sugerir com IA">
        <div className="capsule-ai__head"><Icon name="camera" size={18} /><strong>Sugerir com IA a partir de uma foto da tela</strong></div>
        {!online ? (
          <p className="faint">Disponível com conta (no modo demonstração não há IA).</p>
        ) : ai && !ai.enabled ? (
          <p className="faint">Ainda não ligada: falta a chave da IA no servidor.</p>
        ) : (
          <>
            <p className="faint">Tire uma foto do menu de pausa, do mapa ou do objetivo. A IA lê a tela e sugere; nada é guardado até você confirmar. A foto não fica salva.{ai ? ` ${ai.used} de ${ai.limit} sugestões usadas este mês.` : ''}</p>
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="capsule-ai__row">
              {photo ? <img className="capsule-ai__thumb" src={photo.url} alt="Foto escolhida" /> : null}
              <button type="button" className="btn ghost sm" onClick={() => file.current?.click()}>{photo ? 'Trocar foto' : 'Escolher foto'}</button>
              <input className="field" placeholder="Nota curta (opcional): ex.: acabei de passar do chefe" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              <button type="button" className="btn primary sm" disabled={!photo || busy || (!!ai && ai.used >= ai.limit)} onClick={ask}>{busy ? 'Lendo a tela…' : 'Sugerir'}</button>
            </div>
            {seen?.seen && <p className="faint capsule-ai__seen">O que a IA viu: {seen.seen}{seen.confidence === 'baixa' ? ' (pouca certeza: confira tudo).' : ''}</p>}
          </>
        )}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </section>

      {!canSave && <p className="awards__error">{setupNote('Falta rodar a migração 0008 no Supabase para guardar a Cápsula.')}</p>}
      <div className="sheet__actions">
        <button className="btn primary lg" disabled={!canSave} onClick={save}>{inferred.size ? 'Confirmar e guardar' : 'Guardar'}</button>
        <button className="btn quiet" onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>
  );
}

/** S3 · Onde você está na lista do jogo, com "▶ Ver este trecho" para lembrar como era (quando o item tem vídeo). */
function PreviouslyPart({ journeyId }: { journeyId: ID }) {
  const s = useStore((x) => x);
  const j = s.journeys.find((x) => x.id === journeyId);
  const game = j ? s.games[j.gameId] : undefined;
  const h = j ? currentHistory(s, j.id) : undefined;
  const o = useOutline(game?.id);
  const vids = useVideos(game?.id, (o?.parts.length ?? 0) > 1);
  if (!game || !h || !o || o.parts.length < 2) return null;
  const cur = partAt(o.parts, h.progress, h.part);
  if (!cur) return null;
  const u = unitOf(o);
  const n = [...o.parts].sort((a, b) => a.pct - b.pct).findIndex((p) => p.id === cur.id) + 1;
  return (
    <div className="previously__part">
      <p><span className="muted">{u.one} {n} de {o.parts.length}</span> {cur.name}</p>
      <PartVideoButton gameId={game.id} gameTitle={game.title} part={cur} label={`${u.one} ${n}`} videos={vids} />
    </div>
  );
}
