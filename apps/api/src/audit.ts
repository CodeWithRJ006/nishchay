import { Prisma } from '@prisma/client';

export function appendAuditLog(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  beforeSummary?: string,
  afterSummary?: string
) {
  return tx.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      beforeSummary,
      afterSummary
    }
  });
}
