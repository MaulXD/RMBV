"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PontoKiosk } from "@/components/PontoKiosk";

function KioskContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "";

  if (!teamId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-white/60">Equipe não especificada.</p>
          <p className="mt-2 text-sm text-white/30">Use: /kiosk?teamId=SEU_TEAM_ID</p>
        </div>
      </div>
    );
  }

  return <PontoKiosk teamId={teamId} />;
}

export default function KioskPage() {
  return (
    <Suspense>
      <KioskContent />
    </Suspense>
  );
}
