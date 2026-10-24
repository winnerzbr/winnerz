/** Peças do login com outros serviços que não dependem da tela (testadas em loginSocial.test.ts). */
export type Servico = 'google' | 'steam' | 'discord' | 'twitch';

export type ServicoOAuth = Exclude<Servico, 'steam'>;

const TODOS: Servico[] = ['google', 'steam', 'discord', 'twitch'];

export const NOME: Record<Servico, string> = { google: 'Google', steam: 'Steam', discord: 'Discord', twitch: 'Twitch' };

/** Quais serviços mostrar, a partir do que o Supabase diz que está ligado (a Steam está sempre). */
export function servicosDe(external: Record<string, unknown> | null | undefined): Servico[] {
  return TODOS.filter((s) => s === 'steam' || external?.[s] === true);
}

export const eServico = (v: unknown): v is Servico => typeof v === 'string' && (TODOS as string[]).includes(v);

/** Para onde voltar: só caminhos deste site. */
export function caminhoSeguro(v: unknown): string {
  const t = typeof v === 'string' ? v.trim() : '';
  return t.startsWith('/') && !t.startsWith('//') && !t.includes('\\') && t.length <= 300 ? t : '/';
}

/** Mensagens que voltam no endereço (#erro=...) depois de um login que não deu certo. */
export const ERROS_LOGIN: Record<string, string> = {
  'steam-cancelou': 'O login da Steam foi cancelado.',
  'steam-venceu': 'O login da Steam demorou demais. Tente de novo.',
  'steam-navegador': 'O login da Steam terminou em outro navegador. Tente de novo por aqui.',
  'steam-invalida': 'A Steam não confirmou o login. Tente de novo.',
  'steam-outra-conta': 'Essa Steam já está ligada a outra conta do WinnerZ.',
  'steam-limite': 'Muitas tentativas daqui. Espere um pouco e tente de novo.',
  'steam-ligar': 'O pedido para ligar a Steam venceu. Tente de novo.',
  'steam-migracao': 'O login da Steam ainda está sendo preparado. Use outro jeito de entrar por enquanto.',
  'steam-falhou': 'Não deu para entrar com a Steam agora. Tente de novo ou use o e-mail.',
};
export function erroDoEndereco(hash: string = typeof location === 'undefined' ? '' : location.hash): string {
  const m = /[#&]erro=([a-z-]+)/.exec(hash);
  if (m) return ERROS_LOGIN[m[1]] ?? 'O login não deu certo. Tente de novo.';
  return /[#&]error=/.test(hash) ? 'O login não deu certo. Tente de novo ou use o e-mail.' : '';
}
