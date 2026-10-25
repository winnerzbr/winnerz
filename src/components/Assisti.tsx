/**
 * Etapa 8 da revisão: "Assisti". Para o jogo que você acompanhou numa live ou num vídeo, sem jogar.
 * Fica como lembrança (na ficha e nas Concluídas), sem contar como zerado. Precisa da migração 0096.
 */
import { useState } from 'react';
import { actions, useStore, myGame, hasV96 } from '../data/store';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const assistiLabel = (iso?: string) => (iso ? `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '');

export function AssistiField({ gameId }: { gameId: string }) {
  const s = useStore((x) => x);
  const m = myGame(s, gameId);
  const [edit, setEdit] = useState(false);
  const hoje = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(m.watchedAt?.slice(0, 7) ?? hoje);
  const [onde, setOnde] = useState(m.watchedWhere ?? '');
  if (!hasV96(s)) return null;
  const salvar = () => { actions.setMyGame(gameId, { watchedAt: `${mes || hoje}-01`, watchedWhere: onde.trim().slice(0, 120) || undefined }); setEdit(false); };
  const tirar = () => { actions.setMyGame(gameId, { watchedAt: undefined, watchedWhere: undefined }); setEdit(false); };
  if (edit) return (
    <form className="assisti" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
      <span className="muted">Assisti, sem jogar</span>
      <label>Quando<input className="field" type="month" value={mes} max={hoje} onChange={(e) => setMes(e.target.value)} /></label>
      <label>Onde<input className="field" value={onde} onChange={(e) => setOnde(e.target.value)} maxLength={120} placeholder="Ex.: nas lives do canal, num vídeo longo" /></label>
      <div className="assisti__acts">
        <button className="btn primary sm" type="submit">Guardar</button>
        {m.watchedAt && <button className="btn quiet sm" type="button" onClick={tirar}>Tirar</button>}
        <button className="btn quiet sm" type="button" onClick={() => setEdit(false)}>Cancelar</button>
      </div>
    </form>
  );
  return m.watchedAt ? (
    <div className="kv"><span className="muted">Assisti</span><button type="button" className="kv__v linklike assisti__v" onClick={() => setEdit(true)}>{[assistiLabel(m.watchedAt), m.watchedWhere].filter(Boolean).join(' · ')}</button></div>
  ) : (
    <button type="button" className="btn quiet sm assisti__btn" onClick={() => setEdit(true)} title="Acompanhou numa live ou num vídeo, sem jogar">Assisti, sem jogar</button>
  );
}
