import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "pdfkit"],
  experimental: {
    // Router cache TTL 0 = nunca serve página stale após navegação SPA.
    // Evita o padrão "opções só aparecem no F5" após deploys.
    staleTimes: { dynamic: 0, static: 180 },
  },
};

export default nextConfig;
