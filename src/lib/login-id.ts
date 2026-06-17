import { z } from "zod";

/** Login do usuário — aceita nome de usuário ou e-mail (sem exigir @). */
export const loginIdSchema = z
  .string()
  .min(2, "Login muito curto")
  .max(120, "Login muito longo")
  .refine((value) => !/\s/.test(value), "Login não pode conter espaços");

export function normalizeLoginId(value: string) {
  return value.trim().toLowerCase();
}
