"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";

const necessidades = [
  "Computador ou computadores desligando",
  "Problemas com a Rede",
  "Problemas com impressão",
  "Problemas com Equipamentos Periféricos",
  "Translado de Material",
  "Instalação de Equipamento",
  "Reparo de Equipamento",
  "Instalação de Aplicativos",
  "Outro",
];



export default function SuportePage() {
  const { user } = useSession();
  const [name, setName] = useState(user?.name || "");
  const [sala, setSala] = useState("");
  const [necessidade, setNecessidade] = useState("");
  const [outroTexto, setOutroTexto] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sala, necessidade, outroTexto: outroTexto || null, obs: obs || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao enviar");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="ticket" title="Suporte" subtitle="Central de ajuda e suporte técnico" />

      <div className="rounded-2xl border border-border bg-surface-elevated p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Solicitar Suporte</h2>

        {sent ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Icon name="check" className="mb-3 h-10 w-10 text-green-500" />
            <p className="text-base font-medium text-foreground">Solicitação enviada!</p>
            <p className="mt-1 text-sm text-muted">Nossa equipe de suporte responderá em breve.</p>
            <button type="button" onClick={() => { setSent(false); setSala(""); setNecessidade(""); setOutroTexto(""); setObs(""); }} className="btn-ghost mt-6 px-4 py-2 text-sm">
              Nova solicitação
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Seu Nome <span className="text-red-500">*</span>
                </label>
                <input className="industrial-input w-full" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Sala <span className="text-red-500">*</span>
                </label>
                <input className="industrial-input w-full" value={sala} onChange={(e) => setSala(e.target.value)} required placeholder="Ex: 201" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Qual a necessidade <span className="text-red-500">*</span>
              </label>
              <select className="industrial-input w-full" value={necessidade} onChange={(e) => setNecessidade(e.target.value)} required>
                <option value="">Selecione...</option>
                {necessidades.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {necessidade === "Outro" && (
                <input className="industrial-input mt-2 w-full" value={outroTexto} onChange={(e) => setOutroTexto(e.target.value)} placeholder="Descreva a necessidade..." required />
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">OBS</label>
              <textarea className="industrial-input min-h-[80px] w-full" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações adicionais (opcional)" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Enviando..." : "Enviar solicitação"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
