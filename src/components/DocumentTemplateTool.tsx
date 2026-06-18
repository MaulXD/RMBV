"use client";

import { useEffect, useState } from "react";
import { ClientSearchField, type ClientOption } from "./ClientSearchField";
import { renderTemplate } from "@/lib/document-templates";
import { Icon } from "./ui/Icon";

type Template = { id: string; name: string; body: string };

export function DocumentTemplateTool({ teamId }: { teamId: string | null }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [client, setClient] = useState<ClientOption | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const qs = teamId ? `?teamId=${teamId}` : "";
    fetch(`/api/document-templates${qs}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, [teamId]);

  const selected = templates.find((t) => t.id === selectedId);

  useEffect(() => {
    if (!selected || !client) {
      setPreview("");
      return;
    }
    setPreview(
      renderTemplate(selected.body, {
        nome: client.name,
        codigo: client.cod ?? "",
        cpf: client.cpf ?? "",
        telefone: client.phone1 ?? "",
      })
    );
  }, [selected, client]);

  async function saveTemplate() {
    setMessage(null);
    const res = await fetch("/api/document-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, body, teamId: teamId ?? undefined }),
    });
    const d = await res.json();
    if (!res.ok) {
      setMessage(d.error ?? "Erro ao salvar");
      return;
    }
    setTemplates((prev) => [...prev, d.template]);
    setName("");
    setBody("");
    setMessage("Template salvo.");
  }

  return (
    <div className="space-y-4">
      <section className="soft-card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Usar template</h3>
        <select
          className="industrial-input text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Selecione um template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <ClientSearchField value={client} onChange={setClient} />
        {preview && (
          <div className="space-y-2">
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-xs">
              {preview}
            </pre>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => void navigator.clipboard.writeText(preview)}
            >
              <Icon name="copy" className="h-3.5 w-3.5" />
              Copiar texto
            </button>
          </div>
        )}
      </section>

      <section className="soft-card space-y-3 p-5">
        <h3 className="text-sm font-semibold">Novo template</h3>
        <p className="text-xs text-muted">
          Variáveis: {"{{nome}}"}, {"{{codigo}}"}, {"{{cpf}}"}, {"{{telefone}}"}
        </p>
        <input
          className="industrial-input text-sm"
          placeholder="Nome do template"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="industrial-input min-h-32 text-sm"
          placeholder="Corpo do documento..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="button" className="btn-primary" onClick={() => void saveTemplate()}>
          Salvar template
        </button>
        {message && <p className="text-xs text-muted">{message}</p>}
      </section>
    </div>
  );
}
