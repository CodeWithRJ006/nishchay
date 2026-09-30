import { expect, test } from 'vitest';
import { RecordPayload, buildRecord, hashRecord, signHash, verifySeal, initializeKeys, getPublicKeyData } from './seal';

initializeKeys();

const baseRecord: RecordPayload = {
  schemaVersion: 1,
  applicationId: 'APP1',
  instrumentId: 'INST1',
  issuerType: 'LMO',
  issuerId: 'LMO1',
  inspectedAt: '2026-09-29T10:00:00Z',
  gps: { lat: 10, lng: 20, accuracyM: 5, source: 'demo' },
  distanceFromPremisesM: 10,
  checklist: { a: true },
  readings: [0.1],
  photos: [],
  receiptNo: 'REC1',
  feePaidAt: '2026-09-29T09:00:00Z',
  rulesVersion: '1',
  validFrom: '2026-09-29T10:00:00Z',
  validTo: '2028-09-29T10:00:00Z'
};

test('changing single field alters hash', () => {
  const h1 = hashRecord(baseRecord);
  const h2 = hashRecord({ ...baseRecord, applicationId: 'APP2' });
  expect(h1).not.toBe(h2);
});

test('verifySeal fails for altered record', () => {
  const { signature } = signHash(hashRecord(baseRecord));
  const pk = getPublicKeyData();
  expect(verifySeal(baseRecord, signature, pk)).toBe(true);
  
  const altered = { ...baseRecord, instrumentId: 'HACKED' };
  expect(verifySeal(altered, signature, pk)).toBe(false);
});

test('verifySeal fails for altered signature', () => {
  const { signature } = signHash(hashRecord(baseRecord));
  const pk = getPublicKeyData();
  const hackedSig = signature.substring(0, signature.length - 2) + 'AA';
  expect(verifySeal(baseRecord, hackedSig, pk)).toBe(false);
});

import fs from 'fs';
import path from 'path';
test('buildRecord and initializeKeys coverage', () => {
  expect(buildRecord(baseRecord)).toEqual(baseRecord);
  const keysPath = path.join(process.cwd(), '.keys');
  fs.rmSync(keysPath, { recursive: true, force: true });
  initializeKeys();
  expect(fs.existsSync(keysPath)).toBe(true);
});
