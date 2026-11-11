export type ZeniteView = { eye: number[]; ct: number[]; x0?: number; wf?: number; sel?: number; lit?: number; fill?: number };
/** Liga o troféu Zênite em 3D a um canvas; devolve a função que desliga. */
export function mountZenite(canvas: HTMLCanvasElement, view: (dt: number, t: number, w: number, h: number) => ZeniteView | null, onReady?: () => void, onFail?: () => void): () => void;
