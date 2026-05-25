import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { parseClientsCsv } from "@/lib/csv-import";

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const categoryId = String(formData.get("categoryId") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo CSV obrigatório" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Categoria obrigatória" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const content = await file.text();
    const { rows, errors } = parseClientsCsv(content);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente válido no CSV", details: errors },
        { status: 400 }
      );
    }

    let imported = 0;
    for (const row of rows) {
      await prisma.client.create({
        data: {
          ...row,
          status: "AGUARDANDO",
          createdById: user.id,
          categories: { create: [{ categoryId }] },
        },
      });
      imported++;
    }

    return NextResponse.json({
      imported,
      skipped: errors.length,
      warnings: errors,
    });
  });
}
