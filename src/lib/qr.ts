/** QR code em SVG (para o Modo TV mostrar o endereço de entrar pelo celular). */
// @ts-ignore: biblioteca em JavaScript puro, sem tipos
import QRCode from './vendor/qrcode.js';

/** Desenha o texto como QR (correção média) e devolve o SVG pronto, com margem de 4 módulos. */
export function qrSvg(texto: string, cor = '#0B0D10', fundo = '#F2F4F6'): string {
  const q = new QRCode(-1, 0);
  q.addData(texto);
  q.make();
  const n: number = q.getModuleCount(), m = 4, t = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="${fundo}"/><path d="${d}" fill="${cor}"/></svg>`;
}
