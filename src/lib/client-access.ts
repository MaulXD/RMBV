import { prisma } from "./prisma";
import { getReadableCategoryIds } from "./permissions";
import { clientListInclude } from "./client-query";
import type { SessionUser } from "./auth";

export async function getClientIfAllowed(clientId: string, user: SessionUser) {
  const readableIds = await getReadableCategoryIds(user);

  return prisma.client.findFirst({
    where: {
      id: clientId,
      categories: { some: { categoryId: { in: readableIds } } },
    },
    include: clientListInclude,
  });
}
