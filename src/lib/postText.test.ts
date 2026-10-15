import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inline, mentionsOf, parsePost, plainText, quoteOf, spoilerReached } from './postText';

test('formatação simples: negrito, itálico, link e spoiler', () => {
  const x = inline('Olha **isso** e *aquilo* em https://winnerz.com.br, mas ||o chefe morre||.');
  assert.deepEqual(x.map((n) => n.t), ['text', 'b', 'text', 'i', 'text', 'link', 'text', 'spoiler', 'text']);
  const link = x.find((n) => n.t === 'link');
  assert.equal(link && link.t === 'link' ? link.href : '', 'https://winnerz.com.br');
  assert.equal(inline('2*3*4').length, 1, 'asterisco no meio de conta não vira itálico');
  assert.equal(inline('<script>alert(1)</script>')[0].t, 'text');
});

test('parágrafos e listas', () => {
  const b = parsePost('Primeiro\ncontinua\n\n- um\n- dois\n1. a\n2. b\n\nFim');
  assert.deepEqual(b.map((x) => x.t), ['p', 'ul', 'ol', 'p']);
  assert.equal(b[1].t === 'ul' ? b[1].items.length : 0, 2);
});

test('texto corrido esconde o spoiler', () => {
  assert.equal(plainText('A **Árvore** ||pega fogo||\n- sim'), 'A Árvore [spoiler] • sim');
});

test('a Jornada só diz se a pessoa já passou daquela parte', () => {
  assert.equal(spoilerReached(null, null), true);
  assert.equal(spoilerReached('inicio', null), null);
  assert.equal(spoilerReached('inicio', { progress: 20, completed: false, started: true }), true);
  assert.equal(spoilerReached('meio', { progress: 30, completed: false, started: true }), false);
  assert.equal(spoilerReached('meio', { progress: 60, completed: false, started: true }), true);
  assert.equal(spoilerReached('final', { progress: 90, completed: false, started: true }), false);
  assert.equal(spoilerReached('final', { progress: null, completed: true, started: true }), true);
});

test('menções: @fulano vira link, e-mail e o ponto final ficam de fora', () => {
  const x = inline('Oi @carol. Fala com @duda_3 e mande para a@b.com');
  assert.deepEqual(x.filter((n) => n.t === 'mention').map((n) => (n.t === 'mention' ? n.handle : '')), ['carol', 'duda_3']);
  assert.deepEqual(mentionsOf('@Carol e @carol, **@rafa** e ||@lu||'), ['carol', 'rafa', 'lu']);
});

test('citação com "> " vira bloco próprio', () => {
  const b = parsePost(quoteOf('carol', 'Tentei **40 vezes**') + 'Também!');
  assert.deepEqual(b.map((x) => x.t), ['quote', 'p']);
  assert.equal(plainText('> @carol: oi\n\nok'), '@carol: oi ok');
});

test('link sozinho na linha vira bloco próprio', () => {
  const b = parsePost('Olha esse:\nhttps://youtu.be/dQw4w9WgXcQ\nincrível');
  assert.deepEqual(b.map((x) => x.t), ['p', 'link', 'p']);
  assert.equal(b[1].t === 'link' ? b[1].url : '', 'https://youtu.be/dQw4w9WgXcQ');
});
