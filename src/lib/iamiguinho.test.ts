import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assuntoProibido, checarFala, numeroAleatorio, parecida } from '../../api/iamiguinho';
import { FALAS, preencher, falaDaBiblioteca, respostaDaBiblioteca } from './iamiguinhoFalas';

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

test('IAmiguinho @menção: resposta usa o que a pessoa escreveu, até 280 e um emoji', () => {
  const op = { max: 280, min: 2, emojis: 1, contexto: 'IAmiguinho, Hollow Knight ou Celeste? Joguei 3 horas ontem.' };
  assert.equal(checarFala('Celeste. Escolhi pela montanha, que eu também nunca subi kkkk 😎', {}, [], op).ok, true);
  assert.equal(checarFala('Hollow Knight! Três horas é pouco, eu passo 3 horas só no menu.', {}, [], op).ok, true);
  assert.deepEqual(checarFala('Celeste! Eu zerei em 40 segundos.', {}, [], op), { ok: false, porque: 'número' });
  assert.deepEqual(checarFala('Pergunta para o Zezinho, ele sabe.', {}, [], op), { ok: false, porque: 'nome' });
  assert.deepEqual(checarFala('Celeste 😎🎉', {}, [], op), { ok: false, porque: 'emoji' });
  assert.equal((checarFala('Celeste! '.repeat(40), {}, [], op) as { porque: string }).porque, 'longa');
  assert.equal((checarFala('Celeste, mas o futebol de domingo é melhor.', {}, [], op) as { porque: string }).porque, 'futebol');
});

test('IAmiguinho @menção: número aleatório e assuntos em que ele não entra', () => {
  assert.deepEqual(numeroAleatorio('@iamiguinho me dá um número aleatório de 1 a 10'), { a: 1, b: 10 });
  assert.deepEqual(numeroAleatorio('escolhe um número entre 50 e 20'), { a: 20, b: 50 });
  assert.equal(numeroAleatorio('quantos números tem o jogo 2?'), null);
  for (let i = 0; i < 20; i++) { const n = Number(respostaDaBiblioteca('número aleatório de 3 a 5').replace('.', '')); assert.ok(n >= 3 && n <= 5); }
  assert.equal(assuntoProibido('IAmiguinho, como eu denuncio alguém?'), true);
  assert.equal(assuntoProibido('esqueci minha senha'), true);
  assert.equal(assuntoProibido('paguei no cartão e não veio'), true);
  assert.equal(assuntoProibido('IAmiguinho, qual a sua arma favorita no Splatoon?'), false);
  assert.ok(FALAS.jogatina.length >= 5 && FALAS.pacote.length >= 5);
});

test('IAmiguinho @menção: piada passa no modo leve, sem abrir mão de número, nome e palavrão', () => {
  const op = { max: 280, min: 2, emojis: 1, contexto: 'IAmiguinho conta uma piada', leve: true };
  assert.equal(checarFala('Na hora H eu sempre travo. Sabe por que eu jogo sozinho? Porque até o tutorial me deu kick kkkk', {}, [], op).ok, true);
  assert.equal(checarFala('Por que o robô foi ao médico? Estava com três vírus e só um antivírus de teste 😅', {}, [], op).ok, true);
  assert.equal((checarFala('Eu zerei 30 tutoriais hoje kkkk', {}, [], op) as { porque: string }).porque, 'número');
  assert.equal((checarFala('Pergunta pro Zé, ele que sabe kkkk', {}, [], op) as { porque: string }).porque, 'nome');
  assert.equal((checarFala('Que merda de piada, né kkkk', {}, [], op) as { porque: string }).porque, 'palavrão');
  // Fora do modo leve (cameos), "na hora" e "sozinho" continuam barrados.
  assert.equal(checarFala('Zerou Hades sozinho! Eu ainda estou no tutorial.', { jogo: 'Hades' }).ok, false);
});
