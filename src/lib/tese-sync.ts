import { prisma } from "./prisma";

export async function resolveTeseForClient(input: {
  teseId?: string | null;
  tese?: string | null;
  teamId?: string | null;
}) {
  const teamFilter = input.teamId ? { teamId: input.teamId } : {};

  if (input.teseId) {
    const tese = await prisma.tese.findFirst({
      where: { id: input.teseId, ...teamFilter },
    });
    if (!tese) return { teseId: null, tese: input.tese?.trim() || null };
    return { teseId: tese.id, tese: tese.name };
  }

  const name = input.tese?.trim();
  if (!name) return { teseId: null, tese: null };

  const existing = await prisma.tese.findFirst({
    where: { name: { equals: name }, ...teamFilter },
  });
  if (existing) return { teseId: existing.id, tese: existing.name };

  return { teseId: null, tese: name };
}
