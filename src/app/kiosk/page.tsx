"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PontoKiosk } from "@/components/PontoKiosk";

function KioskContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId") ?? "";
  const kioskKey = searchParams.get("kioskKey") ?? "";

  if (!teamId || !kioskKey) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-950 text-white">
        <div className="max-w-md text-center px-4">
          <p className="text-lg font-semibold text-white/60">Link do quiosque inválido.</p>
          <p className="mt-2 text-sm text-white/30">
            Copie o link completo em Ponto → Link do quiosque (inclui equipe e chave).
          </p>
        </div>
      </div>
    );
  }

  return <PontoKiosk teamId={teamId} kioskKey={kioskKey} />;
}

export default function KioskPage() {
  return (
    <Suspense>
      <KioskContent />
    </Suspense>
  );
}
