/**
 * Pactos entre amigos (J6): a lista (em "Meu ritmo" e na página do jogo) e a folha para fazer um pacto.
 * Sem sequência e sem cobrança: mostra onde cada um está naquele jogo, e só isso.
 */
import { useEffect, useState } from 'react';
import { pactApi, usePacts, type Pact } from '../data/pactApi';
import { socialApi, type Person } from '../data/socialApi';
import { Link } from '../lib/router';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { CoverArt } from './CoverArt';
import { dayMonth } from '../lib/format';
import { awayLabel } from '../lib/recap';
import type { Game } from '../data/types';

const goalText = (p: Pact) => (p.goal === 'zerar' ? `Zerar ${p.game.title}` : `Jogar ${p.game.title} junto`) + (p.until ? ` até ${dayMonth(p.until + 'T12:00:00')}` : '');
const ago = (iso?: string | null) => (iso ? awayLabel(Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000))) : null);

export function PactList({ gameId, game, title = 'Pactos' }: { gameId?: string; game?: Game; title?: string }) {
  const all = usePacts();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');
  if (all === null) return null; // sem a migração 0041
  const list = (all ?? []).filter((p) => !gameId || p.game.id === gameId);
  if (!list.length && !game) return (
    <section id="pactos" className="card pacts pacts--empty" aria-labelledby="pactos-h">
      <h2 id="pactos-h" className="kicker">{title}</h2>
      <p className="muted">Combine um jogo com amigos: zerar até uma data, ou só jogar junto. Cada um vê onde o outro está, sem contar dias seguidos. Comece pela página do jogo.</p>
    </section>
  );
  return (
    <section id="pactos" className="card pacts" aria-labelledby="pactos-h">
      <div className="pacts__head">
        <h2 id="pactos-h" className="kicker">{title}</h2>
        {game && <button className="btn quiet sm" onClick={() => setOpen(true)}><Icon name="pessoas" size={14} />Fazer um pacto</button>}
      </div>
      {!list.length && game && <p className="muted">Chame amigos para {game.title}: zerar até uma data, ou só jogar junto. Sem contar dias seguidos.</p>}
      <ul className="pacts__list">
        {list.map((p) => (
          <li key={p.id} className={`pact${p.me === 'convidado' ? ' is-invite' : ''}`}>
            {!gameId && <Link to={`/jornada/${p.game.slug}`} className="pact__cover" aria-label={p.game.title}><CoverArt game={{ title: p.game.title, cover: p.game.cover ?? '' }} /></Link>}
            <div className="pact__body">
              <b className="pact__goal">{goalText(p)}</b>
              {p.note && <span className="pact__note">“{p.note}”</span>}
              <ul className="pact__people">
                {p.people.map((x, i) => (
                  <li key={`${x.handle}-${i}`} className={x.doneAt ? 'is-done' : undefined}>
                    <span className="pact__who">{x.me ? 'Você' : `@${x.handle}`}</span>
                    {x.status === 'convidado' ? <span className="faint">convidado</span> : (
                      <>
                        <span className="pact__bar" aria-hidden="true"><i style={{ width: `${x.doneAt ? 100 : x.progress ?? 0}%` }} /></span>
                        <span className="pact__st">{x.doneAt ? `Zerou em ${dayMonth(x.doneAt)}` : [x.progress != null ? `${x.progress}%` : null, x.lastAt ? `última vez ${ago(x.lastAt)}` : 'ainda sem sessão'].filter(Boolean).join(' · ')}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {p.endedAt && <span className="faint">Pacto encerrado.</span>}
            </div>
            <div className="pact__actions">
              {p.me === 'convidado' ? (
                <>
                  <button className="btn primary sm" onClick={() => pactApi.respond(p.id, true).catch((e) => setErr(e.message))}>Entrar no pacto</button>
                  <button className="btn quiet sm" onClick={() => pactApi.respond(p.id, false).catch((e) => setErr(e.message))}>Agora não</button>
                </>
              ) : !p.endedAt && <button className="btn quiet sm" onClick={() => pactApi.leave(p.id).catch((e) => setErr(e.message))}>Sair</button>}
            </div>
          </li>
        ))}
      </ul>
      {err && <p className="form-error" role="alert">{err}</p>}
      {open && game && <PactSheet game={game} onClose={() => setOpen(false)} />}
    </section>
  );
}

export function PactSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [friends, setFriends] = useState<Person[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [goal, setGoal] = useState<'zerar' | 'jogar'>('zerar');
  const [until, setUntil] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    socialApi.people().then((p) => {
      const all = [...p.following, ...p.followers].filter((x) => x.mutual && x.handle);
      setFriends([...new Map(all.map((x) => [x.handle, x])).values()]);
    }).catch(() => setFriends([]));
  }, []);
  const toggle = (h: string) => setPick(pick.includes(h) ? pick.filter((x) => x !== h) : pick.length < 7 ? [...pick, h] : pick);
  const save = async () => {
    setBusy(true); setErr('');
    try { await pactApi.create({ gameId: game.id, goal, until: until || null, note: note.trim() || undefined, handles: pick }); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu.'); setBusy(false); }
  };
  return (
    <Sheet title={`Pacto: ${game.title}`} onClose={onClose}>
      <p className="muted">Um combinado leve com amigos. Cada um vê o % e a última sessão dos outros neste jogo. Nada de contar dias seguidos.</p>
      <div className="finish__label">O combinado</div>
      <div className="chips" role="group" aria-label="O combinado">
        <button type="button" className="chip" aria-pressed={goal === 'zerar'} onClick={() => setGoal('zerar')}>Zerar</button>
        <button type="button" className="chip" aria-pressed={goal === 'jogar'} onClick={() => setGoal('jogar')}>Jogar junto, sem meta</button>
      </div>
      <label htmlFor="pact-until" className="finish__label">Até quando? <span className="faint">(opcional)</span></label>
      <input id="pact-until" className="field field--short" type="date" value={until} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setUntil(e.target.value)} />
      <label htmlFor="pact-note" className="finish__label">Um recado <span className="faint">(opcional)</span></label>
      <input id="pact-note" className="field" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: uma sessão por semana, sem pressa" />
      <div className="finish__label">Com quem <span className="faint">(amigos: quem se segue de volta)</span></div>
      {friends === null ? <p className="muted">Carregando…</p> : friends.length === 0 ? <p className="muted">Você ainda não tem amigos no WinnerZ. Quando vocês se seguirem de volta, dá para fazer pactos.</p> : (
        <div className="chips" role="group" aria-label="Amigos">
          {friends.map((f) => <button type="button" key={f.handle!} className="chip" aria-pressed={pick.includes(f.handle!)} onClick={() => toggle(f.handle!)}>@{f.handle}</button>)}
        </div>
      )}
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="sheet__actions">
        <button className="btn quiet" onClick={onClose}>Cancelar</button>
        <button className="btn primary" disabled={busy || !pick.length} onClick={save}>{busy ? 'Enviando…' : 'Convidar'}</button>
      </div>
    </Sheet>
  );
}
