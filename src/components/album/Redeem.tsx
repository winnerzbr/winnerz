/**
 * E7.1 · "Tenho um código": o código dito ou mostrado na live vira pacote (abre na hora) ou figurinha (vai para a
 * bandeja). O endereço /album/pacotes?codigo=XXXX já chega com o código preenchido (é o que o drop mostra no QR).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '../../lib/router';
import { codeApi, cleanCode, type Pack, type Redeemed, type AlbumBook } from '../../data/albumApi';
import { TIER_LABEL } from '../../lib/album';
import { StickerView } from './StickerView';
import { num3 } from './render';
import { burst, GOLD, reduceMotion, sfx } from './fx';

const fromUrl = () => { try { return cleanCode(new URLSearchParams(window.location.search).get('codigo') ?? ''); } catch { return ''; } };

export function Redeem({ onPacks, bookOf, section }: { onPacks: (p: Pack[]) => void; bookOf: Record<string, AlbumBook>; section: Record<string, string> }) {
  const [code, setCode] = useState(fromUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [got, setGot] = useState<Redeemed | null>(null);
  const [done, setDone] = useState('');
  useEffect(() => { if (fromUrl()) document.getElementById('alb-code')?.focus(); }, []);

  const go = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || cleanCode(code).length < 4) return;
    setBusy(true); setErr(''); setGot(null); setDone('');
    try {
      const r = await codeApi.redeem(code);
      setCode('');
      try { const u = new URL(window.location.href); if (u.searchParams.has('codigo')) { u.searchParams.delete('codigo'); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash); } } catch { /* fica */ }
      if (r.kind === 'pacote' && r.packs.length) { sfx('coin'); setDone(r.packs.length === 1 ? 'Você ganhou um pacote. Ele está em "Para abrir".' : `Você ganhou ${r.packs.length} pacotes. Eles estão em "Para abrir".`); onPacks(r.packs); return; }
      setGot(r); sfx('inc');
      if (!reduceMotion()) setTimeout(() => { const el = document.querySelector('.alb-code__won'); const b = el?.getBoundingClientRect(); if (b) burst(b.left + b.width / 2, b.top + b.height / 3, GOLD, 40, 5); }, 120);
    } catch (x) { setErr(x instanceof Error ? x.message : 'Não deu agora. Tente de novo.'); }
    finally { setBusy(false); }
  };

  const book = got?.sticker ? bookOf[got.sticker.id] : undefined;
  return (
    <section className="alb-code" id="codigo" aria-labelledby="alb-code-t">
      <form className="alb-code__form" onSubmit={go}>
        <label id="alb-code-t" className="alb-code__label" htmlFor="alb-code">Tenho um código</label>
        <p className="muted alb-code__hint">Os códigos aparecem nas lives e nos vídeos do canal. Cada um vale uma vez por conta.</p>
        <div className="alb-code__row">
          <input id="alb-code" className="field alb-code__input" value={code} onChange={(e) => { setCode(cleanCode(e.target.value)); setErr(''); }} placeholder="WZ7KQ2M9"
            autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} aria-describedby={err ? 'alb-code-err' : undefined} disabled={busy} />
          <button className="btn now" disabled={busy || cleanCode(code).length < 4}>{busy ? 'Conferindo…' : 'Resgatar'}</button>
        </div>
        {err && <p className="form-error" id="alb-code-err" role="alert">{err}</p>}
        {done && <p className="muted" role="status">{done}</p>}
      </form>
      {got?.sticker && (
        <div className="alb-code__won" role="status">
          <div className="alb-code__card"><StickerView s={got.sticker} section={section[got.sticker.id]} /></div>
          <p><span className="alb-kick">{TIER_LABEL[got.sticker.tier]} · {num3(got.sticker.number)}</span><b>{got.sticker.name}</b><span className="muted">{got.note}. Ela foi para a bandeja do álbum.</span></p>
          {book && <Link className="btn ghost sm" to={`/album/${book.slug}`}>Colar no álbum</Link>}
        </div>
      )}
    </section>
  );
}
