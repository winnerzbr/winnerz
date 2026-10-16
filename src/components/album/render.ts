/**
 * O desenho das figurinhas (família Coroa), dos versos e das capas Forja, como HTML. É texto e não React porque o
 * livro que vira página (St.PageFlip) é montado fora do React; as telas em React usam as mesmas funções.
 */
import type { AlbumBook, Sticker } from '../../data/albumApi';
import { artSrc } from '../../data/albumApi';
import { TIER_LABEL, TIER_STARS } from '../../lib/album';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const num3 = (n: number) => String(n).padStart(3, '0');

const LOGO_D = 'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z';
export const logoSvg = (fill: string) => `<svg viewBox="0 0 506 280" aria-hidden="true"><path fill="${fill}" d="${LOGO_D}"/></svg>`;
export const logoGold = () => `<svg viewBox="-6 -6 520 300" aria-hidden="true"><path transform="translate(3 5)" fill="#2e1e0e" d="${LOGO_D}"/><path fill="url(#alb-wzgold)" d="${LOGO_D}"/></svg>`;
export { LOGO_D };

/** Os degradês dourados que os ornamentos usam, uma vez por página. */
export function ensureDefs() {
  if (typeof document === 'undefined' || document.getElementById('alb-defs')) return;
  const d = document.createElement('div');
  d.id = 'alb-defs';
  d.setAttribute('aria-hidden', 'true');
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0"><defs>
    <linearGradient id="alb-skgold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="12" y2="22" spreadMethod="reflect"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".35" stop-color="#E6BF72"/><stop offset=".6" stop-color="#A9783A"/><stop offset=".85" stop-color="#F3D899"/><stop offset="1" stop-color="#FFF0C8"/></linearGradient>
    <linearGradient id="alb-sksilver" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="12" y2="22" spreadMethod="reflect"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".4" stop-color="#C3C9D0"/><stop offset=".65" stop-color="#7E858E"/><stop offset="1" stop-color="#EEF1F4"/></linearGradient>
    <linearGradient id="alb-cvgold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="140"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".2" stop-color="#D8AE63"/><stop offset=".45" stop-color="#FFF0C8"/><stop offset=".7" stop-color="#B98A45"/><stop offset="1" stop-color="#F3D899"/></linearGradient>
    <linearGradient id="alb-wzgold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="300"><stop offset="0" stop-color="#FFF0CC"/><stop offset=".3" stop-color="#E8C68E"/><stop offset=".55" stop-color="#BE9054"/><stop offset=".8" stop-color="#E2BE84"/><stop offset="1" stop-color="#9A6E3C"/></linearGradient>
  </defs></svg>`;
  document.body.appendChild(d);
}

const CORNER = `<path d="M0 22V6.5Q0 0 6.5 0H22" fill="none" stroke-width=".7"/><path d="M2.4 17.5V8Q2.4 2.4 8 2.4H17.5" fill="none" stroke-width=".3"/><path d="M5 5C9.4 2.1 13.6 3.9 12.7 7.4C11.9 10.3 7.9 9.5 8.7 7.1" fill="none" stroke-width=".42"/><path d="M5 5C2.1 9.4 3.9 13.6 7.4 12.7C10.3 11.9 9.5 7.9 7.1 8.7" fill="none" stroke-width=".42"/><circle cx="4.5" cy="4.5" r="1.05" stroke="none"/><path d="M21.6 -1L25 0L21.6 1ZM-1 21.6L0 25L1 21.6Z" stroke="none"/><path d="M14 4.6h4M4.6 14v4" stroke-width=".3"/>`;
const SIDE = `<path d="M0 -4.6L1.9 0L0 4.6L-1.9 0Z" stroke="none"/><path d="M0 -10V-6M0 6V10" fill="none" stroke-width=".35"/><circle cx="0" cy="-11.2" r=".6" stroke="none"/><circle cx="0" cy="11.2" r=".6" stroke="none"/>`;
const CORNER_S = `<path d="M0 13V3Q0 0 3 0H13" fill="none" stroke-width=".55"/><circle cx="3.4" cy="3.4" r=".75" stroke="none"/>`;
const CORNER_G = CORNER + `<path d="M9.5 1.2C14.5 1.2 17.6 3.4 18.2 6.6M1.2 9.5C1.2 14.5 3.4 17.6 6.6 18.2" fill="none" stroke-width=".3"/><path d="M10.6 10.6l1.3-1.3 1.3 1.3-1.3 1.3z" stroke="none"/><circle cx="18.4" cy="7.4" r=".55" stroke="none"/><circle cx="7.4" cy="18.4" r=".55" stroke="none"/>`;
const FLOUR = `<path d="M-16 0C-10 0 -6.5 -.6 -3.6 -3M16 0C10 0 6.5 -.6 3.6 -3" fill="none" stroke-width=".4"/><path d="M-9 0C-6.5 1.6 -3.5 1.8 -1.6 .4M9 0C6.5 1.6 3.5 1.8 1.6 .4" fill="none" stroke-width=".3"/><path d="M0 -5.6L2 -2.6L0 .4L-2 -2.6Z" stroke="none"/>`;

/** Cantoneiras (e losangos e arremate, quando pedidos) sobre um retângulo de 100 por 140. */
export function ornaments(o: number, sc: number, sides: boolean, g: 'gold' | 'silver' = 'gold', kind: 'simple' | 'ornate' | 'grand' = 'ornate', flour = false) {
  const C = kind === 'simple' ? CORNER_S : kind === 'grand' ? CORNER_G : CORNER;
  const id = g === 'silver' ? 'alb-sksilver' : 'alb-skgold';
  const c = (x: number, y: number, sx: number, sy: number) => `<g transform="translate(${x} ${y}) scale(${sx * sc} ${sy * sc})">${C}</g>`;
  return `<svg class="sk-orn" viewBox="0 0 100 140" aria-hidden="true"><g fill="url(#${id})" stroke="url(#${id})">${c(o, o, 1, 1)}${c(100 - o, o, -1, 1)}${c(o, 140 - o, 1, -1)}${c(100 - o, 140 - o, -1, -1)}${sides ? `<g transform="translate(${o + 0.2} 70)">${SIDE}</g><g transform="translate(${100 - o - 0.2} 70)">${SIDE}</g>` : ''}${flour ? `<g transform="translate(50 ${140 - o - 0.6})">${FLOUR}</g>` : ''}</g></svg>`;
}

/** A frente de uma figurinha Coroa (o elemento .wst; quem chama põe dentro de um .wsw). */
export function stickerHTML(s: Sticker, section = ''): string {
  const T = s.tier;
  const silver = T === 'comum';
  const orn = T === 'comum' ? ornaments(2.6, 0.85, false, 'silver', 'simple') : T === 'incomum' ? ornaments(3.1, 1, false) : T === 'rara' ? ornaments(3.1, 1.05, true) : ornaments(3.1, 1.12, true, 'gold', 'grand', true);
  const art = artSrc(s.art);
  const crest = silver ? '' : `<span class="sk-crest">${logoSvg('#e6c27a')}</span>${T === 'rara' ? '<span class="sk-gem"></span>' : ''}`;
  return `<div class="wst" data-tier="${T}"><span class="sk-frame"></span><div class="sk-art">${art ? `<img class="wst__art" src="${esc(art)}" alt="" draggable="false" loading="lazy" decoding="async">` : `<span class="wst__noart">${num3(s.number)}</span>`}${T === 'lendaria' ? '<span class="sk-halo"></span>' : ''}<span class="sk-shade"></span><span class="sk-leak"></span><span class="wst__sheen"></span><span class="wst__holo"></span><div class="wst__spark"></div></div><span class="sk-fil"></span>${crest}<div class="sk-plate">${section ? `<span class="sk-over">${esc(section)}</span>` : ''}<span class="sk-name ${silver ? 'sk-st' : 'sk-gt'}">${esc(s.name)}</span><span class="sk-rule"><i></i><b>${'✦'.repeat(TIER_STARS[T])}</b><i></i></span><span class="sk-num">Nº ${num3(s.number)} · ${TIER_LABEL[T]}</span></div>${orn}<span class="wst__glare"></span></div>`;
}

/** O verso de uma figurinha. */
export function backHTML(s: Sticker, section = ''): string {
  return `<div class="alb-back"><span class="alb-back__mark">${logoGold()}</span><b>${num3(s.number)}</b><span>${esc(s.name)}</span><small>${section ? `${esc(section)} · ` : ''}${TIER_LABEL[s.tier]} ${'✦'.repeat(TIER_STARS[s.tier])}<br>${s.credit ? esc(s.credit) : 'WinnerZ'} · Temporada ${s.season}</small>${ornaments(3.6, 0.8, false, 'gold', 'simple')}</div>`;
}

/** As costas de uma figurinha ainda virada (dentro do pacote). */
export function mysteryHTML(): string {
  return `<div class="alb-back alb-mys"><span class="alb-back__mark">${logoGold()}</span><small>WinnerZ · Temporada 1</small>${ornaments(3.1, 1, true)}</div>`;
}

const COVER_ORN = (() => {
  const ch = (i: number, sw: number, op: number) => `<path d="M${13 + i} ${4 + i}H${92 - i}L${96 - i} ${8 + i}V${132 - i}L${92 - i} ${136 - i}H${13 + i}L${9 + i} ${132 - i}V${8 + i}Z" fill="none" stroke="url(#alb-cvgold)" stroke-width="${sw}" opacity="${op}"/>`;
  const dia = (x: number, y: number) => `<path d="M${x} ${y - 1.6}L${x + 1.1} ${y}L${x} ${y + 1.6}L${x - 1.1} ${y}Z" fill="url(#alb-cvgold)"/>`;
  return `<svg class="alb-cover__orn" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">${ch(0, 0.5, 1)}${ch(1.4, 0.2, 0.75)}${dia(11, 6)}${dia(94, 6)}${dia(11, 134)}${dia(94, 134)}${dia(9, 70)}${dia(96, 70)}<path d="M9 65V75M96 65V75" stroke="url(#alb-cvgold)" stroke-width=".25"/>${dia(52.5, 4)}${dia(52.5, 136)}</svg>`;
})();

/** Capa Forja: arte de ponta a ponta, lombada de couro, filete dourado chanfrado. */
export function coverHTML(b: Pick<AlbumBook, 'title' | 'subtitle' | 'cover'>, vol: number): string {
  const img = artSrc(b.cover);
  return `<div class="alb-cover${img ? '' : ' alb-cover--blank'}">${img ? `<img class="alb-cover__img" src="${esc(img)}" alt="" draggable="false">` : ''}<span class="alb-cover__tone"></span><span class="alb-cover__spine"></span>${COVER_ORN}<div class="alb-cover__top"><span class="alb-cover__mark">${logoGold()}</span><span class="alb-cover__sub">${esc(b.subtitle || 'Temporada 1')}</span></div><div class="alb-cover__bot"><span class="alb-cover__ttl">${esc(b.title)}</span><span class="alb-cover__rule"><i></i><b>◆</b><i></i></span><span class="alb-cover__vol">Álbum WinnerZ · Vol. ${vol}</span></div><span class="alb-cover__sweep"></span></div>`;
}
