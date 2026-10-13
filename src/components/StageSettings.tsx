import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import type { Game } from '../data/types';
import type { ProfileStage } from '../data/profileApi';
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
});

/** O Palco do perfil: o jogo que te definiu, os três da vida e desde quando você joga. */
export function StageSettings({ stage, onChange }: { stage: ProfileStage; onChange: (s: ProfileStage) => void }) {
  const list = useMyGameList();
  const top = [0, 1, 2].map((i) => stage.top?.[i] ?? { game: '' });
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
      <div className="pfs__field">
        <span>Os três da vida</span>
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
