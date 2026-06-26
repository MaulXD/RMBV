import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "TI" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }

  let lastCount = await prisma.supportRequest.count();

  const stream = new ReadableStream({
    async start(controller) {
      // send initial data immediately
      const initial = await prisma.supportRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          requester: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } },
          _count: { select: { responses: true } },
        },
      });
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "update", tickets: initial, total: lastCount })}\n\n`));

      const interval = setInterval(async () => {
        try {
          const currentCount = await prisma.supportRequest.count();
          if (currentCount !== lastCount) {
            lastCount = currentCount;
            const tickets = await prisma.supportRequest.findMany({
              orderBy: { createdAt: "desc" },
              take: 5,
              include: {
                requester: { select: { name: true, email: true } },
                assignedTo: { select: { name: true, email: true } },
                _count: { select: { responses: true } },
              },
            });
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: "update", tickets, total: currentCount })}\n\n`));
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch { /* ok */ }
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* ok */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
