/** Gerado por art/iamiguinho/limpar-tela.py: a tela do rosto em cada imagem (centro e largura em %, inclinação em graus). */
export const TELA: Record<string, { x: number; y: number; w: number; a: number }> = {
  'cara-comemorando': { x: 39.58, y: 63.66, w: 58.33, a: 0.0 },
  'cara-curioso': { x: 40.89, y: 63.74, w: 58.85, a: 0.0 },
  'cara-feliz': { x: 40.1, y: 63.87, w: 58.33, a: 0.0 },
  'cara-orgulhoso': { x: 39.58, y: 63.37, w: 58.33, a: 0.0 },
  'cara-pensando': { x: 40.1, y: 63.79, w: 58.33, a: 0.0 },
  'cara-perdido': { x: 39.84, y: 63.35, w: 58.85, a: 0.0 },
  'cara-piscando': { x: 39.84, y: 63.87, w: 57.81, a: 0.0 },
  'cara-sem-jeito': { x: 38.54, y: 63.92, w: 57.29, a: 0.0 },
  'cara-sonolento': { x: 39.84, y: 64.0, w: 58.85, a: 0.0 },
  'cara-sorriso-confiante': { x: 40.89, y: 63.47, w: 58.85, a: 0.0 },
  'cara-surpreso': { x: 39.58, y: 63.56, w: 58.33, a: 0.0 },
  'cara-tonto': { x: 41.2, y: 63.5, w: 59.55, a: 3.6 },
  'pose-acenando': { x: 42.2, y: 35.71, w: 52.35, a: -8.7 },
  'pose-atrasado': { x: 59.73, y: 36.72, w: 42.87, a: 12.5 },
  'pose-cabo': { x: 47.38, y: 39.75, w: 43.85, a: -11.3 },
  'pose-controle': { x: 50.3, y: 44.6, w: 52.0, a: -11.0 },
  'pose-dormindo': { x: 49.68, y: 43.3, w: 55.71, a: -7.1 },
  'pose-espiando': { x: 60.68, y: 42.22, w: 35.23, a: 23.2 },
  'pose-espiando-placa': { x: 60.68, y: 42.22, w: 35.23, a: 23.2 },
  'pose-heroi': { x: 50.26, y: 29.68, w: 45.64, a: 16.7 },
  'pose-mapa': { x: 46.03, y: 36.22, w: 50.54, a: 15.9 },
  'pose-pacote': { x: 50.24, y: 37.09, w: 54.62, a: 8.1 },
  'pose-placa': { x: 48.88, y: 33.33, w: 51.82, a: 0.0 },
  'pose-planando': { x: 47.49, y: 39.53, w: 41.81, a: 18.4 },
  'pose-trofeu': { x: 40.72, y: 36.63, w: 36.9, a: -26.6 },
};
/** Imagens em que um objeto fica na frente da tela: o rosto usa a máscara <nome>-tela.webp. */
export const MASCARA: Record<string, true> = {'pose-controle': true};
/** A área branca da placa (centro, largura e altura em %, proporção largura/altura em pixels, inclinação). */
export const PLACA: Record<string, { x: number; y: number; w: number; h: number; r: number; a: number }> = {
  'pose-espiando': { x: 21.53, y: 52.65, w: 41.86, h: 92.84, r: 0.466, a: 0.3 },
  'pose-espiando-placa': { x: 21.53, y: 52.65, w: 41.86, h: 92.84, r: 0.466, a: 0.3 },
  'pose-placa': { x: 50.28, y: 65.09, w: 82.45, h: 28.62, r: 2.143, a: 0.5 },
};
