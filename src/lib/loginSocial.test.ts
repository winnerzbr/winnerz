import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caminhoSeguro, eServico, erroDoEndereco, servicosDe } from './loginSocial';
import { emailDaSteam, lerRespostaSteam, urlSteam, voltaSegura } from '../../api/conta';

test('mostra só os serviços ligados no Supabase, e a Steam sempre', () => {
  assert.deepEqual(servicosDe({ google: true, discord: false, twitch: true, github: true }), ['google', 'steam', 'twitch']);
  assert.deepEqual(servicosDe(null), ['steam']);
  assert.equal(eServico('google'), true);
  assert.equal(eServico('github'), false);
});

test('a volta depois do login só vai para caminhos do próprio site', () => {
  for (const f of [caminhoSeguro, voltaSegura]) {
    assert.equal(f('/convite/ABC'), '/convite/ABC');
    assert.equal(f('/entrar/app?c=ABC123'), '/entrar/app?c=ABC123');
    assert.equal(f('https://outro.site'), '/');
    assert.equal(f('//outro.site/x'), '/');
    assert.equal(f('/\\outro.site'), '/');
    assert.equal(f(undefined), '/');
  }
});

test('mensagens de erro que voltam no endereço', () => {
  assert.match(erroDoEndereco('#erro=steam-outra-conta'), /outra conta/);
  assert.match(erroDoEndereco('#error=access_denied&error_description=x'), /não deu certo/);
  assert.equal(erroDoEndereco(''), '');
});

test('o e-mail interno das contas da Steam nunca recebe nada', () => {
  assert.equal(emailDaSteam('76561198000000000@steam.winnerz.com.br'), true);
  assert.equal(emailDaSteam('alguem@gmail.com'), false);
  assert.equal(emailDaSteam(undefined), false);
});

const ORIGEM = 'https://www.winnerz.com.br';
const VOLTA = `${ORIGEM}/steam/volta?s=abc.def`;
const resposta = (mudar: Record<string, string> = {}) => ({
  'openid.ns': 'http://specs.openid.net/auth/2.0',
  'openid.mode': 'id_res',
  'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
  'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198012345678',
  'openid.identity': 'https://steamcommunity.com/openid/id/76561198012345678',
  'openid.return_to': VOLTA,
  'openid.response_nonce': '2026-10-24T04:00:00Zabc',
  'openid.assoc_handle': '1234567890',
  'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
  'openid.sig': 'x',
  s: 'abc.def',
  ...mudar,
});

test('login da Steam: endereço de ida e leitura da volta', () => {
  const u = new URL(urlSteam(ORIGEM, VOLTA));
  assert.equal(u.origin + u.pathname, 'https://steamcommunity.com/openid/login');
  assert.equal(u.searchParams.get('openid.return_to'), VOLTA);
  assert.equal(u.searchParams.get('openid.realm'), ORIGEM);
  assert.equal(lerRespostaSteam(resposta(), VOLTA), '76561198012345678');
  // Qualquer peça fora do lugar: não vale.
  assert.equal(lerRespostaSteam(resposta({ 'openid.op_endpoint': 'https://falso.com/openid/login' }), VOLTA), null);
  assert.equal(lerRespostaSteam(resposta({ 'openid.return_to': `${ORIGEM}/steam/volta?s=outro` }), VOLTA), null);
  assert.equal(lerRespostaSteam(resposta({ 'openid.claimed_id': 'https://falso.com/openid/id/76561198012345678', 'openid.identity': 'https://falso.com/openid/id/76561198012345678' }), VOLTA), null);
  assert.equal(lerRespostaSteam(resposta({ 'openid.signed': 'op_endpoint,claimed_id' }), VOLTA), null);
  assert.equal(lerRespostaSteam(resposta({ 'openid.mode': 'cancel' }), VOLTA), null);
});
