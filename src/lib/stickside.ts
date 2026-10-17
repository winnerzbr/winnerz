/**
 * Colunas laterais mais altas que a tela (Ficha do jogo, Jornada): ficam presas ao rolar mostrando o fim delas,
 * em vez de acabar cedo e deixar um vazio ao lado do conteúdo. A coluna desce com a página até o fim dela aparecer
 * e então fica parada. Só no computador.
 */
const SIDES = '.game-aside, .jindex__aside';
const HEADER = 96;

function settle() {
  const wide = window.matchMedia('(min-width: 1000px)').matches;
  document.querySelectorAll<HTMLElement>(SIDES).forEach((el) => {
    if (!wide) { el.style.removeProperty('position'); el.style.removeProperty('top'); return; }
    const h = el.offsetHeight;
    const top = h + HEADER + 24 > window.innerHeight ? window.innerHeight - h - 24 : HEADER;
    el.style.position = 'sticky';
    el.style.top = `${Math.round(top)}px`;
  });
}

export function installStickySides() {
  let t = 0;
  const run = () => { cancelAnimationFrame(t); t = requestAnimationFrame(settle); };
  const mo = new MutationObserver(run);
  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', run);
  run();
  return () => { mo.disconnect(); window.removeEventListener('resize', run); cancelAnimationFrame(t); };
}
