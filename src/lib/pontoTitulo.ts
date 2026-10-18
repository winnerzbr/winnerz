/**
 * Nome de um ponto para voltar quando a pessoa não deu nome: o começo do motivo, cortado numa palavra.
 * Sem motivo, um nome que diz o que é (nunca o texto do botão, "Quero voltar aqui").
 */
export function pontoTitulo(motivo: string | undefined, max = 48): string {
  const t = (motivo ?? '').replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
  if (!t) return 'Ponto para voltar';
  if (t.length <= max) return t[0].toUpperCase() + t.slice(1);
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[,;:\s]+$/, '')}…`.replace(/^./, (c) => c.toUpperCase());
}
