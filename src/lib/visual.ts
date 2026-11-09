/**
 * Visual do site. São três camadas, uma por cima da outra, e todas continuam inteiras no código:
 *
 * - 'fresta'  = o visual antigo (src/styles/fresta.css e os outros);
 * - 'impacto' = "Impacto + Ímã · cards com contorno" (src/styles/impacto.css), no ar de 09/11/2026 até a Carga;
 * - 'carga'   = "Carga": o contorno com vão em tudo (src/styles/carga.css), aprovado pelo dono em 09/11/2026.
 *
 * Como voltar:
 * - tudo para a Impacto + Ímã: VISUAL = 'impacto';   tudo para a Fresta: VISUAL = 'fresta';
 * - só algumas partes: coloque o nome da parte em IMPACTO_PARTES (fica na Impacto + Ímã) ou em FRESTA_PARTES (fica na Fresta).
 *   Ex.: IMPACTO_PARTES = ['botoes'] deixa os botões como eram antes da Carga; FRESTA_PARTES = ['nota'] volta a nota em estrelas.
 *
 * Para testar sem mexer no código (vale só no aparelho de quem abre o link, e fica guardado nele):
 * - ?visual=carga, ?visual=impacto ou ?visual=fresta troca tudo; ?visual=padrao volta ao que está aqui;
 * - ?impacto=botoes,cards usa a Impacto + Ímã só nessas partes; ?fresta=botoes usa a Fresta só nessas; vazio (?impacto=) limpa.
 */
export const PARTES = ['fundo', 'menu', 'botoes', 'abas', 'filtros', 'etiquetas', 'cards', 'capas', 'campos', 'nota', 'linha', 'avisos'] as const;
export type Parte = (typeof PARTES)[number];
export type Nivel = 'carga' | 'impacto' | 'fresta';

export const VISUAL: Nivel = 'impacto';
export const IMPACTO_PARTES: Parte[] = [];
export const FRESTA_PARTES: Parte[] = [];

const ehParte = (p: string): p is Parte => (PARTES as readonly string[]).includes(p);
const ehNivel = (v: string | null): v is Nivel => v === 'carga' || v === 'impacto' || v === 'fresta';
const lista = (s: string | null) => (s ? s.split(',').map((x) => x.trim()).filter(ehParte) : null);

/**
 * Liga no <html> as classes de cada parte: vi-<parte> para quem usa a Impacto + Ímã ou a Carga, e também vc-<parte>
 * para quem usa a Carga. Sem nenhuma das duas, a parte é a Fresta.
 */
export function aplicarVisual() {
  const root = document.documentElement;
  let visual: Nivel = VISUAL;
  let impacto: Parte[] = [...IMPACTO_PARTES];
  let fresta: Parte[] = [...FRESTA_PARTES];
  try {
    const q = new URLSearchParams(location.search);
    const v = q.get('visual');
    if (ehNivel(v)) localStorage.setItem('wz-visual', v);
    if (v === 'padrao') for (const k of ['wz-visual', 'wz-fresta', 'wz-impacto']) localStorage.removeItem(k);
    for (const k of ['fresta', 'impacto'] as const) {
      const val = q.get(k);
      if (val !== null) { if (val) localStorage.setItem(`wz-${k}`, val); else localStorage.removeItem(`wz-${k}`); }
    }
    const sv = localStorage.getItem('wz-visual');
    if (ehNivel(sv)) visual = sv;
    fresta = lista(localStorage.getItem('wz-fresta')) ?? fresta;
    impacto = lista(localStorage.getItem('wz-impacto')) ?? impacto;
  } catch { /* sem armazenamento: fica o padrão do código */ }
  root.dataset.visual = visual;
  for (const p of PARTES) {
    const nivel: Nivel = visual === 'fresta' || fresta.includes(p) ? 'fresta' : visual === 'impacto' || impacto.includes(p) ? 'impacto' : 'carga';
    root.classList.toggle(`vi-${p}`, nivel !== 'fresta');
    root.classList.toggle(`vc-${p}`, nivel === 'carga');
  }
}

/** Esta parte do site está usando a Impacto + Ímã ou a Carga agora (ou seja, não está na Fresta)? */
export const usaImpacto = (p: Parte) => typeof document !== 'undefined' && document.documentElement.classList.contains(`vi-${p}`);
