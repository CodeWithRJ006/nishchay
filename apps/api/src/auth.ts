import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { clock } from '@nishchay/shared';
import rateLimit from 'express-rate-limit';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 'RATE_LIMIT', message: 'Too many login attempts' }
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, tradeName, ownerName, businessType, address, phone, lat, lng, zoneId } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const actualZoneId = zoneId || 'sandbox-zone';
    if (!zoneId) {
      await prisma.zone.upsert({
        where: { name: 'Sandbox Zone' },
        update: {},
        create: { id: 'sandbox-zone', name: 'Sandbox Zone' }
      });
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'BUSINESS'
        }
      });
      await tx.business.create({
        data: {
          userId: user.id,
          tradeName,
          ownerName,
          businessType,
          address,
          phone,
          email,
          lat,
          lng,
          zoneId: actualZoneId
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'REGISTER',
          entity: 'User',
          entityId: user.id
        }
      });
    });
    
    res.status(201).json({ status: 'success', message: 'Simulated Sandbox OTP verified.' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    const now = clock.now();
    
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }
    
    if (user.lockoutUntil && user.lockoutUntil.getTime() > now) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Account locked' });
    }
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      let lockoutUntil = null;
      if (attempts >= 5) {
        lockoutUntil = new Date(now + 15 * 60 * 1000);
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: attempts, lockoutUntil }
      });
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockoutUntil: null }
    });
    
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'dev', { expiresIn: '8h' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 3600000
    });
    
    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ status: 'success' });
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.userId },
      select: { id: true, email: true, name: true, role: true }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});
