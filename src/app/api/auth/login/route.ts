import { NextResponse } from "next/server";
import { authenticateUser, createSessionToken, setSessionCookie } from "@/lib/auth";
import { assertAuthEnv, getAuthErrorMessage } from "@/lib/auth-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertAuthEnv();

    const body = await request.json();
    const login = String(body.login ?? body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!login || !password) {
      return NextResponse.json({ error: "Login e senha obrigatórios" }, { status: 400 });
    }

    const user = await authenticateUser(login, password);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Credenciais inválidas ou usuário inexistente. Em produção, confirme se o seed foi executado no banco online.",
        },
        { status: 401 }
      );
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/login]", err);
    const { message, status } = getAuthErrorMessage(err);
    return NextResponse.json({ error: message }, { status });
  }
}
