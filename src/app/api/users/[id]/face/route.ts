import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { isAdmin } from "@/lib/admin";
import { LGPD_FACE_CONSENT_VERSION } from "@/lib/lgpd-face-consent";
import { recordFaceAudit } from "@/lib/face-audit";
import {
  averageFaceDescriptors,
  canEnrollTeamMemberFace,
  canRemoveTeamMemberFace,
} from "@/lib/team-face-enrollment";
import { ENROLLMENT_CAPTURE_COUNT, ENROLLMENT_DESCRIPTOR_WEIGHTS } from "@/lib/face-enrollment-capture";

export const runtime = "nodejs";

const saveSchema = z.object({
  descriptor: z.array(z.number()).length(128).optional(),
  descriptors: z.array(z.array(z.number()).length(128)).min(1).max(5).optional(),
  acceptConsent: z.boolean().optional(),
  enrolledByManager: z.boolean().optional(),
  consentOnly: z.boolean().optional(),
});

function resolveDescriptor(body: z.infer<typeof saveSchema>): number[] | null {
  if (body.descriptors?.length) {
    const weights =
      body.descriptors.length === ENROLLMENT_CAPTURE_COUNT
        ? ENROLLMENT_DESCRIPTOR_WEIGHTS
        : undefined;
    return averageFaceDescriptors(body.descriptors, weights);
  }
  if (body.descriptor?.length) return body.descriptor;
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canEnrollTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, faceDescriptor: true, lgpdFaceConsentAt: true },
    });
    if (!target) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const isSelf = user.id === id;
    return NextResponse.json({
      hasDescriptor: target.faceDescriptor !== null,
      hasConsent: target.lgpdFaceConsentAt !== null,
      descriptor: isSelf || isAdmin(user) ? target.faceDescriptor : null,
    });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canEnrollTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Descriptor inválido" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { faceDescriptor: true, teamId: true, lgpdFaceConsentAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const isSelf = user.id === id;

    if (isSelf && parsed.data.consentOnly && parsed.data.acceptConsent) {
      if (!existing.faceDescriptor) {
        return NextResponse.json({ error: "Cadastre o rosto antes de aceitar o termo" }, { status: 400 });
      }
      const now = new Date();
      await prisma.user.update({
        where: { id },
        data: {
          lgpdFaceConsentAt: now,
          lgpdFaceConsentVersion: LGPD_FACE_CONSENT_VERSION,
        },
      });
      await recordFaceAudit({
        actorId: user.id,
        targetUserId: id,
        teamId: existing.teamId,
        action: "CONSENT_ACCEPT",
        metadata: { version: LGPD_FACE_CONSENT_VERSION, consentOnly: true },
      });
      return NextResponse.json({ ok: true });
    }

    const descriptor = resolveDescriptor(parsed.data);
    if (!descriptor) {
      return NextResponse.json({ error: "Descriptor inválido" }, { status: 400 });
    }

    const managerEnroll = !isSelf && parsed.data.enrolledByManager !== false;

    if (isSelf && !parsed.data.acceptConsent) {
      return NextResponse.json({ error: "Aceite o termo LGPD para continuar" }, { status: 400 });
    }

    const now = new Date();
    const consentUpdate =
      isSelf && parsed.data.acceptConsent
        ? { lgpdFaceConsentAt: now, lgpdFaceConsentVersion: LGPD_FACE_CONSENT_VERSION }
        : managerEnroll && !existing.lgpdFaceConsentAt
          ? {
              lgpdFaceConsentAt: now,
              lgpdFaceConsentVersion: `${LGPD_FACE_CONSENT_VERSION}-manager`,
            }
          : {};

    await prisma.user.update({
      where: { id },
      data: {
        faceDescriptor: descriptor,
        ...consentUpdate,
      },
    });

    await recordFaceAudit({
      actorId: user.id,
      targetUserId: id,
      teamId: existing.teamId,
      action: existing.faceDescriptor ? "RE_ENROLL" : "ENROLL",
      metadata: {
        samples: parsed.data.descriptors?.length ?? 1,
        managerEnroll,
        selfEnroll: isSelf,
      },
    });

    if (isSelf && parsed.data.acceptConsent) {
      await recordFaceAudit({
        actorId: user.id,
        targetUserId: id,
        teamId: existing.teamId,
        action: "CONSENT_ACCEPT",
        metadata: { version: LGPD_FACE_CONSENT_VERSION },
      });
    }

    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const permission = await canRemoveTeamMemberFace(user, id);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.error ?? "Sem permissão" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { teamId: true },
    });

    await prisma.user.update({
      where: { id },
      data: {
        faceDescriptor: Prisma.DbNull,
        lgpdFaceConsentAt: null,
        lgpdFaceConsentVersion: null,
      },
    });

    await recordFaceAudit({
      actorId: user.id,
      targetUserId: id,
      teamId: existing?.teamId ?? null,
      action: "DELETE",
    });

    return NextResponse.json({ ok: true });
  });
}
