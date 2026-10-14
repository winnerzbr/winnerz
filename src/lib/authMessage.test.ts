import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authMessage } from './authMessage';

test('mensagens do login em português', () => {
  assert.equal(authMessage('For security purposes, you can only request this after 42 seconds.', 429), 'Espere 42 segundos e peça de novo.');
  assert.equal(authMessage('Email rate limit exceeded', 429), 'Muitos pedidos seguidos. Espere alguns minutos e tente de novo.');
  assert.equal(authMessage('Token has expired or is invalid'), 'Esse código expirou ou não confere. Peça um novo link.');
  assert.equal(authMessage('Email address not authorized'), 'O envio de e-mails ainda não foi liberado para todo mundo. Tente de novo mais tarde.');
  assert.equal(authMessage('Unable to validate email address: invalid format'), 'Confira o e-mail: parece que falta alguma coisa.');
  assert.equal(authMessage('Error sending magic link email'), 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.');
  assert.equal(authMessage('Failed to fetch'), 'Sem conexão com o servidor. Confira a internet e tente de novo.');
  assert.equal(authMessage('???'), 'Não deu certo agora. Tente de novo em alguns minutos.');
});
