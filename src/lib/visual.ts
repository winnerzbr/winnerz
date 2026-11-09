/**
 * Visual do site.
 *
 * 'impacto' = "Impacto + Ímã · cards com contorno", aprovado pelo dono em 09/11/2026 (canvas "WinnerZ — revisão de design
 * dos elementos"). Fica numa camada por cima da Fresta (src/styles/impacto.css); a Fresta continua inteira no código.
 *
 * Como voltar:
 * - a Fresta inteira: VISUAL = 'fresta';
 * - só algumas partes da Fresta, mantendo o resto da Impacto: coloque o nome da parte em FRESTA_PARTES
 *   (ex.: ['botoes', 'nota']).
 *
 * Para testar sem mexer no código (vale só no aparelho de quem abre o link):
 * - ?visual=fresta ou ?visual=impacto troca tudo; ?visual=padrao volta ao que está aqui;
 * - ?fresta=botoes,cards usa a Fresta só nessas partes; ?fresta= (vazio) limpa.
 */
export const PARTES = ['fundo', 'menu', 'botoes', 'abas', 'filtros', 'etiquetas', 'cards', 'capas', 'campos', 'nota', 'avisos'] as const;
export type Parte = (typeof PARTES)[number];

export const VISUAL: 'impacto' | 'fresta' = 'impacto';
export const FRESTA_PARTES: Parte[] = [];

const ehParte = (p: string): p is Parte => (PARTES as readonly string[]).includes(p);

/** Liga as classes vi-<parte> no <html> para as partes que usam a Impacto. Sem nenhuma, o site é a Fresta. */
export function aplicarVisual() {
  const root = document.documentElement;
  let visual: 'impacto' | 'fresta' = VISUAL;
  let fresta: Parte[] = [...FRESTA_PARTES];
  try {
    const q = new URLSearchParams(location.search);
    const v = q.get('visual');
    if (v === 'fresta' || v === 'impacto') localStorage.setItem('wz-visual', v);
    if (v === 'padrao') { localStorage.removeItem('wz-visual'); localStorage.removeItem('wz-fresta'); }
    const f = q.get('fresta');
    if (f !== null) { if (f) localStorage.setItem('wz-fresta', f); else localStorage.removeItem('wz-fresta'); }
    const sv = localStorage.getItem('wz-visual');
    if (sv === 'fresta' || sv === 'impacto') visual = sv;
    const sf = localStorage.getItem('wz-fresta');
    if (sf) fresta = sf.split(',').map((s) => s.trim()).filter(ehParte);
  } catch { /* sem armazenamento: fica o padrão do código */ }
  root.dataset.visual = visual;
  for (const p of PARTES) root.classList.toggle(`vi-${p}`, visual === 'impacto' && !fresta.includes(p));
}

/** Esta parte do site está usando o visual Impacto agora? */
export const usaImpacto = (p: Parte) => typeof document !== 'undefined' && document.documentElement.classList.contains(`vi-${p}`);
