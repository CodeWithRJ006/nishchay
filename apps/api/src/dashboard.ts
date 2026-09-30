import { Router } from 'express';
import { prisma } from './db';
import { requiresGatc } from '@nishchay/shared';

export const dashboardRouter = Router();

dashboardRouter.get('/business', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const business = await prisma.business.findUnique({ where: { userId: user.userId } });
    if (!business) return res.json({ instruments: [], applications: [] });

    const instruments = await prisma.instrument.findMany({ where: { businessId: business.id } });
    const applications = await prisma.application.findMany({ 
      where: { businessId: business.id },
      include: { payment: true, receipt: true, certificate: true, instrument: true }
    });

    res.json({ instruments, applications });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/lmo', async (req, res, next) => {
  try {
    const user = (req as any).user;
    
    // For prototype, we'll just return all applications in their zone... wait, we need zone info.
    // Simpler: just return some stats and data.
    const pendingApps = await prisma.application.findMany({
      where: { status: 'SUBMITTED', routedToRole: 'LMO' },
      include: { instrument: true, business: true }
    });

    const acceptedJobs = await prisma.application.findMany({
      where: { status: 'ACCEPTED', appointment: { officerId: user.userId } },
      include: { instrument: true, business: true }
    });

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const todaysSchedule = await prisma.appointment.findMany({
      where: { officerId: user.userId, scheduledDate: { gte: todayStart, lte: todayEnd } },
      include: { application: { include: { business: true, instrument: true } } }
    });

    const history = await prisma.inspection.findMany({
      where: { officerId: user.userId },
      include: { application: { include: { business: true, instrument: true } } },
      take: 20,
      orderBy: { inspectedAt: 'desc' }
    });

    res.json({ pendingApps, acceptedJobs, todaysSchedule, history });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/gatc', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    
    // GATC sees GATC routed things
    const pendingApps = await prisma.application.findMany({
      where: { status: 'SUBMITTED', routedToRole: 'GATC' },
      include: { instrument: true, business: true }
    });

    const acceptedJobs = await prisma.application.findMany({
      where: { status: 'ACCEPTED', appointment: { officerId: user.userId } },
      include: { instrument: true, business: true }
    });

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const todaysSchedule = await prisma.appointment.findMany({
      where: { officerId: user.userId, scheduledDate: { gte: todayStart, lte: todayEnd } },
      include: { application: { include: { business: true, instrument: true } } }
    });

    const history = await prisma.inspection.findMany({
      where: { officerId: user.userId },
      include: { application: { include: { business: true, instrument: true } } },
      take: 20,
      orderBy: { inspectedAt: 'desc' }
    });

    res.json({ pendingApps, acceptedJobs, todaysSchedule, history, centreName: dbUser?.centreName || 'GATC Regional Centre' });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get('/admin', async (req, res, next) => {
  try {
    const states = await prisma.application.groupBy({
      by: ['status'],
      _count: true
    });

    const unassigned = await prisma.application.count({ where: { status: 'SUBMITTED' } });
    
    const feeGateBlocks = await prisma.auditLog.count({ where: { action: 'GATE_BLOCKED' } });
    
    const paymentsCount = await prisma.payment.count();

    const complaintsRaw = await prisma.complaint.findMany({
      include: { certificate: { include: { application: { include: { business: true } } } } }
    });

    res.json({
      states,
      unassigned,
      feeGateBlocks,
      paymentsCount,
      complaints: complaintsRaw
    });
  } catch (err) {
    next(err);
  }
});
