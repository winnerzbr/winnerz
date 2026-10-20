/**
 * Modo TV · entrar pelo celular. Na TV (sem conta aberta): um QR e um código de 6 letras, que vencem em 10 minutos.
 * No celular (/tv/parear, com a conta aberta): confirma o código, e a TV entra sozinha.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { BrandMark } from '../components/Brand';
import { qrSvg } from '../lib/qr';
import { tvApi } from './tvApi';

const formatar = (c: string) => `${c.slice(0, 3)}-${c.slice(3)}`;

/** Na TV: o código para entrar pelo celular. */
export function TvPair() {
  const [par, setPar] = useState<{ code: string; secret: string; ate: number } | null>(null);
  const [err, setErr] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const pedir = async () => {
    setErr('');
    try { const r = await tvApi.novo(); if (vivo.current) setPar({ code: r.code, secret: r.secret, ate: Date.now() + r.expiresIn * 1000 }); }
    catch (e) { if (vivo.current) setErr(e instanceof Error ? e.message : 'Não consegui gerar o código.'); }
  };
  useEffect(() => { void pedir(); }, []);
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Pergunta a cada 2 segundos se o celular já confirmou.
  useEffect(() => {
    if (!par || entrando) return;
    const t = setInterval(async () => {
      if (Date.now() > par.ate) { clearInterval(t); return; }
      try {
        const r = await tvApi.esperar(par.code, par.secret);
        if (r.pronto && r.tokenHash) { clearInterval(t); setEntrando(true); await tvApi.entrar(r.tokenHash); }
      } catch (e) { const st = (e as { status?: number }).status; if (st === 410 || st === 404) { clearInterval(t); setPar(null); setErr(e instanceof Error ? e.message : 'O código venceu.'); } }
    }, 2000);
    return () => clearInterval(t);
  }, [par, entrando]);

  const resta = par ? Math.max(0, Math.round((par.ate - agora) / 1000)) : 0;
  const url = par ? `${location.origin}/tv/parear?c=${par.code}` : '';
  return (
    <section className="tvp">
      <BrandMark width={96} />
      <h1 className="tvp__t">Entre pelo celular</h1>
      {entrando ? <p className="tvp__p">Entrando…</p> : par && resta > 0 ? (
        <div className="tvp__grid">
          <span className="tv-qr tvp__qr" dangerouslySetInnerHTML={{ __html: qrSvg(url) }} />
          <div className="tvp__passos">
            <p>Aponte a câmera do celular para o código ao lado, já com a sua conta do WinnerZ aberta nele.</p>
            <p>Ou abra <b>{location.host}/tv/parear</b> e digite:</p>
            <p className="tvp__codigo" aria-label={`Código ${par.code.split('').join(' ')}`}>{formatar(par.code)}</p>
            <p className="muted">Vale por mais {Math.floor(resta / 60)}:{String(resta % 60).padStart(2, '0')}.</p>
          </div>
        </div>
      ) : (
        <div className="tvp__p">
          <p>{err || 'O código venceu.'}</p>
          <button className="btn primary lg" data-tv-primeiro onClick={() => void pedir()}>Gerar outro código</button>
        </div>
      )}
      {par && resta > 0 && !entrando && err && <p className="awards__error">{err}</p>}
    </section>
  );
}

/** No celular: confirmar o código que está na TV. */
export function TvApprovePage() {
  const profile = useStore((s) => s.profile);
  const mode = useStore((s) => s.mode);
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get('c') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  const [estado, setEstado] = useState<'pronto' | 'enviando' | 'feito'>('pronto');
  const [err, setErr] = useState('');
  const aprovar = async () => {
    setErr(''); setEstado('enviando');
    try { await tvApi.aprovar(code); setEstado('feito'); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); setEstado('pronto'); }
  };
  return (
    <main className="page pad narrow tvap">
      <h1 className="t big">Entrar na TV</h1>
      {mode !== 'supabase' ? <p className="muted lead">Na demonstração, o Modo TV funciona sem entrar. Abra o endereço /tv na TV.</p>
        : !profile ? (
          <>
            <p className="muted lead">Entre na sua conta neste aparelho e depois volte a este endereço para ligar a TV.</p>
            <Link className="btn primary" to="/entrar">Entrar</Link>
          </>
        ) : estado === 'feito' ? (
          <p className="lead">Pronto! A TV vai entrar com a sua conta em alguns segundos.</p>
        ) : (
          <>
            <p className="muted lead">Confirme só se o código está na <b>sua</b> TV, aí na sua frente. Quem tiver o código entra com a sua conta naquela tela.</p>
            <label className="glr-f"><span className="glr-f__l">Código da TV</span>
              <input className="field tvap__code" inputMode="text" autoCapitalize="characters" maxLength={7} value={code.length > 3 ? formatar(code) : code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC-123" />
            </label>
            <button className="btn primary lg" disabled={code.length !== 6 || estado === 'enviando'} onClick={() => void aprovar()}>{estado === 'enviando' ? 'Ligando…' : `Entrar na TV como ${profile.name}`}</button>
            {err && <p className="awards__error" role="alert">{err}</p>}
          </>
        )}
    </main>
  );
}
