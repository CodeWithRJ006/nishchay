import { canonicalJson } from './canonical';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RecordPayload {
  schemaVersion: number;
  applicationId: string;
  instrumentId: string;
  issuerType: 'LMO' | 'GATC';
  issuerId: string;
  inspectedAt: string;
  gps: {
    lat: number;
    lng: number;
    accuracyM: number;
    source: 'device' | 'demo';
  };
  distanceFromPremisesM: number;
  checklist: Record<string, boolean>;
  readings: number[];
  photos: Array<{
    sha256: string;
    capturedAt: string;
    source: 'camera' | 'demo';
  }>;
  receiptNo: string;
  feePaidAt: string;
  rulesVersion: string;
  validFrom: string;
  validTo: string;
}

export function buildRecord(payload: RecordPayload): RecordPayload {
  return payload;
}

export function hashRecord(record: RecordPayload): string {
  const json = canonicalJson(record);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

let privateKeyData: string | undefined;
let publicKeyData: string | undefined;
let activeKeyId: string | undefined;

function getKeysPath() {
  return path.join(process.cwd(), '.keys');
}

export function initializeKeys() {
  const keysPath = getKeysPath();
  if (!fs.existsSync(keysPath)) {
    fs.mkdirSync(keysPath, { recursive: true });
  }

  const privPath = path.join(keysPath, 'private.pem');
  const pubPath = path.join(keysPath, 'public.pem');

  if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    fs.writeFileSync(privPath, privateKey);
    fs.writeFileSync(pubPath, publicKey);
  }

  privateKeyData = fs.readFileSync(privPath, 'utf8');
  publicKeyData = fs.readFileSync(pubPath, 'utf8');
  activeKeyId = crypto.createHash('sha256').update(publicKeyData).digest('hex').substring(0, 8);
}

export function getPublicKeyData() {
  if (!publicKeyData) initializeKeys();
  return publicKeyData!;
}

export function signHash(hash: string): { signature: string; keyId: string } {
  if (!privateKeyData) initializeKeys();
  const sign = crypto.createSign('SHA256');
  sign.update(`nishchay-seal-v1:${hash}`, 'utf8');
  sign.end();
  const signature = sign.sign(privateKeyData!, 'base64');
  return { signature, keyId: activeKeyId! };
}

export function verifySeal(record: RecordPayload, signature: string, providedPublicKey: string): boolean {
  const hash = hashRecord(record);
  const verify = crypto.createVerify('SHA256');
  verify.update(`nishchay-seal-v1:${hash}`, 'utf8');
  verify.end();
  try {
    return verify.verify(providedPublicKey, signature, 'base64');
  } catch {
    return false;
  }
}
