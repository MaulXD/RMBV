"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { useDebounce } from "@/hooks/useDebounce";

type ClientCartas = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  status: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  teseRef: { id: string; name: string; color: string | null } | null;
};

type CepData = {
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

function formatCep(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function AddressCell({ client, onSave }: {
  client: ClientCartas;
  onSave: (id: string, data: Partial<ClientCartas>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    cep: client.cep ?? "",
    logradouro: client.logradouro ?? "",
    numero: client.numero ?? "",
    complemento: client.complemento ?? "",
    bairro: client.bairro ?? "",
    cidade: client.cidade ?? "",
    uf: client.uf ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");

  const hasAddress = !!(client.logradouro || client.cep);

  const lookupCep = useCallback(async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`/api/cep/${cleaned}`);
      if (!res.ok) { setCepError("CEP não encontrado"); return; }
      const data = await res.json() as CepData;
      setForm((prev) => ({
        ...prev,
        logradouro: data.logradouro ?? prev.logradouro,
        complemento: data.complemento ?? prev.complemento,
        bairro: data.bairro ?? prev.bairro,
        cidade: data.cidade ?? prev.cidade,
        uf: data.uf ?? prev.uf,
      }));
    } finally {
      setCepLoading(false);
    }
  }, []);

  const handleSave = () => {
    onSave(client.id, {
      cep: form.cep || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      uf: form.uf || null,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="text-left"
        onClick={() => { setForm({ cep: client.cep ?? "", logradouro: client.logradouro ?? "", numero: client.numero ?? "", complemento: client.complemento ?? "", bairro: client.bairro ?? "", cidade: client.cidade ?? "", uf: client.uf ?? "" }); setEditing(true); }}
      >
        {hasAddress ? (
          <span className="text-sm text-foreground">
            {[
              client.logradouro,
              client.numero,
              client.complemento,
              client.bairro,
              client.cidade && client.uf ? `${client.cidade}/${client.uf}` : client.cidade ?? client.uf,
              client.cep ? `CEP ${client.cep}` : null,
            ].filter(Boolean).join(", ")}
          </span>
        ) : (
          <span className="text-xs italic text-muted/60">+ adicionar endereço</span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-primary/30 bg-surface p-3 shadow-sm">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            className="input w-full py-1 text-xs"
            placeholder="CEP (00000-000)"
            value={form.cep}
            onChange={(e) => setForm((p) => ({ ...p, cep: formatCep(e.target.value) }))}
            onBlur={(e) => lookupCep(e.target.value)}
            maxLength={9}
          />
        </div>
        {cepLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent self-center shrink-0" />}
      </div>
      {cepError && <p className="text-xs text-red-500">{cepError}</p>}
      <input className="input w-full py-1 text-xs" placeholder="Logradouro" value={form.logradouro} onChange={(e) => setForm((p) => ({ ...p, logradouro: e.target.value }))} />
      <div className="flex gap-1.5">
        <input className="input w-20 py-1 text-xs shrink-0" placeholder="Nº" value={form.numero} onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))} />
        <input className="input flex-1 py-1 text-xs" placeholder="Complemento" value={form.complemento} onChange={(e) => setForm((p) => ({ ...p, complemento: e.target.value }))} />
      </div>
      <input className="input w-full py-1 text-xs" placeholder="Bairro" value={form.bairro} onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))} />
      <div className="flex gap-1.5">
        <input className="input flex-1 py-1 text-xs" placeholder="Cidade" value={form.cidade} onChange={(e) => setForm((p) => ({ ...p, cidade: e.target.value }))} />
        <input className="input w-16 py-1 text-xs" placeholder="UF" value={form.uf} onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} maxLength={2} />
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        <button type="button" className="btn-ghost px-2 py-1 text-xs text-muted" onClick={() => setEditing(false)}>Cancelar</button>
        <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={handleSave}>Salvar</button>
      </div>
    </div>
  );
}

function buildCSV(clients: ClientCartas[]): string {
  const headers = ["Nome", "CPF", "CEP", "Logradouro", "Número", "Complemento", "Bairro", "Cidade", "UF"];
  const rows = clients.map((c) => [
    c.name,
    c.cpf ?? "",
    c.cep ?? "",
    c.logradouro ?? "",
    c.numero ?? "",
    c.complemento ?? "",
    c.bairro ?? "",
    c.cidade ?? "",
    c.uf ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(clients: ClientCartas[]) {
  const csv = buildCSV(clients);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cartas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function printPDF(clients: ClientCartas[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = clients.map((c) => {
    const addr = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(", ");
    const cityState = [c.cidade, c.uf].filter(Boolean).join("/");
    return `
      <div style="margin-bottom:24px;border-bottom:1px solid #eee;padding-bottom:16px;">
        <strong style="font-size:14px;">${c.name}</strong>
        ${c.cpf ? `<span style="color:#666;font-size:12px;margin-left:8px;">CPF: ${c.cpf}</span>` : ""}
        <div style="margin-top:6px;font-size:13px;color:#333;">
          ${addr || "—"}
          ${cityState ? `<br>${cityState}` : ""}
          ${c.cep ? ` — CEP: ${c.cep}` : ""}
        </div>
      </div>`;
  }).join("");
  win.document.write(`
    <!doctype html><html><head><title>Cartas — Endereços</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}@media print{body{padding:0}}</style>
    </head><body>
    <h2 style="margin-bottom:24px;">Relação de endereços para correspondência</h2>
    ${rows}
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
  win.document.close();
}

export default function CartasPage() {
  const { user } = useSession();
  const [clients, setClients] = useState<ClientCartas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/cartas?${params}`);
      if (res.ok) {
        const data = await res.json() as { clients: ClientCartas[] };
        setClients(data.clients);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSaveAddress = useCallback(async (id: string, data: Partial<ClientCartas>) => {
    const res = await fetch(`/api/clients/${id}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    }
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === clients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(clients.map((c) => c.id)));
    }
  };

  const selectedClients = clients.filter((c) => selected.has(c.id));

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Cartas</h1>
          <p className="text-sm text-muted">Endereços para envio de correspondência</p>
        </div>

        {selected.size > 0 && (
          <div className="relative">
            <button
              type="button"
              className="btn-primary flex items-center gap-2 px-4 py-2"
              onClick={() => setShowExport((v) => !v)}
            >
              <Icon name="download" className="h-4 w-4" />
              Extrair {selected.size} cliente{selected.size !== 1 ? "s" : ""}
            </button>
            {showExport && (
              <div className="absolute right-0 top-full z-20 mt-1 rounded-lg border border-border bg-surface-elevated shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface"
                  onClick={() => { downloadCSV(selectedClients); setShowExport(false); }}
                >
                  <Icon name="fileText" className="h-4 w-4 text-emerald-500" />
                  Baixar CSV
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-sm hover:bg-surface"
                  onClick={() => { printPDF(selectedClients); setShowExport(false); }}
                >
                  <Icon name="printer" className="h-4 w-4 text-blue-500" />
                  Imprimir / PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Icon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            className="input pl-8 pr-3 py-1.5 text-sm w-56"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input py-1.5 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="AGUARDANDO">Aguardando</option>
          <option value="LOCALIZADO">Localizado</option>
          <option value="SEM_SUCESSO">Sem sucesso</option>
          <option value="TENTE_NOVAMENTE">Tente novamente</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === clients.length && clients.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-muted">Cliente</th>
                <th className="px-4 py-3 font-medium text-muted">Endereço</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className={`bg-surface-elevated transition-colors ${selected.has(c.id) ? "bg-primary/5" : "hover:bg-surface"}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.cod && <span className="ml-1.5 text-xs text-muted">#{c.cod}</span>}
                    {c.teseRef && (
                      <div
                        className="mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          background: c.teseRef.color ? `${c.teseRef.color}22` : undefined,
                          color: c.teseRef.color ?? undefined,
                        }}
                      >
                        {c.teseRef.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AddressCell client={c} onSave={handleSaveAddress} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2 text-xs text-muted">
            {selected.size > 0
              ? `${selected.size} de ${clients.length} selecionado${selected.size !== 1 ? "s" : ""}`
              : `${clients.length} cliente${clients.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}
    </div>
  );
}
