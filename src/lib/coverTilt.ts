/**
 * Capas em grade inclinam seguindo o mouse (Explorar, Buscar, Coleção, perfil público, listas).
 * Um ouvinte só, no documento: acha a capa debaixo do mouse e passa a inclinação e o ponto de luz
 * por variáveis de CSS. No toque e com animações reduzidas, não faz nada.
 */
const SEL = '.cover-grid__cover, .ctile__cover, .pp-grid__cover, .glist__cover';
const MAX_X = 10; // graus para cima/baixo
const MAX_Y = 14; // graus para os lados

function reduced(): boolean {
  const m = document.documentElement.dataset.motion;
  return m === 'reduzidas' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function installCoverTilt(): () => void {
  if (typeof document === 'undefined') return () => {};
  let cur: HTMLElement | null = null;
  let raf = 0;
  let last: { x: number; y: number } | null = null;

  const reset = (el: HTMLElement) => {
    el.classList.remove('is-ctilt');
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    el.style.removeProperty('--gx'); el.style.removeProperty('--gy');
  };
  const paint = () => {
    raf = 0;
    if (!cur || !last) return;
    const r = cur.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.max(0, Math.min(1, (last.x - r.left) / r.width));
    const py = Math.max(0, Math.min(1, (last.y - r.top) / r.height));
    cur.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX_X).toFixed(2)}deg`);
    cur.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_Y).toFixed(2)}deg`);
    cur.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    cur.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = (e.target as Element | null)?.closest?.(SEL) as HTMLElement | null;
    if (el !== cur) {
      if (cur) reset(cur);
      cur = el;
      if (cur && !reduced()) cur.classList.add('is-ctilt'); else cur = null;
    }
    if (!cur) return;
    last = { x: e.clientX, y: e.clientY };
    if (!raf) raf = requestAnimationFrame(paint);
  };
  const leave = (e: PointerEvent) => {
    if (!cur) return;
    const to = e.relatedTarget as Node | null;
    if (to && cur.contains(to)) return;
    reset(cur); cur = null;
  };
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerout', leave, { passive: true });
  return () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerout', leave);
    if (raf) cancelAnimationFrame(raf);
    if (cur) reset(cur);
  };
}
