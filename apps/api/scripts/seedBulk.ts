import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Bulk seeding 2000+ certificates for search tests...');
  
  const zone = await prisma.zone.upsert({
    where: { name: 'BulkZone' },
    update: {},
    create: { id: 'bulk-zone-1', name: 'BulkZone' }
  });

  const bUser = await prisma.user.create({
    data: {
      email: `bulk_biz_${Date.now()}@test.com`,
      passwordHash: 'hash',
      name: 'Bulk Biz',
      role: 'BUSINESS'
    }
  });

  const business = await prisma.business.create({
    data: {
      userId: bUser.id,
      tradeName: 'Bulk Business =injection',
      ownerName: 'Owner',
      businessType: 'Retail',
      address: 'Add',
      zoneId: zone.id
    }
  });

  const officer = await prisma.user.create({
    data: {
      email: `bulk_lmo_${Date.now()}@test.com`,
      passwordHash: 'hash',
      name: 'Bulk LMO',
      role: 'LMO',
      zones: { connect: [{ id: zone.id }] }
    }
  });

  // Batch insert 2000 certificates
  const instrumentsData: any[] = [];
  const applicationsData: any[] = [];
  const receiptsData: any[] = [];
  const certificatesData: any[] = [];

  for (let i = 0; i < 2000; i++) {
    const instId = `bulk-inst-${i}-${Date.now()}`;
    const appId = `bulk-app-${i}-${Date.now()}`;
    const recId = `bulk-rec-${i}-${Date.now()}`;
    const certId = `bulk-cert-${i}-${Date.now()}`;
    const pId = `bulk-p-${i}-${Date.now()}`;
    
    // We will just use createMany for speed
    instrumentsData.push({
      id: instId,
      businessId: business.id,
      serialNumber: `SN-BULK-${i}`,
      instrumentClass: i % 2 === 0 ? 'Weights' : 'Length measure',
      status: 'VERIFIED'
    });

    applicationsData.push({
      id: appId,
      businessId: business.id,
      instrumentId: instId,
      status: 'CERTIFIED',
      feeSnapshot: 100
    });

    receiptsData.push({
      id: recId,
      applicationId: appId,
      paymentId: pId, // Mock payment ID
      signature: 'mock'
    });

    certificatesData.push({
      id: certId,
      applicationId: appId,
      receiptId: recId,
      issueDate: new Date(),
      validTo: new Date(Date.now() + 31536000000), // +1 year
      status: i % 10 === 0 ? 'EXPIRED' : 'VALID',
      sealHash: 'hash',
      sealSignature: 'sig',
      payload: '{}',
      publicId: `pub-${i}-${Date.now()}`
    });
  }

  await prisma.instrument.createMany({ data: instrumentsData });
  
  // Create mock payments for the receipts to refer to
  await prisma.payment.createMany({
    data: applicationsData.map(a => ({
      id: receiptsData.find(r => r.applicationId === a.id)!.paymentId,
      applicationId: a.id,
      amount: 100,
      status: 'SUCCESS',
      idempotencyKey: randomUUID()
    }))
  });

  await prisma.application.createMany({ data: applicationsData });
  await prisma.receipt.createMany({ data: receiptsData });
  await prisma.certificate.createMany({ data: certificatesData });

  console.log(`Seeded 2000 certificates for business ${business.id}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
