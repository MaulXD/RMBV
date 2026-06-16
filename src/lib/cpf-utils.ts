/** Remove pontuação e espaços do CPF/CNPJ para comparação. */
export function normalizeCpf(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 11 ? digits : null;
}
