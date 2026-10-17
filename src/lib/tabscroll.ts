/**
 * Abas e filtros que rolam de lado no celular: ao abrir uma página, a aba ativa entra na tela; e quando a faixa chega
 * ao fim, o esmaecido da borda some (data-end). Vale para todas as faixas listadas em ROWS (o mesmo conjunto do CSS).
 */
const ROWS = ['.subnav', '.studio__tabs', '.import-tabs', '.prefs__nav', '.praca__chips', '.club-filter', '.avisos__chips', '.search__tabs', '.explore__sort',
  '.awbar__cats', '.club2-tabs__in', '.cm2-sort__chips', '.jline__filters', '.gtl__filter', '.dm__tabs', '.pd-tabs__row', '.cm-index__bar > .seg', '.jline__tools', '.cm-reply__acts', '.agenda__acts'].join(', ');
const ACTIVE = "[aria-current='page'], [aria-current='true'], [aria-selected='true'], [aria-pressed='true'], .is-on";

function mark(el: Element) {
  const r = el as HTMLElement;
  r.dataset.end = r.scrollWidth - r.clientWidth - r.scrollLeft < 4 ? '1' : '0';
}

function settle(root: ParentNode = document) {
  if (!window.matchMedia('(max-width: 640px)').matches) return;
  root.querySelectorAll(ROWS).forEach((row) => {
    const r = row as HTMLElement;
    if (r.scrollWidth <= r.clientWidth + 2) { r.dataset.end = '1'; return; }
    if (r.dataset.seen !== '1') {
      r.dataset.seen = '1';
      const on = r.querySelector(ACTIVE) as HTMLElement | null;
      if (on) {
        const left = on.offsetLeft - r.offsetLeft;
        if (left + on.offsetWidth > r.clientWidth - 24) r.scrollLeft = left - 16;
      }
    }
    mark(r);
  });
}

export function installTabScroll() {
  let t = 0;
  const run = () => { cancelAnimationFrame(t); t = requestAnimationFrame(() => settle()); };
  const mo = new MutationObserver(run);
  mo.observe(document.body, { childList: true, subtree: true });
  const onScroll = (e: Event) => { const el = e.target as Element; if (el instanceof HTMLElement && el.matches?.(ROWS)) mark(el); };
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', run);
  run();
  return () => { mo.disconnect(); document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', run); cancelAnimationFrame(t); };
}
