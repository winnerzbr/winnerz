import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inline, parsePost, plainText, spoilerCovered } from './postText';

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

test('spoiler coberto conforme o progresso', () => {
  assert.equal(spoilerCovered(null, null), false);
  assert.equal(spoilerCovered('inicio', null), true);
  assert.equal(spoilerCovered('inicio', { progress: 20, completed: false, started: true }), false);
  assert.equal(spoilerCovered('meio', { progress: 30, completed: false, started: true }), true);
  assert.equal(spoilerCovered('meio', { progress: 60, completed: false, started: true }), false);
  assert.equal(spoilerCovered('final', { progress: 90, completed: false, started: true }), true);
  assert.equal(spoilerCovered('final', { progress: null, completed: true, started: true }), false);
});

test('link sozinho na linha vira bloco próprio', () => {
  const b = parsePost('Olha esse:\nhttps://youtu.be/dQw4w9WgXcQ\nincrível');
  assert.deepEqual(b.map((x) => x.t), ['p', 'link', 'p']);
  assert.equal(b[1].t === 'link' ? b[1].url : '', 'https://youtu.be/dQw4w9WgXcQ');
});
