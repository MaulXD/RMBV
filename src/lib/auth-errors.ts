import { Prisma } from "@prisma/client";

export function getAuthErrorMessage(err: unknown): { message: string; status: number } {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    const text = err.message;
    if (text.includes("file:") || text.includes("Unable to open")) {
      return {
        status: 503,
        message:
          "Banco SQLite não funciona na Vercel. Use DATABASE_URL com PostgreSQL (Neon) nas variáveis do projeto.",
      };
    }
    if (text.includes("provider") || text.includes("postgresql")) {
      return {
        status: 503,
        message:
          "Banco incompatível. Confira DATABASE_URL (PostgreSQL) na Vercel e rode npm run db:push + db:seed.",
      };
    }
    if (text.includes("DATABASE_URL") || text.includes("Environment variable")) {
      return {
        status: 503,
        message: "DATABASE_URL não está configurada no servidor de produção.",
      };
    }
    return {
      status: 503,
      message: "Não foi possível conectar ao banco de dados. Verifique DATABASE_URL.",
    };
  }

  if (err instanceof Error) {
    if (err.message.includes("JWT_SECRET")) {
      return {
        status: 503,
        message: "JWT_SECRET não está configurada no servidor de produção.",
      };
    }
    if (err.message.includes("Can't reach database")) {
      return {
        status: 503,
        message:
          "Banco de dados inacessível. Em produção use PostgreSQL e rode o seed uma vez.",
      };
    }
  }

  return { status: 500, message: "Erro ao autenticar. Verifique as variáveis do servidor." };
}

export function assertAuthEnv() {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error("JWT_SECRET não configurado");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL não configurado");
  }
}
