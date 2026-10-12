import { useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore, commit } from '../data/store';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { findDuplicatePairs, type DupPair } from '../lib/repair';
import { shortPlatform } from '../lib/platforms';
import { isOutdated } from '../lib/version';
import { track } from '../lib/track';

/**
 * Arrumar repetidos: o mesmo jogo da planilha ficou como "sem ficha" e "com ficha".
 * Cada par vira um jogo só, na ficha do IGDB, com as cópias, a Jornada e a nota de antes.
 */
export function RepairPage() {
  const s = useStore((x) => x);
  // Os que pedem conferência (nome mais diferente) vêm primeiro.
  const pairs = useMemo(() => findDuplicatePairs(s).sort((a, b) => Number(a.sim >= 0.9) - Number(b.sim >= 0.9)), [s]);
  type Choice = 'juntar' | 'planilha' | 'nada';
  // Nome quase igual: juntar. Mais diferente: a pessoa decide (pode ser ficha errada).
  const [choice, setChoice] = useState<Record<string, Choice>>(() => Object.fromEntries(pairs.map((p) => [p.manual.id, p.sim >= 0.8 ? 'juntar' : 'nada'])));
  const [step, setStep] = useState<'lista' | 'gravando' | 'pronto' | 'falhou' | 'velho'>('lista');
  const [done, setDone] = useState({ pairs: 0, wrong: 0, copies: 0, journeys: 0 });
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(60);
  const ch = (p: DupPair): Choice => choice[p.manual.id] ?? 'nada';
  const chosen = pairs.filter((p) => ch(p) === 'juntar');
  // "Ficha errada": fica o jogo da planilha; saem só a cópia e a Jornada repetidas que vieram com a ficha.
  const wrong = pairs.filter((p) => ch(p) === 'planilha');
  const copies = chosen.reduce((a, p) => a + p.dropCopies.length, 0) + wrong.reduce((a, p) => a + p.igdbDupCopies.length, 0);
  const journeys = [...chosen, ...wrong].filter((p) => p.dropJourney).length;
  const undecided = pairs.filter((p) => ch(p) === 'nada').length;
  const platformsOf = (gameId: string) => [...new Set(s.copies.filter((c) => c.gameId === gameId).map((c) => shortPlatform(c.platform)))].join(', ');

  const run = async () => {
    if (await isOutdated()) { setStep('velho'); return; }
    setStep('gravando'); setError('');
    try {
      const ids = [...new Set([...chosen.flatMap((p) => p.dropCopies), ...wrong.flatMap((p) => p.igdbDupCopies)])];
      if (ids.length) await commit({ type: 'copies.deleteMany', ids });
      // Na "ficha errada", só sai a Jornada que veio com a ficha; a do jogo da planilha fica.
      const js = [...chosen.map((p) => p.dropJourney), ...wrong.map((p) => { const ji = s.journeys.find((j) => j.gameId === p.igdb.id); return ji && p.dropJourney === ji.id ? ji.id : undefined; })].filter((x): x is string => !!x);
      if (js.length) await commit({ type: 'journeys.deleteMany', ids: js });
      if (chosen.length) await commit({ type: 'games.relinkMany', pairs: chosen.map((p) => ({ fromId: p.manual.id, to: p.igdb })) });
      setDone({ pairs: chosen.length, wrong: wrong.length, copies: ids.length, journeys: js.length });
      setStep('pronto');
      track('colecao.reparar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado ao gravar.');
      setStep('falhou');
    }
  };

  return (
    <main className="page pad importer">
      <SubNav pillar="colecao" />
      <h1 className="t big">Arrumar repetidos</h1>
      {step === 'pronto' ? (
        <section className="card import-done">
          <p className="t">Pronto. Cada jogo aparece uma vez.</p>
          <p className="muted">{done.pairs} jogos ligados à ficha do IGDB{done.wrong ? `, ${done.wrong} mantidos como da planilha (dá para procurar a ficha certa na página de cada um)` : ''}, {done.copies} cópias repetidas retiradas{done.journeys ? `, ${done.journeys} Jornadas repetidas retiradas` : ''}. Suas cópias, Jornadas e notas continuam.</p>
          <div className="import__actions"><Link className="btn primary lg" to="/colecao">Ver a estante</Link></div>
        </section>
      ) : step === 'falhou' || step === 'velho' ? (
        <section className="card import-done">
          <p className="t">{step === 'velho' ? 'O site foi atualizado' : 'A gravação parou no meio'}</p>
          <p className="muted">{step === 'velho' ? 'Esta página está com a versão antiga. Recarregue e abra esta tela de novo.' : `${error} Recarregue a página e abra esta tela de novo: o que já foi arrumado não volta.`}</p>
          <div className="import__actions"><button className="btn primary lg" onClick={() => location.reload()}>Recarregar a página</button></div>
        </section>
      ) : pairs.length === 0 ? (
        <div className="card tl-empty"><p className="muted">Nenhum repetido encontrado. Cada jogo aparece uma vez na estante.</p><Link className="btn ghost" to="/colecao">Ver a estante</Link></div>
      ) : (
        <section aria-labelledby="rep-h">
          <p className="muted lead">Achei {pairs.length} jogos que estão duas vezes na estante: um da planilha, sem ficha, e outro com a ficha do IGDB. Para cada par, escolha: juntar na ficha do IGDB, ou marcar “Ficha errada” quando a ficha encontrada for de outro jogo (aí fica só o da planilha, e você procura a ficha certa depois). Os que pedem conferência aparecem primeiro.</p>
          <h2 id="rep-h" className="t import__h">{chosen.length} para juntar{wrong.length ? `, ${wrong.length} com ficha errada` : ''}{undecided ? `, ${undecided} para você decidir` : ''}</h2>
          <p className="muted">Saem {copies} cópias repetidas{journeys ? ` e ${journeys} Jornadas repetidas (sem sessões)` : ''}. Nada do que você escreveu é apagado. Os pares sem decisão ficam como estão.</p>
          {undecided > 0 && <div className="import__actions"><button className="btn ghost sm" onClick={() => setChoice(Object.fromEntries(pairs.map((p) => [p.manual.id, ch(p) === 'nada' ? 'juntar' : ch(p)])))}>Juntar todos os que faltam decidir</button></div>}
          <ul className="repair-list">
            {pairs.slice(0, limit).map((p: DupPair) => (
              <li key={p.manual.id} className={`repair-row repair-row--${ch(p)}`}>
                <span className="repair-row__side">
                  <span className="repair-row__cover"><CoverArt game={p.manual} /></span>
                  <span><strong>{p.manual.title}</strong><span className="muted">Da planilha, {platformsOf(p.manual.id)}</span></span>
                </span>
                <span className="repair-row__arrow" aria-hidden="true">→</span>
                <span className="repair-row__side repair-row__side--to">
                  <span className="repair-row__cover"><CoverArt game={p.igdb} /></span>
                  <span><strong>{p.igdb.title}</strong><span className="muted">{p.exact ? 'Mesmo nome' : p.sim >= 0.9 ? 'Nome quase igual' : 'Confira se é o mesmo jogo'}{p.igdb.year ? `, ${p.igdb.year}` : ''}</span></span>
                </span>
                <label className="repair-row__choice"><span className="sr-only">O que fazer com {p.manual.title}</span>
                  <select className="field" value={ch(p)} onChange={(e) => setChoice({ ...choice, [p.manual.id]: e.target.value as Choice })}>
                    <option value="juntar">Juntar na ficha</option>
                    <option value="planilha">Ficha errada</option>
                    <option value="nada">Deixar como está</option>
                  </select>
                </label>
              </li>
            ))}
          </ul>
          {limit < pairs.length && <button className="btn ghost" onClick={() => setLimit(limit + 200)}>Mostrar mais ({pairs.length - limit})</button>}
          <div className="import__actions import__actions--sticky">
            <button className="btn primary lg" disabled={!(chosen.length + wrong.length) || step === 'gravando'} onClick={run}>{step === 'gravando' ? 'Arrumando…' : `Arrumar ${chosen.length + wrong.length} jogos`}</button>
            <Link className="btn quiet" to="/colecao">Agora não</Link>
          </div>
        </section>
      )}
    </main>
  );
}
