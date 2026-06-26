"use client";

import { useState } from "react";

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
  const [name, setName] = useState("");
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Suporte Técnico</h1>
          <p className="mt-1 text-sm text-white/60">Central de ajuda e suporte técnico</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Solicitar Suporte</h2>

          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-base font-medium text-white">Solicitação enviada!</p>
              <p className="mt-1 text-sm text-white/60">Nossa equipe de suporte responderá em breve.</p>
              <button type="button" onClick={() => { setSent(false); setSala(""); setNecessidade(""); setOutroTexto(""); setObs(""); }} className="mt-6 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
                Nova solicitação
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">
                    Seu Nome <span className="text-red-400">*</span>
                  </label>
                  <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">
                    Sala <span className="text-red-400">*</span>
                  </label>
                  <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={sala} onChange={(e) => setSala(e.target.value)} required placeholder="Ex: 201" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">
                  Qual a necessidade <span className="text-red-400">*</span>
                </label>
                <select className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={necessidade} onChange={(e) => setNecessidade(e.target.value)} required>
                  <option value="" className="bg-slate-900">Selecione...</option>
                  {necessidades.map((n) => <option key={n} value={n} className="bg-slate-900">{n}</option>)}
                </select>
                {necessidade === "Outro" && (
                  <input className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={outroTexto} onChange={(e) => setOutroTexto(e.target.value)} placeholder="Descreva a necessidade..." required />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">OBS</label>
                <textarea className="min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações adicionais (opcional)" />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50" disabled={saving}>
                  {saving ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
