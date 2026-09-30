import { Router } from 'express';
import { prisma } from './db';
import { getPublicKeyData, verifySeal, hashRecord } from '@nishchay/shared';
import { generateCertificatePDF } from './services/pdf';

export const certificatesRouter = Router();
export const publicRouter = Router();

publicRouter.get('/keys', (req, res) => {
  res.json({ publicKey: getPublicKeyData() });
});

publicRouter.get('/verify/:publicId', async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { publicId: req.params.publicId }
    });
    
    if (!cert) {
      // constant-shape response for unknown ids
      return res.status(404).json({
        isValid: false,
        status: 'NOT_FOUND',
        message: 'Seal broken or not found.'
      });
    }

    const payload = JSON.parse(cert.payload);
    const pubKey = getPublicKeyData();
    const isIntegrityValid = verifySeal(payload, cert.sealSignature, pubKey);
    const hash = hashRecord(payload);

    if (!isIntegrityValid || hash !== cert.sealHash) {
      return res.json({
        isValid: false,
        status: 'ALTERED',
        message: 'Seal broken. This record was altered after inspection.'
      });
    }

    if (cert.status === 'REVOKED') {
      return res.json({
        isValid: false,
        status: 'REVOKED',
        message: 'This certificate has been revoked.'
      });
    }

    if (new Date() > new Date(cert.validTo)) {
      return res.json({
        isValid: false,
        status: 'EXPIRED',
        message: 'This certificate has expired.'
      });
    }

    res.json({
      isValid: true,
      status: 'VALID',
      certificate: {
        id: cert.id,
        validTo: cert.validTo,
        receiptNo: payload.receiptNo,
        businessName: 'Business Name', // Mock since it's not in payload
        instrumentId: payload.instrumentId
      }
    });
  } catch (err) {
    next(err);
  }
});

// Mock rate limiting (in memory for prototype)
const complaintRateLimit = new Map<string, number>();

publicRouter.post('/complaints', async (req, res, next) => {
  try {
    const { certificateId, category, details, _honeypot } = req.body;
    
    if (_honeypot) {
      return res.status(400).json({ error: 'Invalid submission' });
    }

    if (!certificateId || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Rate limit check
    // Real implementation would hash IP + daily salt
    const clientIp = req.ip || '127.0.0.1';
    const salt = new Date().toISOString().split('T')[0];
    const clientHash = hashRecord({ ip: clientIp, salt });
    
    const count = complaintRateLimit.get(clientHash) || 0;
    if (count >= 5) {
      return res.status(429).json({ error: 'Too many complaints from this device today' });
    }
    complaintRateLimit.set(clientHash, count + 1);

    const cert = await prisma.certificate.findUnique({ where: { id: certificateId }});
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    const complaint = await prisma.complaint.create({
      data: {
        certificateId,
        category,
        details: details ? String(details).substring(0, 300) : ''
      }
    });

    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
});

certificatesRouter.get('/:id/verify', async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id }
    });
    if (!cert) return res.status(404).json({ error: 'Not found' });

    const pubKey = getPublicKeyData();
    const isValid = verifySeal(JSON.parse(cert.payload), cert.sealSignature, pubKey) && cert.status !== 'REVOKED';

    res.json({ isValid, status: cert.status });
  } catch (err) {
    next(err);
  }
});

certificatesRouter.get('/:id', async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id }
    });

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json(cert);
  } catch (err) {
    next(err);
  }
});

certificatesRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id }
    });

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
    const pdfBytes = await generateCertificatePDF(cert, publicBaseUrl);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${cert.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    next(err);
  }
});

certificatesRouter.post('/:id/revoke', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason required' });

    const cert = await prisma.certificate.update({
      where: { id: req.params.id },
      data: { status: 'REVOKED' }
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.userId,
        action: 'revoke_certificate',
        entity: 'Certificate',
        entityId: cert.id,
        afterSummary: reason
      }
    });

    res.json(cert);
  } catch (err) {
    next(err);
  }
});
