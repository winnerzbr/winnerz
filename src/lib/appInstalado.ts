/**
 * O site aberto como app da tela inicial (iPhone: "Adicionar à Tela de Início"; Android: instalar). Nesse modo não há
 * barra de endereço, e no iPhone a sessão do app é separada da do Safari: é preciso entrar de novo dentro dele.
 */
export function pelaTelaInicial(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch { return false; }
}
