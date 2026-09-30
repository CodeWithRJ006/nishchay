import { expect, test } from 'vitest';
import fc from 'fast-check';
import { canonicalJson } from './canonical';

test('canonicalJson handles arbitrary JSON values consistently', () => {
  fc.assert(
    fc.property(fc.jsonValue(), (obj) => {
      const shuffle = (val: any): any => {
        if (Array.isArray(val)) return val.map(shuffle);
        if (val !== null && typeof val === 'object') {
          const keys = Object.keys(val).sort(() => Math.random() - 0.5);
          const res: any = {};
          for (const k of keys) res[k] = shuffle(val[k]);
          return res;
        }
        return val;
      };
      
      const shuffled = shuffle(obj);
      expect(canonicalJson(obj)).toBe(canonicalJson(shuffled));
    })
  );
});

test('canonicalJson rejects non-finite numbers', () => {
  expect(() => canonicalJson(NaN)).toThrow();
  expect(() => canonicalJson(Infinity)).toThrow();
  expect(() => canonicalJson(-Infinity)).toThrow();
});

test('canonicalJson rejects undefined', () => {
  expect(() => canonicalJson(undefined)).toThrow();
  expect(() => canonicalJson({ a: undefined })).not.toThrow();
});
