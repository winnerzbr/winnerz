/**
 * Álbum da Galera: o volume na estante, o livro com a sua figurinha embaixo e a ficha de cada figurinha (frente e
 * verso, perfil e denúncia). Não conta para completar a Temporada.
 */
import { useEffect, useState } from 'react';
import { Link, navigate } from '../../lib/router';
import { useStore } from '../../data/store';
import { Sheet } from '../Sheet';
import { GaleraCard } from './GaleraCard';
import { GaleraBook, GALERA_BOOK, galeraSlots } from './GaleraBook';
import { coverHTML } from '../album/render';
import { galeraApi, galeraStatus, type GaleraCard as Card, type GaleraCollection, type GaleraMine } from '../../data/galeraApi';

/** Álbum → Galera: o livro da comunidade, com a sua figurinha embaixo. */
export function GaleraAlbum({ vol }: { vol: number }) {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [col, setCol] = useState<GaleraCollection | null>(null);
  const [me, setMe] = useState<GaleraMine | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    galeraApi.collection().then((c) => { if (alive) setCol(c); }).catch((e) => { if (alive) setErr(e instanceof Error ? e.message : 'Não consegui abrir a Galera agora.'); });
    galeraApi.me().then((m) => { if (alive) setMe(m); }).catch(() => {});
    return () => { alive = false; };
  }, [mode, profile?.id]);
  if (err) return <p className="awards__error" role="alert">{err}</p>;
  if (!col) return <p className="faint">Abrindo a Galera…</p>;
  return (
    <>
      <GaleraBook col={col} vol={vol} onChange={setCol} onBack={() => navigate('/album')} />
      <MineStrip me={me} />
    </>
  );
}

/** Na estante: o volume da Galera, ao lado dos da Temporada. */
export function GaleraVolume({ vol }: { vol: number }) {
  const mode = useStore((s) => s.mode);
  const profile = useStore((s) => s.profile);
  const [col, setCol] = useState<GaleraCollection | null>(null);
  useEffect(() => { let alive = true; galeraApi.collection().then((c) => { if (alive) setCol(c); }).catch(() => {}); return () => { alive = false; }; }, [mode, profile?.id]);
  const total = col ? galeraSlots(col).length : 0;
  const have = col ? col.cards.filter((c) => c.pasted || c.retired).length : 0;
  const tray = col ? col.cards.filter((c) => !c.retired && !c.pasted).length : 0;
  const open = () => navigate('/album/galera');
  return (
    <div className="alb-vol">
      <div className="alb-vol__book">
        <button className="alb-vol__open" aria-label="Abrir o Álbum da Galera" onClick={open} dangerouslySetInnerHTML={{ __html: coverHTML(GALERA_BOOK, vol) }} />
      </div>
      <div className="alb-vol__meta"><span className="alb-bar"><i style={{ width: `${total ? Math.round((have / total) * 100) : 0}%` }} /></span>{have}/{total}</div>
      <button className="btn ghost sm" onClick={open}>{tray ? `Abrir · ${tray} para colar` : 'Abrir'}</button>
      <span className="alb-kick">Álbum da comunidade</span>
    </div>
  );
}

function MineStrip({ me }: { me: GaleraMine | null }) {
  if (!me) return null;
  const st = galeraStatus(me);
  const live = me.card?.live ?? me.card?.pending;
  const text = st === 'ativa' ? 'Sua figurinha está na Galera e pode sair nos pacotes de outras pessoas.'
    : st === 'pausada' ? 'Sua figurinha está pausada: não sai em pacotes novos.'
    : st === 'analise' ? 'Sua figurinha está em análise. Assim que for aprovada, ela entra na Galera.'
    : st === 'recusada' ? 'Sua figurinha não foi aprovada. Dá para ajustar e enviar de novo.'
    : `Você também pode ter a sua figurinha: o seu número de chegada é o nº ${String(me.number ?? 0).padStart(3, '0')}${me.fundador ? ', de Fundador' : ''}.`;
  return (
    <div className="glr-mine">
      {live && <div className="glr-mine__card"><GaleraCard card={live} still /></div>}
      <div className="glr-mine__text"><b>{st === 'fora' ? 'Entre para a Galera' : 'Sua figurinha'}</b><span className="muted">{text}</span></div>
      <Link className={st === 'fora' ? 'btn now' : 'btn ghost'} to="/preferencias#figurinha">{st === 'fora' ? 'Fazer a minha' : 'Ver e editar'}</Link>
    </div>
  );
}

/** Ficha de uma figurinha da Galera: vira para ver o verso, leva ao perfil e permite denunciar. */
export function GaleraSheet({ card, onClose }: { card: Card; onClose: () => void }) {
  const [flip, setFlip] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const report = async (reason: 'imagem' | 'frase' | 'outro') => {
    if (!card.owner) return;
    setErr('');
    try { await galeraApi.report(card.owner, reason); setMsg('Obrigado. A figurinha saiu dos pacotes até a administração olhar.'); setReporting(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para denunciar agora.'); }
  };
  return (
    <Sheet title={`@${card.handle}`} onClose={onClose} labelId="glr-sheet-t" wide>
      <div className="glr-sheet">
        <button type="button" className="glr-sheet__card" onClick={() => setFlip((f) => !f)} aria-label={flip ? 'Ver a frente' : 'Ver o verso'} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <div className={`glr-flip${flip ? ' is-flipped' : ''}`}>
            <GaleraCard card={card} />
            <GaleraCard card={card} back still />
          </div>
        </button>
        <div className="glr-sheet__side">
          <p className="muted" style={{ margin: 0 }}>Nº {String(card.number ?? 0).padStart(3, '0')}{card.fundador ? ' · Fundador' : ''}{card.drawnAt ? ` · tirada em ${new Date(card.drawnAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}` : ''}</p>
          {card.game && <p style={{ margin: 0 }}>Jogo marcante: <b>{card.game}</b></p>}
          <Link className="btn now" to={`/@${card.handle}`} onClick={onClose}>Ver o perfil</Link>
          <button className="btn quiet" onClick={() => setFlip((f) => !f)}>{flip ? 'Ver a frente' : 'Ver o verso'}</button>
          <p className="faint" style={{ margin: 0, fontSize: 13 }}>Os acenos chegam na próxima fase da Galera.</p>
          {msg ? <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p> : reporting ? (
            <div className="glr-report">
              <b>O que há de errado?</b>
              <div className="chips">
                <button className="chip" onClick={() => void report('imagem')}>Imagem imprópria</button>
                <button className="chip" onClick={() => void report('frase')}>Frase imprópria</button>
                <button className="chip" onClick={() => void report('outro')}>Outro problema</button>
              </div>
              <button className="btn quiet sm" onClick={() => setReporting(false)}>Cancelar</button>
            </div>
          ) : <button className="btn quiet sm" onClick={() => setReporting(true)}>Denunciar esta figurinha</button>}
          {err && <p className="awards__error" role="alert">{err}</p>}
        </div>
      </div>
    </Sheet>
  );
}
