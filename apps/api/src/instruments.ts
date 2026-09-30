import { Router } from 'express';
import { prisma } from './db';
import { randomBytes } from 'crypto';

export const instrumentsRouter = Router();

instrumentsRouter.post('/', async (req, res, next) => {
  try {
    const { serialNumber, instrumentClass, make, model, capacity, accuracyClass, location, documents } = req.body;
    
    const user = (req as any).user;
    const business = await prisma.business.findUnique({ where: { userId: user.userId } });
    
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const existing = await prisma.instrument.findUnique({
      where: {
        businessId_serialNumber: {
          businessId: business.id,
          serialNumber
        }
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'Duplicate serial number for this business' });
    }

    const id = `INST-${randomBytes(4).toString('hex').toUpperCase()}`;

    const docCreate = (documents || []).map((doc: any) => ({
      type: doc.type,
      fileUrl: doc.fileUrl,
      sha256: doc.sha256
    }));

    const instrument = await prisma.instrument.create({
      data: {
        id,
        businessId: business.id,
        serialNumber,
        instrumentClass,
        make,
        model,
        capacity,
        accuracyClass,
        location,
        documents: {
          create: docCreate
        }
      },
      include: { documents: true }
    });

    res.status(201).json({ status: 'success', instrument });
  } catch (err) {
    next(err);
  }
});

instrumentsRouter.get('/:id', async (req, res, next) => {
  try {
    const instrument = await prisma.instrument.findUnique({
      where: { id: req.params.id },
      include: {
        business: true,
        documents: true,
        applications: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!instrument) return res.status(404).json({ message: 'Not found' });
    
    res.json({ instrument });
  } catch (err) {
    next(err);
  }
});
