import { prisma } from "./prisma";

export type AccountSetupStatus = {
  mustChangePassword: boolean;
  needsFace: boolean;
  needsConsent: boolean;
  isComplete: boolean;
};

export async function getAccountSetupStatus(userId: string): Promise<AccountSetupStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mustChangePassword: true,
      faceDescriptor: true,
      lgpdFaceConsentAt: true,
    },
  });

  if (!user) {
    return {
      mustChangePassword: true,
      needsFace: true,
      needsConsent: true,
      isComplete: false,
    };
  }

  const hasFace = user.faceDescriptor !== null;
  const hasConsent = user.lgpdFaceConsentAt !== null;
  const needsConsent = !hasConsent;
  const needsFace = !hasFace;

  return {
    mustChangePassword: user.mustChangePassword,
    needsFace,
    needsConsent,
    isComplete: !user.mustChangePassword && hasFace && hasConsent,
  };
}

export function isAccountSetupComplete(status: AccountSetupStatus) {
  if (status.mustChangePassword) return false;
  if (status.needsFace) return false;
  if (status.needsConsent) return false;
  return true;
}
