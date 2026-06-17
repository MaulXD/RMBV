import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getChamadoIfAllowed } from "@/lib/chamado-access";
import { recordChamadoHistory } from "@/lib/chamado-history";

export const runtime = "nodejs";

const commentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const comments = await prisma.chamadoComment.findMany({
      where: { chamadoId: id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      })),
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const chamado = await getChamadoIfAllowed(id, user);
    if (!chamado) {
      return NextResponse.json({ error: "Chamado não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Comentário inválido" }, { status: 400 });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.chamadoComment.create({
        data: {
          chamadoId: id,
          authorId: user.id,
          body: parsed.data.body.trim(),
        },
        include: { author: { select: { id: true, name: true } } },
      });

      await recordChamadoHistory(tx, {
        chamadoId: id,
        createdById: user.id,
        type: "COMMENT",
        note: parsed.data.body.trim().slice(0, 200),
      });

      return created;
    });

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          author: comment.author,
        },
      },
      { status: 201 }
    );
  });
}
