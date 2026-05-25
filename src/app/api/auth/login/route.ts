import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message.includes("Can't reach database")
        ? "Banco de dados indisponível. Execute: npm run db:push && npm run db:seed"
        : "Erro ao autenticar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
