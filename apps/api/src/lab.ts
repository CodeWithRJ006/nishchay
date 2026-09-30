import { Router } from 'express';
import { prisma } from './db';

export const labRouter = Router();

// Store original payload in a simple way for the demo
// In a real app we'd need a more robust way, but here memory/db is fine.
// We'll just add a temporary table or use memory. Since it's a demo, memory map is enough.
const undoStack = new Map<string, string>();

labRouter.post('/tamper', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development' && process.env.VITE_DEMO_MODE !== 'true') {
      return res.status(403).json({ error: 'Lab tools only available in DEMO_MODE' });
    }
    
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

    const cert = await prisma.certificate.findUnique({ where: { publicId } });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    // Save for undo
    if (!undoStack.has(cert.id)) {
      undoStack.set(cert.id, cert.payload);
    }

    // Tamper payload
    const payload = JSON.parse(cert.payload);
    payload.validTo = new Date(Date.now() + 86400000 * 365).toISOString(); // extend validTo secretly
    
    await prisma.certificate.update({
      where: { id: cert.id },
      data: { payload: JSON.stringify(payload) } // Note: we DO NOT update sealHash or sealSignature, thus breaking it
    });

    res.json({ status: 'tampered' });
  } catch (err) {
    next(err);
  }
});

labRouter.post('/undo', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development' && process.env.VITE_DEMO_MODE !== 'true') {
      return res.status(403).json({ error: 'Lab tools only available in DEMO_MODE' });
    }

    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ error: 'Missing publicId' });

    const cert = await prisma.certificate.findUnique({ where: { publicId } });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });

    const originalPayload = undoStack.get(cert.id);
    if (!originalPayload) return res.status(400).json({ error: 'No undo history for this certificate' });

    await prisma.certificate.update({
      where: { id: cert.id },
      data: { payload: originalPayload }
    });

    undoStack.delete(cert.id);

    res.json({ status: 'restored' });
  } catch (err) {
    next(err);
  }
});
