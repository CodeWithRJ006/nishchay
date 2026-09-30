import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'BUSINESS' | 'LMO' | 'GATC' | 'ADMIN' | 'PUBLIC';

export interface RoutePolicy {
  method: string;
  path: string;
  roles: Role[];
  objectPolicy?: (req: Request) => Promise<boolean>;
}

export const routes: RoutePolicy[] = [
  { method: 'POST', path: '/api/auth/register', roles: ['PUBLIC'] },
  { method: 'POST', path: '/api/auth/login', roles: ['PUBLIC'] },
  { method: 'POST', path: '/api/auth/logout', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/auth/me', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/health', roles: ['PUBLIC', 'BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/businesses/:businessId', roles: ['BUSINESS'], objectPolicy: ownsBusiness },
  { method: 'POST', path: '/api/admin/lmo', roles: ['ADMIN'] },
  { method: 'POST', path: '/api/admin/gatc', roles: ['ADMIN'] },
  { method: 'POST', path: '/api/instruments', roles: ['BUSINESS'] },
  { method: 'GET', path: '/api/instruments/:id', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'], objectPolicy: canViewInstrument },
  { method: 'POST', path: '/api/upload', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/upload/:filename', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/applications', roles: ['BUSINESS', 'LMO', 'GATC'] },
  { method: 'POST', path: '/api/applications', roles: ['BUSINESS'] },
  { method: 'POST', path: '/api/applications/:id/simulate_payment', roles: ['BUSINESS'], objectPolicy: canViewApplication },
  { method: 'GET', path: '/api/applications/:id/slots', roles: ['BUSINESS'], objectPolicy: canViewApplication },
  { method: 'POST', path: '/api/applications/:id/schedule', roles: ['BUSINESS'], objectPolicy: canViewApplication },
  { method: 'POST', path: '/api/applications/:id/accept', roles: ['LMO', 'GATC'] },
  { method: 'POST', path: '/api/applications/:id/reject', roles: ['LMO', 'GATC'] },
  { method: 'POST', path: '/api/applications/:id/inspect', roles: ['LMO', 'GATC'] },
  { method: 'GET', path: '/api/admin/payments', roles: ['ADMIN'] },
  { method: 'GET', path: '/api/admin/receipts', roles: ['ADMIN'] },
  { method: 'GET', path: '/api/admin/gate-blocks', roles: ['ADMIN'] },
  { method: 'GET', path: '/api/applications/:id/timeline', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'], objectPolicy: canViewApplication },
  { method: 'POST', path: '/api/payments/intent', roles: ['BUSINESS'] },
  { method: 'POST', path: '/api/payments/callback', roles: ['PUBLIC'] },
  { method: 'GET', path: '/api/certificates/:id', roles: ['PUBLIC', 'BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/certificates/:id/pdf', roles: ['PUBLIC', 'BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/certificates/:id/verify', roles: ['PUBLIC', 'BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'POST', path: '/api/certificates/:id/revoke', roles: ['ADMIN'] },
  { method: 'GET', path: '/api/search/certificates', roles: ['BUSINESS', 'LMO', 'GATC', 'ADMIN'] },
  { method: 'GET', path: '/api/dashboard/business', roles: ['BUSINESS'] },
  { method: 'GET', path: '/api/dashboard/lmo', roles: ['LMO'] },
  { method: 'GET', path: '/api/dashboard/gatc', roles: ['GATC'] },
  { method: 'GET', path: '/api/dashboard/admin', roles: ['ADMIN'] },
  { method: 'POST', path: '/api/admin/lab/tamper', roles: ['ADMIN'] },
  { method: 'POST', path: '/api/admin/lab/undo', roles: ['ADMIN'] }
];

export function checkPoliciesOnStartup(registeredRoutes: {method: string, path: string}[]) {
  for (const rr of registeredRoutes) {
    const policy = routes.find(r => {
      if (r.method !== rr.method) return false;
      const regexPath = r.path.replace(/:[^\/]+/g, '[^/]+');
      const regex = new RegExp(`^${regexPath}$`);
      return regex.test(rr.path.replace(/:[^\/]+/g, 'test'));
    });
    if (!policy) {
      throw new Error(`Startup failed: Route ${rr.method} ${rr.path} lacks a security policy`);
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev');
      (req as any).user = decoded;
    } catch (e) {
      // invalid token
    }
  }
  next();
}

export function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  const fullPath = (req.baseUrl + req.path).replace(/\/$/, '');
  const policy = routes.find(r => {
    if (r.method !== req.method) return false;
    const regexPath = r.path.replace(/:[^\/]+/g, '[^/]+');
    const regex = new RegExp(`^${regexPath}$`);
    return regex.test(fullPath);
  });
  if (!policy) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Deny by default', requestId: req.id });
  }
  
  if (policy.roles.includes('PUBLIC')) {
    return next();
  }
  
  const userRole = (req as any).user?.role;
  if (!userRole || !policy.roles.includes(userRole)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient role', requestId: req.id });
  }
  
  if (policy.objectPolicy) {
    policy.objectPolicy(req).then(allowed => {
      if (allowed) next();
      else res.status(403).json({ code: 'FORBIDDEN', message: 'Object access denied', requestId: req.id });
    }).catch(err => next(err));
    return;
  }
  
  next();
}

import { prisma } from './db';

export async function ownsBusiness(req: Request) {
  const user = (req as any).user;
  if (!user || user.role !== 'BUSINESS') return false;
  const businessId = req.path.split('/').pop();
  if (!businessId) return false;
  const business = await prisma.business.findUnique({ where: { userId: user.userId } });
  return business?.id === businessId;
};

export async function canViewInstrument(req: Request) {
  const user = (req as any).user;
  if (!user) return false;
  if (['ADMIN', 'LMO', 'GATC'].includes(user.role)) return true;
  const id = req.path.split('/').pop();
  if (!id) return false;
  const instrument = await prisma.instrument.findUnique({ where: { id }, include: { business: true }});
  return instrument?.business?.userId === user.userId;
};

export async function canViewApplication(req: Request) {
  const user = (req as any).user;
  if (!user) return false;
  if (['ADMIN', 'LMO', 'GATC'].includes(user.role)) return true;
  // Extracts the ID from paths like /api/applications/APP-123 or /api/applications/APP-123/schedule
  const fullPath = req.baseUrl + req.path;
  const match = fullPath.match(/\/api\/applications\/([^\/]+)/);
  if (!match || !match[1]) return false;
  const id = match[1];
  const app = await prisma.application.findUnique({ where: { id }});
  if (!app) return false;
  const business = await prisma.business.findUnique({ where: { userId: user.userId }});
  return app.businessId === business?.id;
}
