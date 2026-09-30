import { prisma } from '../db';
import { InstrumentClassSchema, computeValidTo } from '@nishchay/shared';
import { buildRecord, hashRecord, signHash } from '@nishchay/shared';
import crypto from 'crypto';
import base32Encode from 'base32-encode';
import { checkIssueCertificatePreconditions } from './feeGate';

export async function issueCertificate(tx: any, applicationId: string) {
  // Check fee-gate preconditions
  const { isPassed, reasons } = await checkIssueCertificatePreconditions(applicationId, tx);
  if (!isPassed) {
    throw new Error('Preconditions failed: ' + reasons.join(', '));
  }

  const app = await tx.application.findUnique({
    where: { id: applicationId },
    include: {
      instrument: { include: { business: true } },
      receipt: true,
      appointment: true,
      inspection: { include: { photos: true } }
    }
  });

  if (!app) throw new Error('Application not found');
  if (!app.instrument) throw new Error('Instrument not found');
  if (!app.appointment) throw new Error('No appointment found');
  if (!app.inspection || !app.inspection.pass) throw new Error('Inspection has not passed');

  const officer = await tx.user.findUnique({ where: { id: app.appointment.officerId } });
  if (!officer) throw new Error('Officer not found');

  const now = new Date();
  
  // Calculate validTo
  const validToMs = computeValidTo(app.instrument.instrumentClass as any, app.inspection.inspectedAt.getTime());
  const validTo = new Date(validToMs);

  // Construct RecordPayload
  const payload = {
    schemaVersion: 1,
    applicationId: app.id,
    instrumentId: app.instrument.id,
    issuerType: officer.role as 'LMO' | 'GATC',
    issuerId: officer.id,
    inspectedAt: app.inspection.inspectedAt.toISOString(),
    gps: {
      lat: app.inspection.lat || 0,
      lng: app.inspection.lng || 0,
      accuracyM: app.inspection.accuracy || 0,
      source: app.inspection.locationSource || 'demo'
    },
    distanceFromPremisesM: app.inspection.distanceFromPremisesM || 0,
    checklist: JSON.parse(app.inspection.checklist),
    readings: JSON.parse(app.inspection.readings).map((r: any) => r.observed),
    photos: app.inspection.photos.map((p: any) => ({
      sha256: p.sha256,
      capturedAt: p.capturedAt.toISOString(),
      source: p.source as 'camera' | 'demo'
    })),
    receiptNo: app.receipt.id,
    feePaidAt: app.receipt.createdAt.toISOString(),
    rulesVersion: 'v1',
    validFrom: now.toISOString(),
    validTo: validTo.toISOString()
  };

  const record = buildRecord(payload as any);
  const hash = hashRecord(record);
  const sig = signHash(hash);

  const certId = `CERT-${now.getFullYear().toString().slice(-2)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  
  const random128 = crypto.randomBytes(16);
  const publicId = base32Encode(random128, 'RFC4648', { padding: false }).toLowerCase();

  const certificate = await tx.certificate.create({
    data: {
      id: certId,
      applicationId: app.id,
      receiptId: app.receipt.id,
      payload: JSON.stringify(record),
      sealHash: hash,
      sealSignature: sig.signature,
      keyId: sig.keyId,
      publicId,
      issueDate: now,
      validTo: validTo,
      status: 'VALID'
    }
  });

  return certificate;
}
