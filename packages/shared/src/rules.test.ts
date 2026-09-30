import { expect, test } from 'vitest';
import { computeValidTo, evaluateReadings, requiresGatc, computeFee } from './rules';

test('computeValidTo handles standard months', () => {
  const start = Date.UTC(2026, 0, 15);
  const validTo = computeValidTo('Weights', start);
  const end = new Date(validTo);
  expect(end.getUTCFullYear()).toBe(2028);
  expect(end.getUTCMonth()).toBe(0);
  expect(end.getUTCDate()).toBe(15);
});

test('computeValidTo handles month-end edge cases', () => {
  const start = Date.UTC(2024, 0, 31);
  let end = new Date(computeValidTo('Weights', start));
  expect(end.getUTCFullYear()).toBe(2026);
  expect(end.getUTCMonth()).toBe(0);
  expect(end.getUTCDate()).toBe(31);

  const start2 = Date.UTC(2023, 1, 28);
  end = new Date(computeValidTo('Weights', start2));
  expect(end.getUTCMonth()).toBe(1);
  expect(end.getUTCDate()).toBe(28);

  const start3 = Date.UTC(2023, 10, 30);
  end = new Date(computeValidTo('Weights', start3));
  expect(end.getUTCDate()).toBe(30);
});

test('requiresGatc', () => {
  expect(requiresGatc('NAWI class III up to 150 kg')).toBe(true);
  expect(requiresGatc('Weights')).toBe(false);
});

test('computeFee', () => {
  expect(computeFee('Weights')).toBe(100);
});

test('evaluateReadings', () => {
  const res = evaluateReadings('Weights', [
    { nominal: 10, observed: 10.05 },
    { nominal: 20, observed: 20.10 },
    { nominal: 30, observed: 30.15 }
  ]);
  expect(res.pass).toBe(false);
  expect(res.details[0].pass).toBe(true);
  expect(res.details[1].pass).toBe(true);
  expect(res.details[2].pass).toBe(false);
});
