import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { profileApi } from '../data/profileApi';
import { renderAvatar } from '../lib/avatar';

const VIEW = 260;

/** A foto do perfil: escolher uma imagem, ajustar no círculo (arrastar e zoom) e gravar. */
export function AvatarEditor() {
  const profile = useStore((s) => s.profile);
  const current = profile?.avatar ?? null;
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const img = useRef<HTMLImageElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  const limits = (z: number) => {
    const el = img.current;
    if (!el || !el.naturalWidth) return { mx: 0, my: 0 };
    const k = (VIEW / Math.min(el.naturalWidth, el.naturalHeight)) * z;
    return { mx: Math.max(0, (el.naturalWidth * k - VIEW) / 2), my: Math.max(0, (el.naturalHeight * k - VIEW) / 2) };
  };
  const clamp = (p: { x: number; y: number }, z = zoom) => { const { mx, my } = limits(z); return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) }; };

  const pick = (f?: File) => {
    setErr('');
    if (!f) return;
    if (!/^image\//.test(f.type)) { setErr('Escolha uma imagem (JPG, PNG ou WebP).'); return; }
    if (f.size > 20 * 1024 * 1024) { setErr('Essa imagem é grande demais (mais de 20 MB).'); return; }
    setSrc(URL.createObjectURL(f)); setZoom(1); setPos({ x: 0, y: 0 });
  };
  const save = async () => {
    if (!img.current) return;
    setBusy(true); setErr('');
    try {
      const blob = await renderAvatar(img.current, VIEW, zoom, pos.x, pos.y);
      await profileApi.setAvatar(blob);
      setSrc(null);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.'); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setErr('');
    try { await profileApi.setAvatar(null); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo.'); }
    setBusy(false);
  };

  const el = img.current;
  const k = el && el.naturalWidth ? (VIEW / Math.min(el.naturalWidth, el.naturalHeight)) * zoom : 1;

  return (
    <div className="pfs__field avedit">
      <span>Foto do perfil</span>
      <div className="avedit__row">
        <span className="avedit__now" aria-hidden="true">{current ? <img src={current} alt="" /> : <b>{profile?.initial ?? '?'}</b>}</span>
        <div className="avedit__acts">
          <button type="button" className="btn ghost sm" onClick={() => file.current?.click()} disabled={busy}>{current ? 'Trocar a foto' : 'Escolher uma foto'}</button>
          {current && !src && <button type="button" className="btn quiet sm" onClick={remove} disabled={busy}>Tirar a foto</button>}
          <small className="faint">Aparece no seu perfil e no topo do site. Quadrada, ajustada no círculo.</small>
        </div>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {src && (
        <div className="avedit__crop">
          <div className="avedit__view" style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
            onPointerMove={(e) => { const d = drag.current; if (d) setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            onWheel={(e) => { const z = Math.max(1, Math.min(4, zoom - e.deltaY * 0.002)); setZoom(z); setPos((p) => clamp(p, z)); }}
            role="img" aria-label="Arraste para posicionar a foto">
            <img ref={img} src={src} alt="" draggable={false} onLoad={() => setPos({ x: 0, y: 0 })}
              style={{ transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${k})` }} />
            <span className="avedit__ring" aria-hidden="true" />
          </div>
          <label className="avedit__zoom">
            <span className="faint">Zoom</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => { const z = Number(e.target.value); setZoom(z); setPos((p) => clamp(p, z)); }} />
          </label>
          <div className="acct__row">
            <button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? 'Gravando…' : 'Usar esta foto'}</button>
            <button type="button" className="btn ghost" onClick={() => setSrc(null)} disabled={busy}>Cancelar</button>
          </div>
        </div>
      )}
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}
