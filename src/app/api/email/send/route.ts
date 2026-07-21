import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const sendSchema = z.object({
  clientId: z.string().uuid("clientId inválido").optional().nullable(),
  to: z.string().email("Destinatário inválido"),
  subject: z.string().min(1, "Assunto obrigatório"),
  body: z.string().min(1, "Corpo do e-mail obrigatório"),
});

export async function POST(request: Request) {
  return withAuth(async (user) => {
    if (!user.teamId) {
      return NextResponse.json({ error: "Usuário sem equipe" }, { status: 403 });
    }

    const raw = await request.json();
    const parsed = sendSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clientId, to, subject, body } = parsed.data;

    const emailConfig = await prisma.emailConfig.findUnique({
      where: { teamId: user.teamId },
    });

    if (!emailConfig || !emailConfig.isActive) {
      return NextResponse.json(
        { error: "E-mail não configurado" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    await transporter.sendMail({
      from: emailConfig.fromName
        ? `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`
        : emailConfig.fromEmail,
      to,
      subject,
      text: body,
    });

    if (clientId) {
      await prisma.clientHistory.create({
        data: {
          clientId,
          type: "EMAIL",
          createdById: user.id,
          note: `Para: ${to}\nAssunto: ${subject}\n\n${body}`,
        },
      });
    }

    return NextResponse.json({ ok: true });
  });
}
