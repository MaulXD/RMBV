"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ClientResearchTools } from "@/components/ClientResearchTools";

export default function PesquisaPage() {
  const [scratch, setScratch] = useState<Record<string, string>>({
    phone1: "",
    phone2: "",
    phone3: "",
    address1: "",
    address2: "",
    address3: "",
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold tracking-wide">Pesquisa</h1>
        <p className="mt-1 text-sm text-muted">
          Cole textos de consultas para identificar telefones e endereços. Use os botões para
          organizar os dados antes de cadastrar no cliente.
        </p>
      </div>

      <ClientResearchTools
        formValues={scratch}
        onApplyPhone={(key, value) => setScratch((prev) => ({ ...prev, [key]: value }))}
        onApplyAddress={(key, value) => setScratch((prev) => ({ ...prev, [key]: value }))}
      />

      {Object.values(scratch).some((v) => v.trim()) && (
        <section className="industrial-panel mt-6 space-y-3 p-4">
          <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
            Rascunho organizado
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(scratch)
              .filter(([, v]) => v.trim())
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted uppercase">{key}</dt>
                  <dd className="text-sm font-medium break-words">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}
    </AppShell>
  );
}
