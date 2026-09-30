import { Router } from 'express';
import { prisma, withTransaction } from './db';
import { transition, computeFee, requiresGatc, instrumentRules, InstrumentClass, clock } from '@nishchay/shared';
import { randomUUID, randomBytes } from 'crypto';
import { canViewApplication } from './rbac';
import { issueCertificate } from './services/certificate';

export const applicationsRouter = Router();

applicationsRouter.get('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.role === 'BUSINESS') {
      const business = await prisma.business.findUnique({ where: { userId: user.userId } });
      if (!business) return res.json([]);
      const apps = await prisma.application.findMany({
        where: { businessId: business.id },
        include: { instrument: true, appointment: true }
      });
      return res.json(apps);
    } else if (user.role === 'LMO' || user.role === 'GATC') {
      const apps = await prisma.application.findMany({
        where: { appointment: { officerId: user.userId } },
        include: { instrument: true, business: true, appointment: true }
      });
      return res.json(apps);
    } else {
      return res.json([]);
    }
  } catch (err) {
    next(err);
  }
});

// Create application
applicationsRouter.post('/', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'BUSINESS') return res.status(403).json({ error: 'Only business can create application' });

    const business = await prisma.business.findUnique({ where: { userId: user.userId } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const { instrumentId } = req.body;
    const instrument = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!instrument || instrument.businessId !== business.id) return res.status(404).json({ error: 'Instrument not found' });

    const instrClass = instrument.instrumentClass as InstrumentClass;
    if (!instrumentRules[instrClass]) {
      return res.status(400).json({ error: 'Invalid instrument class' });
    }

    const feeSnapshot = computeFee(instrClass);
    const isGatc = requiresGatc(instrClass);
    const routedToRole = isGatc ? 'GATC' : 'LMO';
    const routingReason = `Routed to ${routedToRole}: ${instrumentRules[instrClass].label}`;
    
    // Check if there is already an active application
    const activeApp = await prisma.application.findFirst({
      where: {
        instrumentId,
        status: { notIn: ['CERTIFIED', 'CANCELLED', 'FAILED'] }
      }
    });
    if (activeApp) return res.status(400).json({ error: 'Active application already exists for this instrument' });

    const appId = `APP-${randomBytes(4).toString('hex').toUpperCase()}`;
    const nextState = transition('DRAFT', { type: 'submit' });
    if (nextState instanceof Error) return res.status(400).json({ error: nextState.message });

    const application = await withTransaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          id: appId,
          businessId: business.id,
          instrumentId,
          type: 'NEW',
          status: nextState,
          feeSnapshot,
          routedToRole,
          routingReason
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'submit',
          entity: 'Application',
          entityId: app.id,
          beforeSummary: 'DRAFT',
          afterSummary: nextState
        }
      });
      return app;
    });

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

// For testing purposes: Simulate payment success
applicationsRouter.post('/:id/simulate_payment', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!await canViewApplication(req)) return res.status(403).json({ error: 'Forbidden' });

    const app = await prisma.application.findUnique({ where: { id: req.params.id }, include: { business: true } });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const nextState = transition(app.status as any, { type: 'payment_succeeded' });
    if (nextState instanceof Error) return res.status(400).json({ error: nextState.message });

    const updatedApp = await withTransaction(async (tx) => {
      const uApp = await tx.application.update({
        where: { id: app.id },
        data: { status: nextState }
      });
      const payment = await tx.payment.create({
        data: {
          applicationId: app.id,
          amount: app.feeSnapshot ?? 0,
          status: 'SUCCESS',
          idempotencyKey: randomUUID()
        }
      });
      const receiptNo = `NSH-R-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
      await tx.receipt.create({
        data: {
          id: receiptNo,
          applicationId: app.id,
          paymentId: payment.id,
          signature: 'MOCK_SIG'
        }
      });
      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'payment_succeeded',
          entity: 'Application',
          entityId: app.id,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });
      return uApp;
    });

    res.json(updatedApp);
  } catch (err) {
    next(err);
  }
});

function getNextWorkingDays(daysCount: number): string[] {
  const dates: string[] = [];
  let d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  
  while (dates.length < daysCount) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) { // skip Sunday
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  return dates;
}

// Get slots
applicationsRouter.get('/:id/slots', async (req, res, next) => {
  try {
    if (!await canViewApplication(req)) return res.status(403).json({ error: 'Forbidden' });
    // Returns available dates
    const dates = getNextWorkingDays(10);
    res.json({ slots: dates });
  } catch (err) {
    next(err);
  }
});

// Schedule
applicationsRouter.post('/:id/schedule', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!await canViewApplication(req)) return res.status(403).json({ error: 'Forbidden' });

    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const app = await prisma.application.findUnique({ 
      where: { id: req.params.id },
      include: { business: true }
    });
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const nextState = transition(app.status as any, { type: 'schedule' });
    if (nextState instanceof Error) return res.status(400).json({ error: nextState.message });

    // Auto-assign logic
    // Find all officers of the required role in the business's zone
    const officers = await prisma.user.findMany({
      where: {
        role: app.routedToRole as string,
        zones: { some: { id: app.business.zoneId } }
      },
      include: {
        inspections: {
          where: { inspectedAt: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) } }
        }
      }
    });

    if (officers.length === 0) {
      return res.status(400).json({ error: 'No officers available in your zone' });
    }

    // Pick officer with least inspections on that date
    let selectedOfficer = officers[0];
    for (const officer of officers) {
      if (officer.inspections.length < selectedOfficer.inspections.length) {
        selectedOfficer = officer;
      }
    }

    const scheduledDate = new Date(date);

    const updatedApp = await withTransaction(async (tx) => {
      // Create appointment
      await tx.appointment.create({
        data: {
          applicationId: app.id,
          officerId: selectedOfficer.id,
          scheduledDate
        }
      });

      const uApp = await tx.application.update({
        where: { id: app.id },
        data: { status: nextState }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'schedule',
          entity: 'Application',
          entityId: app.id,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });
      return uApp;
    });

    res.json(updatedApp);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique constraint failed on the constraint: `Appointment_applicationId_key`')) {
      return res.status(409).json({ error: 'Already scheduled' });
    }
    next(err);
  }
});

// Officer Accept
applicationsRouter.post('/:id/accept', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const app = await prisma.application.findUnique({ 
      where: { id: req.params.id },
      include: { appointment: true }
    });
    if (!app || !app.appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (app.appointment.officerId !== user.userId) return res.status(403).json({ error: 'Not assigned to you' });

    const nextState = transition(app.status as any, { type: 'officer_accept' });
    if (nextState instanceof Error) return res.status(400).json({ error: nextState.message });

    const updatedApp = await withTransaction(async (tx) => {
      await tx.appointment.update({
        where: { id: app.appointment!.id },
        data: { status: 'ACCEPTED' }
      });
      
      const uApp = await tx.application.update({
        where: { id: app.id },
        data: { status: nextState }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'officer_accept',
          entity: 'Application',
          entityId: app.id,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });
      return uApp;
    });

    res.json(updatedApp);
  } catch (err) {
    next(err);
  }
});

// Officer Reject
applicationsRouter.post('/:id/reject', async (req, res, next) => {
  try {
    const user = (req as any).user;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reject reason is required' });

    const app = await prisma.application.findUnique({ 
      where: { id: req.params.id },
      include: { appointment: true }
    });
    if (!app || !app.appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (app.appointment.officerId !== user.userId) return res.status(403).json({ error: 'Not assigned to you' });

    const nextState = transition(app.status as any, { type: 'officer_reject', reason });
    if (nextState instanceof Error) return res.status(400).json({ error: nextState.message });

    const updatedApp = await withTransaction(async (tx) => {
      await tx.appointment.update({
        where: { id: app.appointment!.id },
        data: { status: 'REJECTED', rejectReason: reason }
      });
      
      // Delete the appointment so business can reschedule? Or keep it and business creates new one?
      // Since it's 1:1, we should delete the appointment so business can create a new one!
      await tx.appointment.delete({
        where: { id: app.appointment!.id }
      });
      
      const uApp = await tx.application.update({
        where: { id: app.id },
        data: { status: nextState }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: 'officer_reject',
          entity: 'Application',
          entityId: app.id,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });
      return uApp;
    });

    res.json(updatedApp);
  } catch (err) {
    next(err);
  }
});

// Timeline (AuditLog)
applicationsRouter.get('/:id/timeline', async (req, res, next) => {
  try {
    if (!await canViewApplication(req)) return res.status(403).json({ error: 'Forbidden' });
    const logs = await prisma.auditLog.findMany({
      where: { entity: 'Application', entityId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

applicationsRouter.post('/:id/inspect', async (req, res, next) => {
  try {
    const { pass, checklist, readings, reasons, photos } = req.body;
    const appId = req.params.id;
    const user = (req as any).user;

    const app = await prisma.application.findUnique({
      where: { id: appId },
      include: { appointment: true }
    });

    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status !== 'ACCEPTED') return res.status(400).json({ error: 'Application not in ACCEPTED state' });
    if (!app.appointment || app.appointment.officerId !== user.userId) return res.status(403).json({ error: 'Not assigned to you' });

    if (!pass && (!reasons || reasons.length === 0)) {
      return res.status(400).json({ error: 'Reasons are required for failure' });
    }

    const eventPayload: any = pass ? { type: 'inspection_pass' } : { type: 'inspection_fail', reasons };
    const nextState = transition(app.status as any, eventPayload);
    if (nextState instanceof Error) {
      return res.status(400).json({ error: 'Invalid state transition' });
    }

    const result = await withTransaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          applicationId: appId,
          officerId: user.userId,
          pass,
          inspectedAt: new Date(clock.now()),
          checklist: JSON.stringify(checklist),
          readings: JSON.stringify(readings),
          reasons: pass ? null : JSON.stringify(reasons),
          photos: {
            create: (photos || []).map((p: any) => ({
              sha256: p.sha256,
              capturedAt: new Date(p.capturedAt),
              source: p.source,
              fileUrl: p.fileUrl
            }))
          }
        }
      });

      await tx.application.update({
        where: { id: appId },
        data: { status: nextState }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.userId,
          action: pass ? 'inspection_pass' : 'inspection_fail',
          entity: 'Application',
          entityId: appId,
          beforeSummary: app.status,
          afterSummary: nextState
        }
      });

      if (pass) {
        await issueCertificate(tx, appId);
      }

      return { status: 'success', inspectionId: inspection.id };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

