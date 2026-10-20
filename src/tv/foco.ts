/**
 * Navegação pelo controle: acha o próximo item na direção apertada pela posição na tela (como num console), em
 * qualquer página do site. Com uma folha ou janela aberta, só os itens dela contam.
 */
export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

const SEL = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"]), [data-tv]';

function visivel(el: HTMLElement): boolean {
  if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
  const ck = (el as HTMLElement & { checkVisibility?: (o?: object) => boolean }).checkVisibility;
  return ck ? ck.call(el, { checkOpacity: true, checkVisibilityCSS: true }) : true;
}

/** A área que vale agora: a janela aberta mais de cima (folha, diálogo) ou a página toda. */
export function escopo(): HTMLElement {
  const d = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"], .sheet')].filter(visivel);
  return d[d.length - 1] ?? document.body;
}

export function itens(raiz: HTMLElement = escopo()): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(SEL)].filter((el) => !el.closest('[data-tv-fora]') && visivel(el));
}

/**
 * O melhor candidato na direção: o mais perto no eixo da direção, com peso dobrado para quem está desalinhado.
 * Itens que se sobrepõem no outro eixo (mesma linha, mesma coluna) ganham preferência.
 */
export function proximo(atual: HTMLElement | null, dir: Direcao, lista = itens()): HTMLElement | null {
  if (!lista.length) return null;
  if (!atual || !lista.includes(atual)) {
    // Sem foco: o primeiro item visível na tela, de cima para baixo.
    const vh = innerHeight;
    return lista.find((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh; }) ?? lista[0];
  }
  const a = atual.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let melhor: HTMLElement | null = null, nota = Infinity;
  for (const el of lista) {
    if (el === atual || atual.contains(el) || el.contains(atual)) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    let principal: number, lado: number, sobre: number;
    if (dir === 'direita') { if (b.left < a.right - Math.min(a.width, b.width) * 0.4 || bx <= ax) continue; principal = Math.max(0, b.left - a.right); sobre = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); lado = Math.abs(by - ay); }
    else if (dir === 'esquerda') { if (b.right > a.left + Math.min(a.width, b.width) * 0.4 || bx >= ax) continue; principal = Math.max(0, a.left - b.right); sobre = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); lado = Math.abs(by - ay); }
    else if (dir === 'baixo') { if (b.top < a.bottom - Math.min(a.height, b.height) * 0.4 || by <= ay) continue; principal = Math.max(0, b.top - a.bottom); sobre = Math.min(a.right, b.right) - Math.max(a.left, b.left); lado = Math.abs(bx - ax); }
    else { if (b.bottom > a.top + Math.min(a.height, b.height) * 0.4 || by >= ay) continue; principal = Math.max(0, a.top - b.bottom); sobre = Math.min(a.right, b.right) - Math.max(a.left, b.left); lado = Math.abs(bx - ax); }
    const n = principal + (sobre > 0 ? lado * 0.3 : lado * 2 + 400);
    if (n < nota) { nota = n; melhor = el; }
  }
  return melhor;
}

/** Põe o foco no item, rola até ele e marca para a linha do horizonte seguir. */
export function focar(el: HTMLElement) {
  document.querySelectorAll('.tv-foco').forEach((x) => x.classList.remove('tv-foco'));
  el.classList.add('tv-foco');
  try { el.focus({ preventScroll: true }); } catch { el.focus(); }
  const r = el.getBoundingClientRect();
  const margem = innerHeight * 0.18;
  if (r.top < margem || r.bottom > innerHeight - margem) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  else if (r.left < 0 || r.right > innerWidth) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

export const focado = (): HTMLElement | null => {
  const a = document.activeElement as HTMLElement | null;
  return a && a !== document.body ? a : document.querySelector<HTMLElement>('.tv-foco');
};
