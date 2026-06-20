import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PAGE = 50;

export async function GET(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ messages: [] });
    }

    const url = new URL(request.url);
    const withId = url.searchParams.get("withId"); // null = team channel
    const after = url.searchParams.get("after");   // ISO timestamp for polling

    const afterDate = after ? new Date(after) : undefined;

    let messages;
    if (withId) {
      // DM: messages between user and withId in both directions
      messages = await prisma.chatMessage.findMany({
        where: {
          teamId: user.teamId,
          createdAt: afterDate ? { gt: afterDate } : undefined,
          OR: [
            { senderId: user.id, receiverId: withId },
            { senderId: withId, receiverId: user.id },
          ],
        },
        orderBy: { createdAt: afterDate ? "asc" : "desc" },
        take: afterDate ? 200 : PAGE,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    } else {
      // Team channel: messages with no receiver
      messages = await prisma.chatMessage.findMany({
        where: {
          teamId: user.teamId,
          receiverId: null,
          createdAt: afterDate ? { gt: afterDate } : undefined,
        },
        orderBy: { createdAt: afterDate ? "asc" : "desc" },
        take: afterDate ? 200 : PAGE,
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
    }

    if (!afterDate) messages = messages.reverse();

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender,
        receiverId: m.receiverId,
      })),
    });
  });
}

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Sem equipe" }, { status: 400 });
    }

    const body = (await request.json()) as { body?: string; receiverId?: string };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Mensagem muito longa" }, { status: 400 });
    }

    const receiverId = typeof body.receiverId === "string" ? body.receiverId : null;

    if (receiverId) {
      const receiver = await prisma.user.findFirst({
        where: { id: receiverId, teamId: user.teamId },
        select: { id: true },
      });
      if (!receiver) {
        return NextResponse.json({ error: "Destinatário inválido" }, { status: 400 });
      }
    }

    const msg = await prisma.chatMessage.create({
      data: {
        teamId: user.teamId,
        senderId: user.id,
        receiverId,
        body: text,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json(
      {
        message: {
          id: msg.id,
          body: msg.body,
          createdAt: msg.createdAt.toISOString(),
          sender: msg.sender,
          receiverId: msg.receiverId,
        },
      },
      { status: 201 }
    );
  });
}
