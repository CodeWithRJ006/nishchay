import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const app = await prisma.application.create({
      data: {
        id: 'TEST1',
        businessId: 'fake-business',
        instrumentId: 'fake-instrument',
        type: 'NEW',
        status: 'DRAFT',
        routedToRole: 'LMO',
        routingReason: 'Reason'
      }
    });
    console.log("Success:", app);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
