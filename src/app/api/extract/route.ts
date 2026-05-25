import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { extractClientDataFromText } from "@/lib/extract-service";
import { z } from "zod";

const bodySchema = z.object({
  text: z.string().min(10, "Texto muito curto para extração"),
});

export async function POST(request: Request) {
  return withAuth(async () => {
    try {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0]?.message ?? "Texto inválido" },
          { status: 400 }
        );
      }

      const result = await extractClientDataFromText(parsed.data.text);
      return NextResponse.json(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha na extração com IA";
      const status = message.includes("OPENAI") ? 503 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
