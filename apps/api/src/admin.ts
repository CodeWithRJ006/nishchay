import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const adminRouter = Router();

adminRouter.post('/lmo', async (req, res, next) => {
  try {
    const { email, password, name, zoneIds, dailyCapacity } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'LMO',
        dailyCapacity,
        zones: {
          connect: zoneIds.map((id: string) => ({ id }))
        }
      }
    });

    res.status(201).json({ status: 'success', id: user.id });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/gatc', async (req, res, next) => {
  try {
    const { email, password, name, zoneIds, centreName } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'GATC',
        centreName,
        zones: {
          connect: zoneIds.map((id: string) => ({ id }))
        }
      }
    });

    res.status(201).json({ status: 'success', id: user.id });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/payments', async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/receipts', async (req, res, next) => {
  try {
    const receipts = await prisma.receipt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(receipts);
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/gate-blocks', async (req, res, next) => {
  try {
    const blocksCount = await prisma.auditLog.count({
      where: { action: 'GATE_BLOCKED' }
    });
    res.json({ blocks: blocksCount });
  } catch (err) {
    next(err);
  }
});
