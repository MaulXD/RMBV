import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sistema.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "rmbvadmin";
  const adminName = process.env.ADMIN_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const categories = [
    { name: "Residencial", description: "Clientes residenciais" },
    { name: "Comercial", description: "Clientes comerciais" },
    { name: "Industrial", description: "Clientes industriais" },
  ];

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });

    await prisma.permission.upsert({
      where: {
        role_categoryId: { role: Role.ADMIN, categoryId: category.id },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        role: Role.ADMIN,
        categoryId: category.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });

    await prisma.permission.upsert({
      where: {
        role_categoryId: { role: Role.ADV, categoryId: category.id },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        role: Role.ADV,
        categoryId: category.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });

    await prisma.permission.upsert({
      where: {
        role_categoryId: { role: Role.GERENTE, categoryId: category.id },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
      create: {
        role: Role.GERENTE,
        categoryId: category.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
    });

    await prisma.permission.upsert({
      where: {
        role_categoryId: { role: Role.COLABORADOR, categoryId: category.id },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
      create: {
        role: Role.COLABORADOR,
        categoryId: category.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: false,
      },
    });
  }

  const defaultTeses = [
    { name: "Tese Principal", color: "#45454d", sortOrder: 0 },
    { name: "Tese Secundária", color: "#6b7585", sortOrder: 1 },
    { name: "Tese Urgente", color: "#b45309", sortOrder: 2 },
  ];

  for (const t of defaultTeses) {
    await prisma.tese.upsert({
      where: { name: t.name },
      update: { color: t.color, sortOrder: t.sortOrder },
      create: t,
    });
  }

  const clients = await prisma.client.findMany({
    where: { tese: { not: null }, teseId: null },
    select: { id: true, tese: true },
  });

  for (const client of clients) {
    if (!client.tese) continue;
    const tese = await prisma.tese.findFirst({ where: { name: client.tese } });
    if (tese) {
      await prisma.client.update({
        where: { id: client.id },
        data: { teseId: tese.id },
      });
    }
  }

  const advPassword = await bcrypt.hash(process.env.ADV_PASSWORD ?? "Adv@123", 12);
  const adv = await prisma.user.upsert({
    where: { email: process.env.ADV_EMAIL ?? "adv@sistema.local" },
    update: { role: Role.ADV },
    create: {
      name: process.env.ADV_NAME ?? "ADV",
      email: process.env.ADV_EMAIL ?? "adv@sistema.local",
      passwordHash: advPassword,
      role: Role.ADV,
      isActive: true,
    },
  });

  const gerentePassword = await bcrypt.hash(process.env.GERENTE_PASSWORD ?? "Gerente@123", 12);
  const gerente = await prisma.user.upsert({
    where: { email: process.env.GERENTE_EMAIL ?? "gerente@sistema.local" },
    update: { role: Role.GERENTE },
    create: {
      name: process.env.GERENTE_NAME ?? "Gerente",
      email: process.env.GERENTE_EMAIL ?? "gerente@sistema.local",
      passwordHash: gerentePassword,
      role: Role.GERENTE,
      isActive: true,
    },
  });

  console.log(`Seed concluído.
  Admin: ${admin.email}
  ADV: ${adv.email}
  Gerente: ${gerente.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
