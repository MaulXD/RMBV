import { prisma } from "./prisma";
import { getReadableCategoryIds } from "./permissions";
import { clientListInclude } from "./client-query";
import type { SessionUser } from "./auth";
import { assertClientHasTeam, teamScopeWhere } from "./team-access";

export async function getClientIfAllowed(clientId: string, user: SessionUser) {
  const readableIds = await getReadableCategoryIds(user);

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...teamScopeWhere(user),
      categories: { some: { categoryId: { in: readableIds } } },
    },
    include: clientListInclude,
  });

  if (client && user.role !== "ADMIN") {
    assertClientHasTeam(client.teamId);
  }

  return client;
}
