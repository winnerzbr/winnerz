import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raCleanTitle, raClusters, playniteSession, achRows, achMoves, achPrompt, enderecoAvisos, mensagemTwitch, mensagemYoutube, faltaEscopo } from '../../api/pontes';

test('títulos do RetroAchievements viram nomes buscáveis', () => {
  assert.equal(raCleanTitle('Legend of Zelda, The: A Link to the Past'), 'The Legend of Zelda: A Link to the Past');
  assert.equal(raCleanTitle('~Hack~ Super Mario World [Subset - Bonus]'), 'Super Mario World');
});

test('conquistas viram sessões por jogo, separadas por pausas longas', () => {
  const u = (Date: string, GameID: number, Title = 'x') => ({ Date, GameID, Title, GameTitle: `Jogo ${GameID}` });
  const c = raClusters([u('2026-10-14 20:00:00', 1, 'a'), u('2026-10-14 20:40:00', 1, 'b'), u('2026-10-14 21:00:00', 2), u('2026-10-14 23:30:00', 1, 'c')]);
  assert.equal(c.length, 3);
  assert.deepEqual(c[0].names, ['a', 'b']);
  assert.equal((c[0].last - c[0].first) / 60000, 40);
  assert.equal(c[2].game, 1);
});

test('sessão do Playnite: início e fim exatos, sem sessões curtas demais nem no futuro', () => {
  const now = Date.parse('2026-10-15T22:00:00Z');
  const g = { id: 'x', name: 'Hades' };
  assert.deepEqual(playniteSession(g, '2026-10-15T20:00:00Z', '2026-10-15T21:30:00Z', now)?.minutes, 90);
  assert.equal(playniteSession(g, '2026-10-15T21:00:00Z', '2026-10-15T21:01:00Z', now), null);
  assert.equal(playniteSession({ id: 'x' }, '2026-10-15T20:00:00Z', '2026-10-15T21:00:00Z', now), null);
  assert.equal(playniteSession(g, '2026-10-15T21:00:00Z', '2026-10-16T21:00:00Z', now)?.minutes, 60);
});

test('C3: a resposta da IA vira ligações conferidas (índice fora da lista, repetido ou inválido fica de fora)', () => {
  const parts = [{ id: 'p1', name: 'Um', pct: 0 }, { id: 'p2', name: 'Dois', pct: 50 }, { id: 'p3', name: 'Tres', pct: 90 }];
  const achs = [{ key: 'k1', name: 'Começo' }, { key: 'k2', name: 'Meio' }, { key: 'k3', name: 'Coleção' }];
  const rows = achRows({ links: [{ a: 1, n: 2 }, { a: 2, n: 3 }, { a: 2, n: 1 }, { a: 9, n: 1 }, { a: 3, n: 7 }, { a: 'x', n: 1 }] }, achs, parts);
  assert.deepEqual(rows, [{ key: 'k1', name: 'Começo', partId: 'p2' }, { key: 'k2', name: 'Meio', partId: 'p3' }, { key: 'k3', name: 'Coleção', partId: '' }]);
  assert.deepEqual(achRows(null, achs, parts).map((r) => r.partId), ['', '', '']);
});

test('C3: só conquistas ligadas e desbloqueadas viram avanços, em ordem de data e sem repetir', () => {
  const links = [{ ach_key: 'a', part_id: 'p2', name: 'A' }, { ach_key: 'b', part_id: null, name: 'B' }, { ach_key: 'c', part_id: 'p3', name: 'C' }];
  const m = achMoves(links, [{ key: 'c', at: 2000 }, { key: 'a', at: 1000 }, { key: 'b', at: 500 }, { key: 'a', at: 3000 }, { key: 'z', at: 10 }, { key: 'c', at: NaN }]);
  assert.deepEqual(m.map((x) => [x.key, x.partId, x.at]), [['a', 'p2', 1000], ['c', 'p3', 2000]]);
});

test('C3: o texto para a IA numera a lista e as conquistas', () => {
  const t = achPrompt('Jogo (2020)', [{ id: 'p1', name: 'Um', pct: 0, group: 'Mundo 1' }, { id: 'p2', name: 'Chefe', pct: 50, kind: 'chefe' }], [{ key: 'k', name: 'Fim', desc: 'Veja o final', pct: 12.345, kind: 'final do jogo' }]);
  assert.match(t, /1\. Um \(Mundo 1\)/);
  assert.match(t, /2\. Chefe \[chefe\]/);
  assert.match(t, /1\. Fim — Veja o final \(12\.3% dos jogadores\) \[final do jogo\]/);
});

test('E7.3: o state do login da Twitch só vale assinado e dentro do prazo', async () => {
  const { signState, readState } = await import('../../api/pontes');
  const s = await signState({ u: 'user-1', k: 'pessoa', t: 2_000 }, 'segredo');
  assert.deepEqual(await readState(s, 'segredo', 1_000), { u: 'user-1', k: 'pessoa' });
  assert.equal(await readState(s, 'segredo', 3_000), null);
  assert.equal(await readState(s, 'outro', 1_000), null);
  assert.equal(await readState(s.replace(/^./, 'x'), 'segredo', 1_000), null);
});

test('Twitch: o state leva o número do cookie, e a comparação é em tempo constante', async () => {
  const { signState, readState, sameText, cookieOf } = await import('../../api/pontes');
  const s = await signState({ u: 'user-1', k: 'pessoa', t: 2_000, n: 'num-cookie' }, 'segredo');
  assert.deepEqual(await readState(s, 'segredo', 1_000), { u: 'user-1', k: 'pessoa', n: 'num-cookie' });
  assert.equal(sameText('abc', 'abc'), true);
  assert.equal(sameText('abc', 'abd'), false);
  assert.equal(sameText('abc', 'abcd'), false);
  assert.equal(cookieOf('wz_tw_nonce=xyz', 'wz_tw_nonce'), 'xyz');
});

test('E7.3: assinatura do EventSub da Twitch (HMAC do id + data + corpo exato)', async () => {
  const { eventsubOk, eventsubSecret } = await import('../../api/pontes');
  const { createHmac } = await import('node:crypto');
  const id = 'msg-1', ts = '2026-10-17T10:00:00Z', raw = '{"event":{"id":"r1"}}';
  const sig = `sha256=${createHmac('sha256', await eventsubSecret('chave')).update(id + ts + raw).digest('hex')}`;
  const now = Date.parse(ts) + 1000;
  assert.equal(await eventsubOk('chave', id, ts, raw, sig, now), true);
  assert.equal(await eventsubOk('chave', id, ts, raw + ' ', sig, now), false);
  assert.equal(await eventsubOk('chave', id, ts, raw, sig, now + 11 * 60_000), false);
  assert.equal(await eventsubOk('chave', id, ts, raw, 'sha256=00', now), false);
});

test('live: os eventos da Twitch viram alertas, e os que não são de alerta ficam de fora', async () => {
  const { alertaDe } = await import('../../api/pontes');
  assert.deepEqual(alertaDe('channel.follow', { user_name: 'Fulana' }), { tipo: 'follow', quem: 'Fulana', valor: null });
  assert.deepEqual(alertaDe('channel.subscribe', { user_name: 'Beltrano', tier: '2000' }), { tipo: 'sub', quem: 'Beltrano', valor: 2 });
  assert.equal(alertaDe('channel.subscribe', { user_name: 'Ganhou', tier: '1000', is_gift: true }), null);
  assert.deepEqual(alertaDe('channel.subscription.message', { user_name: 'Volta', cumulative_months: 7 }), { tipo: 'resub', quem: 'Volta', valor: 7 });
  assert.deepEqual(alertaDe('channel.subscription.gift', { is_anonymous: true, total: 5 }), { tipo: 'gift', quem: 'Alguém anônimo', valor: 5 });
  assert.deepEqual(alertaDe('channel.cheer', { user_name: 'Bits', bits: 500 }), { tipo: 'cheer', quem: 'Bits', valor: 500 });
  assert.deepEqual(alertaDe('channel.raid', { from_broadcaster_user_name: 'CanalAmigo', viewers: 42 }), { tipo: 'raid', quem: 'CanalAmigo', valor: 42 });
  assert.equal(alertaDe('channel.channel_points_custom_reward_redemption.add', { user_name: 'x' }), null);
  assert.equal(alertaDe('channel.follow', {}), null);
});

test('live (YouTube): cada mensagem do chat vira chat, alerta ou os dois', async () => {
  const { itemYoutube } = await import('../../api/pontes');
  const a = { displayName: '@fulana', isChatSponsor: false };
  assert.deepEqual(itemYoutube({ snippet: { type: 'textMessageEvent', displayMessage: 'oi chat' }, authorDetails: a }), { chat: { quem: '@fulana', texto: 'oi chat', membro: false } });
  const sc = itemYoutube({ snippet: { type: 'superChatEvent', superChatDetails: { amountMicros: '10000000', amountDisplayString: 'R$ 10,00', userComment: 'vai!' } }, authorDetails: a });
  assert.deepEqual(sc.alerta, { tipo: 'superchat', quem: '@fulana', valor: 1000, extra: 'R$ 10,00' });
  assert.equal(sc.chat?.texto, 'vai!');
  assert.equal(itemYoutube({ snippet: { type: 'newSponsorEvent' }, authorDetails: a }).alerta?.tipo, 'member');
  assert.deepEqual(itemYoutube({ snippet: { type: 'memberMilestoneChatEvent', memberMilestoneChatDetails: { memberMonth: 6 } }, authorDetails: a }).alerta, { tipo: 'member', quem: '@fulana', valor: 6, extra: null });
  assert.deepEqual(itemYoutube({ snippet: { type: 'membershipGiftingEvent', membershipGiftingDetails: { giftMembershipsCount: 5 } }, authorDetails: a }).alerta, { tipo: 'gift', quem: '@fulana', valor: 5, extra: null });
  assert.deepEqual(itemYoutube({ snippet: { type: 'messageDeletedEvent' }, authorDetails: a }), {});
  assert.deepEqual(itemYoutube({ snippet: { type: 'textMessageEvent', displayMessage: 'x' }, authorDetails: {} }), {});
});

test('live (YouTube): a chave de renovação cifra e decifra com a chave do servidor', async () => {
  process.env.SUPABASE_SECRET_KEY ||= 'chave-de-teste';
  const { cifrar, decifrar } = await import('../../api/pontes');
  const c = await cifrar('1//segredo-do-google');
  assert.ok(!c.includes('segredo'));
  assert.equal(await decifrar(c), '1//segredo-do-google');
  assert.equal(await decifrar(c.slice(0, -2) + 'xx'), null);
});

test('os avisos da Twitch vão para o endereço que responde (com ou sem www), nunca para outro domínio', () => {
  const fim = '/api/pontes?twitch=evento';
  assert.equal(enderecoAvisos('https://winnerz.com.br', 'www.winnerz.com.br'), 'https://www.winnerz.com.br' + fim);
  assert.equal(enderecoAvisos('https://www.winnerz.com.br/', 'winnerz.com.br'), 'https://winnerz.com.br' + fim);
  assert.equal(enderecoAvisos('https://winnerz.com.br', 'outro.vercel.app'), 'https://winnerz.com.br' + fim);
  assert.equal(enderecoAvisos('https://winnerz.com.br', undefined), 'https://winnerz.com.br' + fim);
  assert.equal(enderecoAvisos('https://winnerz.com.br', 'www.winnerz.com.br@mal.com'), 'https://winnerz.com.br' + fim);
});

test('etapa 3a: mensagem do chat da Twitch vira entrada da enquete/sorteio (a do bot não conta)', () => {
  const ev = { broadcaster_user_id: '10', chatter_user_id: '22', chatter_user_login: 'ana', chatter_user_name: 'Ana', message: { text: '  2 \n' }, badges: [{ set_id: 'moderator' }] };
  assert.deepEqual(mensagemTwitch(ev, '99'), { pl: 'tw', uid: '22', nome: 'Ana', texto: '2', mod: true, dono: false });
  assert.equal(mensagemTwitch({ ...ev, chatter_user_id: '99' }, '99'), null);
  assert.equal(mensagemTwitch({ ...ev, message: { text: '   ' } }, '99'), null);
  assert.equal(mensagemTwitch({ ...ev, chatter_user_id: 'x;drop' }, '99'), null);
  const dono = mensagemTwitch({ ...ev, chatter_user_id: '10', badges: [{ set_id: 'broadcaster' }] }, '99');
  assert.equal(dono?.dono, true); assert.equal(dono?.mod, true);
  assert.equal(mensagemTwitch({ ...ev, badges: [] }, '99')?.mod, false);
});

test('etapa 3a: mensagem do chat do YouTube (texto ou comentário do Super Chat)', () => {
  const base = { authorDetails: { channelId: 'UCabc', displayName: 'Bia', isChatModerator: false, isChatOwner: false } };
  assert.deepEqual(mensagemYoutube({ ...base, snippet: { type: 'textMessageEvent', displayMessage: '!sorteio' } }), { pl: 'yt', uid: 'UCabc', nome: 'Bia', texto: '!sorteio', mod: false, dono: false });
  assert.equal(mensagemYoutube({ ...base, snippet: { type: 'superChatEvent', superChatDetails: { userComment: '1' } } })?.texto, '1');
  assert.equal(mensagemYoutube({ ...base, snippet: { type: 'newSponsorEvent' } }), null);
  assert.equal(mensagemYoutube({ authorDetails: { channelId: 'UCx', isChatOwner: true }, snippet: { type: 'textMessageEvent', displayMessage: '!morte' } })?.dono, true);
});

test('etapa 3a: escopos que faltam no canal', () => {
  assert.deepEqual(faltaEscopo('channel:read:redemptions moderator:read:followers channel:read:subscriptions bits:read'), ['channel:bot']);
  assert.deepEqual(faltaEscopo('bits:read channel:bot', 'channel:bot'), []);
  assert.deepEqual(faltaEscopo(null, 'channel:bot'), ['channel:bot']);
});

test('etapa 3a: o login da conta do bot passa pelo mesmo state assinado', async () => {
  const { signState, readState } = await import('../../api/pontes');
  const s = await signState({ u: 'adm', k: 'bot', t: 2_000, n: 'abc', d: 'live' }, 'segredo');
  assert.deepEqual(await readState(s, 'segredo', 1_000), { u: 'adm', k: 'bot', n: 'abc', d: 'live' });
});
