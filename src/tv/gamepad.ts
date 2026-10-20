/**
 * Controle no navegador (Gamepad API, mapeamento padrão): lê os botões a cada quadro e avisa só quando um botão é
 * apertado (e repete a direção segurada, como num console). Também diz que tipo de controle é (Xbox ou PlayStation)
 * e faz vibrar, nos controles que deixam.
 */
export type Botao = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'menu' | 'view';
const MAPA: Record<number, Botao> = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 8: 'view', 9: 'menu', 12: 'cima', 13: 'baixo', 14: 'esquerda', 15: 'direita' };
const DIRECOES: Botao[] = ['cima', 'baixo', 'esquerda', 'direita'];
const ZONA = 0.55;
const PRIMEIRA = 380, SEGUINTES = 120;

type Ouvinte = (b: Botao) => void;
const ouvintes = new Set<Ouvinte>();
let rodando = false;
let ultimo: Gamepad | null = null;
const preso = new Map<Botao, { desde: number; repetiu: number }>();

export function controles(): Gamepad[] {
  try { return [...(navigator.getGamepads?.() ?? [])].filter((g): g is Gamepad => !!g && g.connected); } catch { return []; }
}
/** 'playstation' quando o nome do controle indica (DualShock, DualSense, Sony); senão 'xbox' (o padrão). */
export function tipoDoControle(g?: Gamepad | null): 'xbox' | 'playstation' {
  const id = (g ?? ultimo)?.id ?? '';
  if (/xbox|045e|xinput/i.test(id)) return 'xbox';
  // O controle do PS4 aparece só como "Wireless Controller" em alguns sistemas.
  return /054c|playstation|dualsense|dualshock|^wireless controller|sony/i.test(id) ? 'playstation' : 'xbox';
}
export function vibrar(forte: number, fraco: number, ms: number) {
  const g = ultimo ?? controles()[0];
  const v = (g as unknown as { vibrationActuator?: { playEffect?: (t: string, p: Record<string, number>) => Promise<unknown> } } | undefined)?.vibrationActuator;
  try { void v?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: forte, weakMagnitude: fraco, startDelay: 0 })?.catch(() => null); } catch { /* sem vibração */ }
}

function apertados(g: Gamepad): Set<Botao> {
  const s = new Set<Botao>();
  g.buttons.forEach((b, i) => { const n = MAPA[i]; if (n && (b.pressed || b.value > 0.6)) s.add(n); });
  const [x = 0, y = 0] = g.axes;
  if (y < -ZONA) s.add('cima'); if (y > ZONA) s.add('baixo'); if (x < -ZONA) s.add('esquerda'); if (x > ZONA) s.add('direita');
  return s;
}

function quadro() {
  if (!ouvintes.size) { rodando = false; return; }
  const agora = performance.now();
  const todos = new Set<Botao>();
  for (const g of controles()) { const a = apertados(g); if (a.size) ultimo = g; a.forEach((b) => todos.add(b)); }
  for (const b of todos) {
    const p = preso.get(b);
    if (!p) { preso.set(b, { desde: agora, repetiu: agora }); ouvintes.forEach((f) => f(b)); continue; }
    if (DIRECOES.includes(b) && agora - p.desde > PRIMEIRA && agora - p.repetiu > SEGUINTES) { p.repetiu = agora; ouvintes.forEach((f) => f(b)); }
  }
  for (const b of [...preso.keys()]) if (!todos.has(b)) preso.delete(b);
  requestAnimationFrame(quadro);
}

/** Avisa a cada botão apertado. Devolve a função para parar de ouvir. */
export function ouvirControle(f: Ouvinte): () => void {
  ouvintes.add(f);
  if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
  return () => { ouvintes.delete(f); };
}
