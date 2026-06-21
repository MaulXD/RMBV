"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "./SessionProvider";

/** Redireciona para /primeiro-acesso se senha ou rosto pendentes. */
export function AccountSetupGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "ADMIN") return;

    const incomplete =
      user.mustChangePassword || !user.hasFace || !user.hasFaceConsent;

    if (incomplete && pathname !== "/primeiro-acesso") {
      router.replace("/primeiro-acesso");
    }
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}
