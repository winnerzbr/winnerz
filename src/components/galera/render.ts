/**
 * O desenho da figurinha da Galera em HTML puro: usado pelo componente React e pelo livro do Álbum da Galera (que
 * monta as páginas em HTML para a virada de página). Uma fonte só para os dois.
 */
import { portraitSrc, type GaleraCard } from '../../data/galeraApi';
import { esc } from '../album/render';

const LOGO = 'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z';
const DEFAULT_AVATAR = '/brand/iamiguinho/icone-256.webp';
export const n3 = (n: number | null | undefined) => String(n ?? 0).padStart(3, '0');
const logo = (fill: string) => `<svg viewBox="0 0 506 280" aria-hidden="true"><path fill="${fill}" d="${LOGO}"/></svg>`;

const deco = (c: string) => `<svg class="glr__orn" viewBox="0 0 100 140" aria-hidden="true"><g fill="none" stroke="${c}"><path d="M9 5H91V9H95V131H91V135H9V131H5V9H9Z" stroke-width=".45"/><path d="M11 7.4H89V11H92.6V129H89V132.6H11V129H7.4V11H11Z" stroke-width=".2"/><path d="M5 20H9M5 22H8M5 24H7M95 20H91M95 22H92M95 24H93M5 120H9M5 118H8M5 116H7M95 120H91M95 118H92M95 116H93" stroke-width=".3"/></g></svg>`;
const CORNER = '<path d="M0 22V6.5Q0 0 6.5 0H22" fill="none" stroke-width=".7"/><path d="M2.4 17.5V8Q2.4 2.4 8 2.4H17.5" fill="none" stroke-width=".3"/><path d="M5 5C9.4 2.1 13.6 3.9 12.7 7.4C11.9 10.3 7.9 9.5 8.7 7.1" fill="none" stroke-width=".42"/><path d="M5 5C2.1 9.4 3.9 13.6 7.4 12.7C10.3 11.9 9.5 7.9 7.1 8.7" fill="none" stroke-width=".42"/><circle cx="4.5" cy="4.5" r="1.05" stroke="none"/><path d="M21.6 -1L25 0L21.6 1ZM-1 21.6L0 25L1 21.6Z" stroke="none"/>';
let gid = 0;
const filigree = () => {
  const id = `glr-au-${++gid}`, g = `url(#${id})`;
  return `<svg class="glr__orn" viewBox="0 0 100 140" aria-hidden="true"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="12" y2="22" spreadMethod="reflect"><stop offset="0" stop-color="#FFF4D2"/><stop offset=".35" stop-color="#E6BF72"/><stop offset=".6" stop-color="#A9783A"/><stop offset=".85" stop-color="#F3D899"/><stop offset="1" stop-color="#FFF0C8"/></linearGradient></defs><g fill="${g}" stroke="${g}"><g transform="translate(4.6 4.6) scale(.75 .75)">${CORNER}</g><g transform="translate(95.4 4.6) scale(-.75 .75)">${CORNER}</g><g transform="translate(4.6 135.4) scale(.75 -.75)">${CORNER}</g><g transform="translate(95.4 135.4) scale(-.75 -.75)">${CORNER}</g><path d="M21.1 4.6H78.9M21.1 135.4H78.9M4.6 21.1V118.9M95.4 21.1V118.9" fill="none" stroke-width=".5"/><path d="M17.7 6.4H82.3M17.7 133.6H82.3M6.4 17.7V122.3M93.6 17.7V122.3" fill="none" stroke-width=".18"/><path d="M4.6 66L6.1 70L4.6 74L3.1 70ZM95.4 66L96.9 70L95.4 74L93.9 70ZM46 135.4L50 133.9L54 135.4L50 136.9Z" stroke="none"/></g></svg>`;
};

/** O miolo da figurinha (dentro de um elemento .glr). */
export function galeraHTML(card: GaleraCard, back = false): string {
  if (card.retired) return ghostHTML('gone', card.number);
  const fund = card.fundador;
  const metal = fund ? '#ebc883' : '#eaa57c';
  const handle = card.handle ? `@${card.handle}` : '';
  const at = `glr__at glr__mt${handle.length > 15 ? ' glr__at--long' : ''}`;
  const rule = '<span class="glr__rule"><i></i><b></b><i></i></span>';
  const inner = back
    ? `<div class="glr__bk"><div class="glr__bk-logo">${logo(metal)}</div><div class="glr__bk-kick">Figurinha da Galera</div><div class="glr__seal"><small>${fund ? 'Fundador' : 'Jogador'}</small><b class="glr__mt">${n3(card.number)}</b></div><div class="${at}">${esc(handle)}</div>${card.name ? `<div class="glr__name">${esc(card.name)}</div>` : ''}${rule}${card.game ? `<div class="glr__bk-row up">Jogo marcante · ${esc(card.game)}</div>` : ''}${card.handle ? `<div class="glr__bk-row">winnerz.com.br/@${esc(card.handle)}</div>` : ''}<div class="glr__bk-foot">Tirou esta figurinha? Mande um aceno.</div></div>`
    : `<img class="glr__scene" src="/galera/${esc(card.scene)}.webp" alt="" loading="lazy" decoding="async" draggable="false"><span class="glr__dim"></span><span class="glr__rays"></span><span class="glr__pp"></span><div class="glr__av"><img src="${esc(portraitSrc(card.portrait) ?? DEFAULT_AVATAR)}" alt="" loading="lazy" decoding="async" draggable="false"></div><div class="glr__logo">${logo(metal)}</div><div class="glr__num glr__mt">Nº ${n3(card.number)}</div><div class="glr__plate">${card.phrase ? `<span class="glr__quote">“${esc(card.phrase)}”</span>` : ''}<span class="${at}">${esc(handle)}</span>${rule}${card.name ? `<span class="glr__name">${esc(card.name)}</span>` : ''}${card.game ? `<span class="glr__game">Jogo marcante · ${esc(card.game)}</span>` : ''}</div>`;
  return `<div class="glr__card${fund ? ' is-fund' : ''}${back ? ' is-back' : ''}"><span class="glr__frame"></span><div class="glr__art">${inner}<span class="glr__sheen"></span></div>${fund ? filigree() : deco(metal)}${fund && !back ? '<span class="glr__rib">Fundador</span>' : ''}</div>`;
}

/** Espaço sem figurinha: alguém que você ainda não tirou, ou a cópia de quem saiu (aposentada). */
export function ghostHTML(kind: 'gone' | 'unknown', number?: number | null): string {
  return `<div class="glr__card ${kind === 'gone' ? 'is-gone' : 'is-unknown'}"><span class="glr__frame"></span><div class="glr__art"><div class="glr__ghost"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="36" r="18" fill="currentColor"/><path d="M14 96C16 72 32 62 50 62C68 62 84 72 86 96Z" fill="currentColor"/></svg>${kind === 'gone' ? `<b>Nº ${n3(number)}</b><span>Aposentada</span>` : '<span>Ainda não tirada</span>'}</div></div></div>`;
}

export const galeraLabel = (card: GaleraCard, back = false) =>
  card.retired ? `Figurinha aposentada, nº ${n3(card.number)}` : `Figurinha da Galera de ${card.handle ? `@${card.handle}` : 'uma pessoa'}, nº ${n3(card.number)}${card.fundador ? ', Fundador' : ''}${back ? ', verso' : ''}`;
