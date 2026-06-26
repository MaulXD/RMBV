import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const user = await prisma.user.findFirst({
  where: { email: { contains: "luciano", mode: "insensitive" } },
  select: { id: true, name: true, email: true, role: true },
});
if (!user) {
  const users = await prisma.user.findMany({
    where: { name: { contains: "Luciano", mode: "insensitive" } },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log("ByName:", JSON.stringify(users));
} else {
  console.log("Found:", JSON.stringify(user));
}

await prisma.$disconnect();
