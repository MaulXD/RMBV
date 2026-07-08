import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Module-level map shared across requests in the same serverless instance.
// userId → last heartbeat timestamp (ms)
const presenceMap = new Map<string, number>();
const STALE_MS = 45_000; // consider offline after 45 s without heartbeat

function onlineIds(): string[] {
  const now = Date.now();
  const ids: string[] = [];
  for (const [id, ts] of presenceMap) {
    if (now - ts < STALE_MS) ids.push(id);
    else presenceMap.delete(id);
  }
  return ids;
}

// POST /api/presence  — heartbeat (called every 20 s from client)
export async function POST(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  presenceMap.set(user.id, Date.now());
  return NextResponse.json({ ok: true, online: onlineIds() });
}

// GET /api/presence  — SSE stream of online user IDs (polling every 5 s)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mark caller as online immediately
  presenceMap.set(user.id, Date.now());
  const userId = user.id;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      function send(ids: string[]) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ids)}\n\n`));
        } catch {
          closed = true;
        }
      }

      send(onlineIds());

      const interval = setInterval(() => {
        if (closed) { clearInterval(interval); return; }
        send(onlineIds());
      }, 5_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        presenceMap.delete(userId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
