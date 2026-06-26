import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const LUCIANO_ID = "34e83151-fd09-45de-a6c5-714f2ba1232d";

const result = await prisma.supportRequest.updateMany({
  where: { OR: [{ assignedToId: null }, { assignedToId: { not: LUCIANO_ID } }] },
  data: { assignedToId: LUCIANO_ID, status: "RESOLVIDO" },
});

console.log(`Atualizados ${result.count} chamados`);

await prisma.$disconnect();
