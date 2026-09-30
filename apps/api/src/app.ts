import express, { Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { instrumentsRouter } from './instruments';
import { uploadRouter } from './upload';
import { applicationsRouter } from './applications';
import { paymentsRouter } from './payments';
import { certificatesRouter, publicRouter } from './certificates';
import { searchRouter } from './search';
import { dashboardRouter } from './dashboard';
import { labRouter } from './lab';
import { authMiddleware, rbacMiddleware, checkPoliciesOnStartup } from './rbac';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cookieParser());

  app.use(pinoHttp({
    logger,
    genReqId: () => crypto.randomUUID(),
  }));

  app.use(express.json());

  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.headers['x-nishchay-csrf'] !== '1') {
        return res.status(403).json({ code: 'CSRF_FAILED', message: 'Missing CSRF header', requestId: req.id });
      }
    }
    next();
  });

  app.use(authMiddleware);
  
  // Health is manually checked here to allow skipping RBAC or we can add it to rbac
  app.use('/api/health', rbacMiddleware);
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      time: new Date().toISOString()
    });
  });

  app.get('/api/businesses/:businessId', rbacMiddleware, (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', rbacMiddleware, authRouter);
  app.use('/api/admin', rbacMiddleware, adminRouter);
  app.use('/api/instruments', rbacMiddleware, instrumentsRouter);
  app.use('/api/upload', rbacMiddleware, uploadRouter);
  app.use('/api/applications', rbacMiddleware, applicationsRouter);
  app.use('/api/payments', rbacMiddleware, paymentsRouter);
  app.use('/api/certificates', rbacMiddleware, certificatesRouter);
  app.use('/api/search', rbacMiddleware, searchRouter);
  app.use('/api/dashboard', rbacMiddleware, dashboardRouter);
  app.use('/api/admin/lab', rbacMiddleware, labRouter);
  app.use('/api/public', publicRouter);

  const registeredRoutes = [
    { method: 'GET', path: '/api/health' },
    { method: 'POST', path: '/api/auth/register' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/logout' },
    { method: 'GET', path: '/api/auth/me' },
    { method: 'GET', path: '/api/businesses/:businessId' },
    { method: 'POST', path: '/api/admin/lmo' },
    { method: 'POST', path: '/api/admin/gatc' },
    { method: 'GET', path: '/api/admin/payments' },
    { method: 'GET', path: '/api/admin/receipts' },
    { method: 'GET', path: '/api/admin/gate-blocks' },
    { method: 'POST', path: '/api/instruments' },
    { method: 'GET', path: '/api/instruments/:id' },
    { method: 'POST', path: '/api/upload' },
    { method: 'GET', path: '/api/upload/:filename' },
    { method: 'POST', path: '/api/applications' },
    { method: 'POST', path: '/api/applications/:id/simulate_payment' },
    { method: 'GET', path: '/api/applications/:id/slots' },
    { method: 'POST', path: '/api/applications/:id/schedule' },
    { method: 'POST', path: '/api/applications/:id/accept' },
    { method: 'POST', path: '/api/applications/:id/reject' },
    { method: 'GET', path: '/api/applications/:id/timeline' },
    { method: 'POST', path: '/api/payments/intent' },
    { method: 'POST', path: '/api/payments/callback' },
    { method: 'GET', path: '/api/certificates/:id' },
    { method: 'GET', path: '/api/certificates/:id/pdf' },
    { method: 'GET', path: '/api/certificates/:id/verify' },
    { method: 'POST', path: '/api/certificates/:id/revoke' },
    { method: 'POST', path: '/api/applications/:id/inspect' },
    { method: 'GET', path: '/api/search/certificates' },
    { method: 'GET', path: '/api/dashboard/business' },
    { method: 'GET', path: '/api/dashboard/lmo' },
    { method: 'GET', path: '/api/dashboard/gatc' },
    { method: 'GET', path: '/api/dashboard/admin' },
    { method: 'POST', path: '/api/admin/lab/tamper' },
    { method: 'POST', path: '/api/admin/lab/undo' }
  ];
  checkPoliciesOnStartup(registeredRoutes);

  if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
    const webDistPath = path.join(__dirname, '../../web/dist');
    app.use(express.static(webDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  app.use((err: Error & { status?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
    req.log.error(err);
    res.status(err.status || 500).json({
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      requestId: req.id
    });
  });

  return app;
}
