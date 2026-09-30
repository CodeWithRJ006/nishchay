import { expect, test } from 'vitest';
import { clock } from './clock';

test('clock returns current time', () => {
  const now = clock.now();
  expect(now).toBeGreaterThan(0);
});

test('clock can be mocked', () => {
  const tClock = clock.setTestClock(1000);
  expect(clock.now()).toBe(1000);
  tClock.advance(500);
  expect(clock.now()).toBe(1500);
  tClock.setTime(2000);
  expect(clock.now()).toBe(2000);
  clock.reset();
  expect(clock.now()).not.toBe(2000);
});
