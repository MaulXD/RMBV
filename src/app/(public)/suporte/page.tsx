"use client";

import { useState } from "react";

type NecessidadeOption = {
  value: string;
  label: string;
  icon: React.ReactNode;
};

const svg = (path: string, viewBox = "0 0 24 24") => (
  <svg className="h-6 w-6" fill="none" viewBox={viewBox} stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const necessidades: NecessidadeOption[] = [
  {
    value: "Computador ou computadores desligando",
    label: "Computador desligando",
    icon: svg("M13 10V3L4 14h7v7l9-11h-7z"),
  },
  {
    value: "Problemas com a Rede",
    label: "Problemas com a Rede",
    icon: svg("M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"),
  },
  {
    value: "Problemas com impressão",
    label: "Problemas com impressão",
    icon: svg("M6 18H4a2 2 0 01-2-2V8a2 2 0 012-2h1m6 0h6a2 2 0 012 2v8a2 2 0 01-2 2h-1M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2M6 14h12M6 18h12"),
  },
  {
    value: "Problemas com Equipamentos Periféricos",
    label: "Periféricos",
    icon: svg("M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"),
  },
  {
    value: "Translado de Material",
    label: "Translado de Material",
    icon: svg("M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"),
  },
  {
    value: "Instalação de Equipamento",
    label: "Instalação de Equipamento",
    icon: svg("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"),
  },
  {
    value: "Reparo de Equipamento",
    label: "Reparo de Equipamento",
    icon: svg("M11.42 15.17l-7.5-7.5a2 2 0 010-2.83l2.83-2.83a2 2 0 012.83 0l7.5 7.5M15.17 11.42L20 16.25 16.25 20l-4.83-4.83M7 7h.01M15.17 8.58l-1.75-1.75M18.42 11.83l-1.75-1.75"),
  },
  {
    value: "Instalação de Aplicativos",
    label: "Instalação de Apps",
    icon: svg("M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"),
  },
  {
    value: "Outro",
    label: "Outro",
    icon: svg("M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01"),
  },
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
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Suporte Técnico</h1>
          <p className="mt-1 text-sm text-white/60">Central de ajuda e suporte técnico</p>
          <a href="/dashboard" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/20 hover:text-white/70">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao sistema
          </a>
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
              <button type="button" onClick={() => { setSent(false); setName(""); setSala(""); setNecessidade(""); setOutroTexto(""); setObs(""); }} className="mt-6 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
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
                <label className="mb-2 block text-xs font-medium text-white/70">
                  Qual a necessidade <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {necessidades.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNecessidade(opt.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-all ${
                        necessidade === opt.value
                          ? "border-indigo-500 bg-indigo-500/15 text-indigo-300 shadow-sm shadow-indigo-500/20"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      <span className={necessidade === opt.value ? "text-indigo-400" : "text-white/40"}>{opt.icon}</span>
                      <span className="leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {necessidade === "Outro" && (
                  <input className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={outroTexto} onChange={(e) => setOutroTexto(e.target.value)} placeholder="Descreva a necessidade..." required />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">OBS</label>
                <textarea className="min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações adicionais (opcional)" />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50" disabled={saving || !necessidade}>
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
