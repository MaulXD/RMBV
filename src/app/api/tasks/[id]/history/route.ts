import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getTaskIfAllowed } from "@/lib/task-access";
import { formatTaskHistoryEntry, taskHistoryInclude } from "@/lib/task-history";

export const runtime = "nodejs";

const commentSchema = z.object({
  note: z.string().min(1).max(4000),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const task = await getTaskIfAllowed(id, user);
    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    const rows = await prisma.taskHistory.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
      include: taskHistoryInclude,
    });

    return NextResponse.json({
      entries: rows.map(formatTaskHistoryEntry),
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const task = await getTaskIfAllowed(id, user);
    if (!task) {
      return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Comentário inválido" }, { status: 400 });
    }

    const row = await prisma.taskHistory.create({
      data: {
        taskId: id,
        type: "COMMENT",
        note: parsed.data.note.trim(),
        createdById: user.id,
      },
      include: taskHistoryInclude,
    });

    return NextResponse.json({ entry: formatTaskHistoryEntry(row) }, { status: 201 });
  });
}
