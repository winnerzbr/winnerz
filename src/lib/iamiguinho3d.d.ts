export type Estado3D = {
  /** parado, acenar, andar, comemorar, borda, dormir, tonto */
  anim?: string;
  /** segundo (na contagem de estado) em que a animação começou */
  t0?: number;
  /** expressão do rosto (as de iamiguinhoRosto) */
  rosto?: string;
  yaw?: number;
  /** 0 inteiro, 1 desmontado em quadradinhos */
  pix?: number;
  /** faixa de altura do corpo que aparece: [de, até], com os pés em 0 e a hélice em 1 */
  vista?: [number, number];
  /** quadro parado (sem animação) */
  parado?: boolean;
  helice?: number;
  tela?: number;
};
/** Liga o IAmiguinho 3D a um canvas; devolve a função que desliga. */
export function mountIAmiguinho(canvas: HTMLCanvasElement, estado: (t: number, dt: number) => Estado3D | null, onReady?: () => void, onFail?: () => void): () => void;
export const ANIMACOES: string[];
