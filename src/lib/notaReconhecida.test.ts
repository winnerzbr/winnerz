import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notaReconhecida, reconhecido } from '../../api/igdb';

const n = (g: Parameters<typeof notaReconhecida>[0]) => notaReconhecida(g).nota;

test('Nota com reconhecimento: desconhecido com nota alta vai para o fim', () => {
  const obscuro = n({ rating: 95, rating_count: 15 });
  const classico = n({ aggregated_rating: 92, aggregated_rating_count: 80, rating: 90, rating_count: 3000 });
  const indieBom = n({ aggregated_rating: 85, aggregated_rating_count: 10, rating: 88, rating_count: 300 });
  const famosoRuim = n({ aggregated_rating: 50, aggregated_rating_count: 40, rating: 55, rating_count: 2000 });
  assert.ok(classico > indieBom, `${classico} > ${indieBom}`);
  assert.ok(indieBom > obscuro, `${indieBom} > ${obscuro}`);
  assert.ok(obscuro > famosoRuim - 15, 'famoso e ruim não ganha só por ser famoso');
  assert.ok(classico - obscuro > 20);
  // Sem nenhuma avaliação: neutro, sem bônus.
  assert.ok(n({}) < 70);
});

test('Nota com reconhecimento: crítica pesa um pouco mais e precisa de base mínima', () => {
  const soCritica = notaReconhecida({ aggregated_rating: 90, aggregated_rating_count: 30 }).qualidade;
  const soJogadores = notaReconhecida({ rating: 90, rating_count: 30 }).qualidade;
  assert.ok(soCritica > soJogadores);
  assert.equal(reconhecido({ total_rating_count: 15 }), false);
  assert.equal(reconhecido({ total_rating_count: 50 }), true);
  assert.equal(reconhecido({ total_rating_count: 5, aggregated_rating_count: 4 }), true);
});
