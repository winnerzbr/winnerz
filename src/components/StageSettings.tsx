import { useMemo, useRef, useState } from 'react';
import { useStore, hasV96 } from '../data/store';
import type { Game } from '../data/types';
import { coverSrc, profileApi, type ProfileStage, type StageCover } from '../data/profileApi';
import { igdbSize } from '../lib/backdrop';
import { renderCover } from '../lib/avatar';
import { CoverArt } from './CoverArt';

const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Os seus jogos (Jornada, estante, desejos e favoritos), para escolher no Palco do perfil. */
export function useMyGameList(): Game[] {
  const games = useStore((s) => s.games);
  const journeys = useStore((s) => s.journeys);
  const copies = useStore((s) => s.copies);
  const wishes = useStore((s) => s.wishes);
  const favorites = useStore((s) => s.favorites);
  return useMemo(() => {
    const ids = new Set<string>([...journeys.map((j) => j.gameId), ...copies.map((c) => c.gameId), ...wishes.map((w) => w.gameId), ...favorites]);
    return [...ids].map((id) => games[id]).filter((g): g is Game => !!g).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [games, journeys, copies, wishes, favorites]);
}

/** Escolher um jogo seu: busca pelo nome e mostra a capa do escolhido. */
export function GamePick({ value, onChange, label, list }: { value?: string; onChange: (id: string | undefined) => void; label: string; list: Game[] }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const chosen = value ? games[value] : undefined;
  const hits = useMemo(() => {
    const f = fold(q.trim());
    return (f ? list.filter((g) => fold(g.title).includes(f)) : list).slice(0, 8);
  }, [q, list]);
  if (chosen && !open) return (
    <span className="gpick gpick--on">
      <span className="gpick__cover"><CoverArt game={chosen} /></span>
      <span className="gpick__t">{chosen.title}{chosen.year ? <small> · {chosen.year}</small> : null}</span>
      <button type="button" className="btn quiet sm" onClick={() => { setOpen(true); setQ(''); }}>Trocar</button>
      <button type="button" className="btn quiet sm" onClick={() => onChange(undefined)} aria-label={`Tirar ${chosen.title}`}>Tirar</button>
    </span>
  );
  return (
    <span className="gpick">
      <input className="field" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar nos seus jogos" aria-label={label} />
      {open && (
        <span className="gpick__list" role="listbox" aria-label={label}>
          {hits.length ? hits.map((g) => (
            <button type="button" key={g.id} role="option" aria-selected={g.id === value} className="gpick__opt" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(g.id); setOpen(false); setQ(''); }}>
              <span className="gpick__mini"><CoverArt game={g} /></span>{g.title}{g.year ? <small className="faint"> · {g.year}</small> : null}
            </button>
          )) : <span className="faint gpick__none">Nenhum jogo seu com esse nome.</span>}
          {chosen && <button type="button" className="btn quiet sm" onClick={() => setOpen(false)}>Manter {chosen.title}</button>}
        </span>
      )}
    </span>
  );
}

export const stageKey = (s?: ProfileStage) => JSON.stringify({
  d: s?.defining?.game ?? '', dt: (s?.defining?.text ?? '').trim(),
  t: (s?.top ?? []).filter((x) => x.game).map((x) => [x.game, (x.quote ?? '').trim()]), y: s?.since ?? null,
  c: [s?.cover?.url ?? '', s?.cover?.path ?? '', s?.cover?.y ?? null],
});

/** O Palco do perfil: o jogo que te definiu, os três da vida e desde quando você joga. */
export function StageSettings({ stage, onChange }: { stage: ProfileStage; onChange: (s: ProfileStage) => void }) {
  const list = useMyGameList();
  // Etapa 8: com a migração 0096, quatro jogos da vida (antes, três).
  const quatro = useStore(hasV96);
  const top = (quatro ? [0, 1, 2, 3] : [0, 1, 2]).map((i) => stage.top?.[i] ?? { game: '' });
  const setTop = (i: number, v: { game: string; quote?: string }) => onChange({ ...stage, top: top.map((t, k) => (k === i ? v : t)) });
  const year = new Date().getFullYear();
  return (
    <div className="pfs__stage">
      <div className="pfs__stagehead"><b>Topo do perfil</b><small className="faint">O que aparece no alto da sua página. Tudo é opcional.</small></div>
      <div className="pfs__field">
        <span>O jogo que me definiu</span>
        <GamePick label="O jogo que me definiu" list={list} value={stage.defining?.game} onChange={(id) => onChange({ ...stage, defining: id ? { game: id, text: stage.defining?.text } : undefined })} />
        {stage.defining?.game && (
          <textarea className="field pfs__bio" rows={3} maxLength={600} value={stage.defining.text ?? ''} placeholder="Por que esse jogo? Conte do seu jeito."
            onChange={(e) => onChange({ ...stage, defining: { game: stage.defining!.game, text: e.target.value } })} aria-label="Por que esse jogo" />
        )}
        <small className="faint">A arte desse jogo vira o fundo do topo do perfil.</small>
      </div>
      <CoverPicker stage={stage} list={list} onChange={(cover) => onChange({ ...stage, cover })} />
      <div className="pfs__field">
        <span>{quatro ? 'Os quatro da vida' : 'Os três da vida'}</span>
        <ol className="pfs__top">
          {top.map((t, i) => (
            <li key={i}>
              <span className="pfs__n" aria-hidden="true">{i + 1}</span>
              <GamePick label={`${i + 1}º jogo da vida`} list={list} value={t.game || undefined} onChange={(id) => setTop(i, { game: id ?? '', quote: id ? t.quote : '' })} />
              {t.game && <input className="field" maxLength={140} value={t.quote ?? ''} placeholder="Uma frase sobre ele (opcional)" onChange={(e) => setTop(i, { ...t, quote: e.target.value })} aria-label={`Frase do ${i + 1}º jogo`} />}
            </li>
          ))}
        </ol>
      </div>
      <label className="pfs__field pfs__since">
        <span>Jogo desde</span>
        <input className="field" type="number" inputMode="numeric" min={1970} max={year} value={stage.since ?? ''} placeholder="Ex.: 1998"
          onChange={(e) => { const n = parseInt(e.target.value, 10); onChange({ ...stage, since: Number.isFinite(n) ? n : undefined }); }} />
        <small className="faint">O ano em que você começou a jogar. Abre a sua linha da vida.</small>
      </label>
    </div>
  );
}

/** As imagens de um jogo que dão um bom topo: a arte principal, as artes e as capturas, em tamanho grande. */
const gameArt = (g?: Game) => (g ? [...new Set([g.backdrop, ...(g.artworks ?? []), ...(g.screenshots ?? [])].filter((x): x is string => !!x))] : []);

/** A imagem do topo do perfil: automática (arte do jogo que te definiu), uma arte de jogo ou uma imagem sua. */
function CoverPicker({ stage, list, onChange }: { stage: ProfileStage; list: Game[]; onChange: (c: StageCover | undefined) => void }) {
  const games = useStore((s) => s.games);
  const def = stage.defining?.game ? games[stage.defining.game] : undefined;
  const cover = stage.cover;
  const mode: 'auto' | 'game' | 'upload' = cover?.url && !cover.url.startsWith('data:') ? 'game' : cover?.path || cover?.url ? 'upload' : 'auto';
  const [tab, setTab] = useState<'auto' | 'game' | 'upload'>(mode);
  const [pickedGame, setArtGame] = useState<string | undefined>(undefined);
  const artGame = pickedGame ?? stage.defining?.game;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const y = cover?.y ?? 30;
  const src = coverSrc(cover) || (def ? igdbSize(def.backdrop || def.artworks?.[0] || '', 't_1080p') : '') || null;
  const arts = gameArt(artGame ? games[artGame] : undefined);
  const send = async (f?: File) => {
    if (!f) return;
    setErr(''); setBusy(true);
    try { const blob = await renderCover(f); const c = await profileApi.uploadCover(blob); onChange({ ...c, y: 40 }); setTab('upload'); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.'); }
    setBusy(false);
  };
  return (
    <div className="pfs__field pcov">
      <span>Imagem do topo</span>
      <div className="pcov__prev" style={src ? undefined : { background: 'var(--surface)' }}>
        {src ? <img src={src} alt="" style={{ objectPosition: `50% ${y}%` }} /> : <span className="faint">Escolha o jogo que te definiu ou uma imagem para o topo.</span>}
        <span className="pcov__shade" aria-hidden="true" />
      </div>
      {src && (
        <label className="pcov__y"><span className="faint">Enquadramento</span>
          <input type="range" min={0} max={100} value={y} onChange={(e) => onChange({ ...(cover ?? {}), y: Number(e.target.value) })} aria-label="Altura do enquadramento" />
        </label>
      )}
      <div className="seg pcov__seg" role="group" aria-label="De onde vem a imagem">
        <button type="button" aria-pressed={tab === 'auto'} onClick={() => { setTab('auto'); onChange(cover?.y != null ? { y: cover.y } : undefined); }}>Automática</button>
        <button type="button" aria-pressed={tab === 'game'} onClick={() => setTab('game')}>Arte de um jogo</button>
        <button type="button" aria-pressed={tab === 'upload'} onClick={() => setTab('upload')}>Imagem sua</button>
      </div>
      {tab === 'auto' && <small className="faint">Usa a arte do jogo que te definiu{def ? ` (${def.title})` : ''}.</small>}
      {tab === 'game' && (
        <div className="pcov__game">
          <GamePick label="Jogo da imagem do topo" list={list} value={artGame} onChange={setArtGame} />
          {artGame && (arts.length ? (
            <div className="pcov__arts" role="listbox" aria-label="Imagens do jogo">
              {arts.map((u) => {
                const full = igdbSize(u, 't_1080p');
                return <button type="button" key={u} role="option" aria-selected={cover?.url === full} className="pcov__art" onClick={() => onChange({ url: full, y })}><img src={igdbSize(u, 't_screenshot_med')} alt="" loading="lazy" /></button>;
              })}
            </div>
          ) : <small className="faint">Esse jogo não tem artes na ficha. Tente outro, ou envie uma imagem sua.</small>)}
        </div>
      )}
      {tab === 'upload' && (
        <div className="pcov__up">
          <button type="button" className="btn ghost sm" onClick={() => file.current?.click()} disabled={busy}>{busy ? 'Enviando…' : mode === 'upload' ? 'Trocar a imagem' : 'Escolher uma imagem'}</button>
          <small className="faint">Uma imagem larga fica melhor (por exemplo, 1920 × 1080). Ela aparece para quem pode ver o seu perfil.</small>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      )}
      {err && <p className="awards__error" role="alert">{err}</p>}
      <small className="faint">A imagem nova vale depois de "Gravar perfil".</small>
    </div>
  );
}
