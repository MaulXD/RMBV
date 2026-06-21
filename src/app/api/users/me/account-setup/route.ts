import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getAccountSetupStatus, isAccountSetupComplete } from "@/lib/account-setup";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    const status = await getAccountSetupStatus(user.id);
    return NextResponse.json({
      ...status,
      isComplete: isAccountSetupComplete(status),
    });
  });
}
