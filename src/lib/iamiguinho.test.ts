import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checarFala, parecida } from '../../api/iamiguinho';
import { FALAS, preencher, falaDaBiblioteca } from './iamiguinhoFalas';

const ok = (s: string, f = {}, r: string[] = []) => checarFala(s, f, r);

test('IAmiguinho: fala boa passa, limpa aspas e numeração', () => {
  const v = ok('1. "Zerou Elden Ring?! Eu ainda estou tentando passar do menu inicial."', { jogo: 'Elden Ring' });
  assert.deepEqual(v, { ok: true, fala: 'Zerou Elden Ring?! Eu ainda estou tentando passar do menu inicial.' });
  assert.equal(ok('Voltou depois de 143 dias! Eu treinei Splatoon esse tempo todo com a Sploosh.', { jogo: 'Hades', dias: 143 }).ok, true);
  assert.equal(ok('Zerou! Eu tenho 47 tutoriais zerados, então somos quase iguais.', { jogo: 'Celeste' }).ok, true);
});

test('IAmiguinho: barra número e nome que não vieram nos fatos', () => {
  assert.deepEqual(ok('Zerou Hades em 30 sessões! Eu nem passei da primeira.', { jogo: 'Hades' }), { ok: false, porque: 'número' });
  assert.deepEqual(ok('Zerou Hades! O Zagreus deve estar orgulhoso, eu estou.', { jogo: 'Hades' }), { ok: false, porque: 'nome' });
  assert.deepEqual(ok('Voltou depois de 200 dias! Eu contei cada um.', { jogo: 'Hades', dias: 143 }), { ok: false, porque: 'número' });
  assert.equal(ok('Zerou Final Fantasy 7! Eu zerei o tutorial do 7 também.', { jogo: 'Final Fantasy 7' }).ok, true);
});

test('IAmiguinho: barra palavrão, futebol, horas inventadas, abandono, gênero, emoji e tamanho', () => {
  const f = { jogo: 'Hades' };
  assert.equal((ok('Zerou Hades, porra! Que orgulho de você aqui.', f) as { porque: string }).porque, 'palavrão');
  assert.equal((ok('Zerou Hades! Foi um golaço de jogo, igual ao futebol de domingo.', f) as { porque: string }).porque, 'futebol');
  assert.equal((ok('Zerou Hades em poucas horas! Eu levaria anos para isso.', f) as { porque: string }).porque, 'fato inventado');
  assert.equal((ok('Voltou! Achei que tinha abandonado o Hades de vez por aqui.', f) as { porque: string }).porque, 'abandono');
  assert.equal((ok('Bem-vindo de volta ao Hades! Guardei tudo por aqui.', f) as { porque: string }).porque, 'gênero');
  assert.equal((ok('Zerou Hades! 🎉 Eu ainda estou no tutorial.', f) as { porque: string }).porque, 'emoji');
  assert.equal((ok('Oi!', f) as { porque: string }).porque, 'curta');
  assert.equal((ok('Zerou Hades! '.repeat(12), f) as { porque: string }).porque, 'longa');
  // Pão cacetinho é lore, não palavrão.
  assert.equal(ok('Zerou Hades! Vou comemorar com um pão cacetinho quentinho.', f).ok, true);
  // Palavra proibida que faz parte do nome do jogo não conta.
  assert.equal(ok('Zerou Chefe Final Simulator! Eu ainda estou no tutorial dele.', { jogo: 'Chefe Final Simulator' }).ok, true);
});

test('IAmiguinho: não repete fala recente', () => {
  const r = ['Zerou Hades! Eu ainda estou tentando passar do menu inicial.'];
  assert.equal((ok('Zerou Hades! Eu ainda estou tentando passar do menu inicial!', { jogo: 'Hades' }, r) as { porque: string }).porque, 'repetida');
  assert.equal(parecida('Que bom te ver de volta', 'Hoje eu girei a hélice ao contrário'), false);
});

test('IAmiguinho: biblioteca preenche as lacunas e evita as últimas', () => {
  assert.equal(preencher('{dias} dias longe de {jogo}?', { jogo: 'Hades', dias: 40 }), '40 dias longe de Hades?');
  assert.equal(preencher('{dias} dias longe de {jogo}?', { jogo: 'Hades' }), null);
  assert.equal(preencher('{dias} dias', { dias: 1 }), null);
  for (let i = 0; i < 30; i++) assert.ok(!/[{}]/.test(falaDaBiblioteca('voltou', {})));
  for (let i = 0; i < 30; i++) assert.ok(!/[{}]/.test(falaDaBiblioteca('zerado', {})));
  const todas = FALAS.zerado.map((x) => preencher(x, { jogo: 'Hades' })!).filter(Boolean);
  const uma = falaDaBiblioteca('zerado', { jogo: 'Hades' }, todas.slice(1));
  assert.equal(uma, todas[0]);
  // As falas da biblioteca passam na mesma checagem da IA (com fatos de exemplo).
  for (const m of ['zerado', 'voltou', 'primeiro-zerado'] as const) for (const x of FALAS[m]) {
    const p = preencher(x, { jogo: 'Hades', dias: 40 });
    if (p) assert.equal(checarFala(p, { jogo: 'Hades', dias: 40 }).ok, true, p);
  }
});
