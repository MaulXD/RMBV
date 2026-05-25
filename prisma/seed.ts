import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@sistema.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123";
  const adminName = process.env.ADMIN_NAME ?? "Administrador";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
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
        canUpdate: false,
        canDelete: false,
      },
      create: {
        role: Role.COLABORADOR,
        categoryId: category.id,
        canCreate: true,
        canRead: true,
        canUpdate: false,
        canDelete: false,
      },
    });
  }

  console.log(`Seed concluído. Admin: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
