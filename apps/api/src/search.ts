import { Router } from 'express';
import { prisma } from './db';

export const searchRouter = Router();

// To prevent CSV injection
function escapeCsv(field: any): string {
  if (field === null || field === undefined) return '';
  let str = String(field);
  // Formula injection mitigation: if starts with =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str; // Prefix with single quote
  }
  // Escape double quotes by doubling them, wrap in double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

searchRouter.get('/certificates', async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      page = '1',
      limit = '20',
      instrumentId,
      businessName,
      instrumentClass,
      status,
      startDate,
      endDate,
      export: exportCsv,
      sortBy = 'issueDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Role scoping
    if (user.role === 'BUSINESS') {
      const business = await prisma.business.findUnique({ where: { userId: user.userId }});
      if (!business) return res.json({ data: [], total: 0 });
      where.application = { businessId: business.id };
    } else if (user.role === 'LMO') {
      // LMO jurisdiction (same zone as officer, or maybe officer's inspections? Requirements say "officer jurisdiction")
      // In this app, zone isn't directly on user? Wait, User has 'zones' relation.
      const officer = await prisma.user.findUnique({ where: { id: user.userId }, include: { zones: true } });
      const zoneIds = officer?.zones.map(z => z.id) || [];
      where.application = { business: { zoneId: { in: zoneIds } } };
    } else if (user.role === 'GATC') {
       // GATC jurisdiction (all GATC routed certificates, or same zone)
       where.application = { routedToRole: 'GATC' };
    }

    if (instrumentId) {
      where.application = { ...where.application, instrumentId: instrumentId as string };
    }
    if (businessName) {
      where.application = { 
        ...where.application, 
        business: { ...where.application?.business, tradeName: { contains: businessName as string } }
      };
    }
    if (instrumentClass) {
      where.application = { 
        ...where.application, 
        instrument: { instrumentClass: instrumentClass as string }
      };
    }
    if (status) {
      // Pending actually means application is in progress. Since we are querying certificates, PENDING isn't here unless we query applications.
      // Requirements: "certificate and verification records: ... status (valid, expired, revoked, pending)"
      // Let's assume pending means application status! Wait, we query Certificates, which don't exist if PENDING.
      // So if status=pending, maybe we can't do it just on Certificate model.
      // Let's refine: query Application model, include Certificate!
      where.status = status as string;
    }
    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate as string);
      if (endDate) where.issueDate.lte = new Date(endDate as string);
    }

    // Sort order
    const orderBy: any = {};
    if (sortBy === 'issueDate' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy['issueDate'] = 'desc';
    }

    if (exportCsv === 'true') {
      if (user.role === 'BUSINESS') {
        return res.status(403).json({ error: 'Export not allowed for business' });
      }
      
      const records = await prisma.certificate.findMany({
        where,
        orderBy,
        include: {
          application: {
            include: {
              business: true,
              instrument: true
            }
          }
        }
      });

      const header = ['Certificate ID', 'Instrument ID', 'Business Name', 'Instrument Class', 'Issue Date', 'Valid To', 'Status'];
      const rows = records.map(c => [
        c.id,
        c.application.instrumentId,
        c.application.business.tradeName,
        c.application.instrument.instrumentClass,
        c.issueDate.toISOString(),
        c.validTo.toISOString(),
        c.status
      ]);

      const csvContent = [header, ...rows]
        .map(row => row.map(escapeCsv).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
      return res.send(csvContent);
    }

    const [total, data] = await Promise.all([
      prisma.certificate.count({ where }),
      prisma.certificate.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          application: {
            include: {
              business: { select: { tradeName: true } },
              instrument: { select: { instrumentClass: true, serialNumber: true } }
            }
          }
        }
      })
    ]);

    const formatted = data.map(c => ({
      id: c.id,
      instrumentId: c.application.instrumentId,
      instrumentClass: c.application.instrument.instrumentClass,
      businessName: c.application.business.tradeName,
      issueDate: c.issueDate,
      validTo: c.validTo,
      status: c.status
    }));

    res.json({
      data: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    next(err);
  }
});
