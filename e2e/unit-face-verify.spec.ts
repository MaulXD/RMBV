import { test, expect } from "@playwright/test";
import { verifyFaceProbe, parseProbeDescriptor } from "../src/lib/face-verify";

test.describe("face-verify (unit)", () => {
  test("rejeita probe com tamanho inválido", () => {
    const stored = Array.from({ length: 128 }, (_, i) => i * 0.001);
    const result = verifyFaceProbe(stored, [1, 2, 3]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_probe");
  });

  test("aceita match quando probe é igual ao armazenado", () => {
    const stored = Array.from({ length: 128 }, () => 0.42);
    const result = verifyFaceProbe(stored, [...stored]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.confidence).toBeGreaterThan(0.5);
  });

  test("rejeita descritores muito diferentes", () => {
    const stored = Array.from({ length: 128 }, () => 0);
    const probe = Array.from({ length: 128 }, () => 1);
    const result = verifyFaceProbe(stored, probe);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
  });

  test("parseProbeDescriptor valida entrada", () => {
    expect(parseProbeDescriptor(fakeArray())).not.toBeNull();
    expect(parseProbeDescriptor([1, 2])).toBeNull();
    expect(parseProbeDescriptor(null)).toBeNull();
  });
});

function fakeArray() {
  return Array.from({ length: 128 }, () => 0.1);
}
