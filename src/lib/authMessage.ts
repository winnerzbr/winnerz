/** As mensagens do serviço de login vêm em inglês: aqui viram português (e as desconhecidas, uma frase genérica). */
export function authMessage(raw: string, status?: number): string {
  const m = raw.toLowerCase();
  if (status === 429 || /rate limit|too many|security purposes|only request this after/.test(m)) {
    const s = /after (\d+) seconds?/.exec(m)?.[1];
    return s ? `Espere ${s} segundos e peça de novo.` : 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.';
  }
  if (/expired|invalid.*(token|otp)|token.*(invalid|expired)|otp_expired/.test(m)) return 'Esse código expirou ou não confere. Peça um novo link.';
  if (/not authorized|address not authorized/.test(m)) return 'O envio de e-mails ainda não foi liberado para todo mundo. Tente de novo mais tarde.';
  if (/invalid.*email|email.*invalid|unable to validate email/.test(m)) return 'Confira o e-mail: parece que falta alguma coisa.';
  if (/signups? not allowed|signup.*disabled/.test(m)) return 'Novas contas estão fechadas por enquanto.';
  if (/smtp|sending|send.*email|error sending/.test(m)) return 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.';
  if (/fetch|network|failed to fetch/.test(m)) return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  return 'Não deu certo agora. Tente de novo em alguns minutos.';
}
