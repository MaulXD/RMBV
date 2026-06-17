"use client";

import { useEffect, useState } from "react";
import { ClientSearchField, type ClientOption } from "./ClientSearchField";
import { Icon } from "./ui/Icon";

type Template = { id: string; name: string; body: string };

function fillTemplate(body: string, client: ClientOption) {
  const map: Record<string, string> = {
    nome: client.name,
    cod: client.cod ?? "",
    cpf: client.cpf ?? "",
    tese: client.tese ?? "",
    telefone1: client.phone1 ?? "",
    telefone: client.phone1 ?? "",
  };
  return body.replace(/\{\{(\w+)\}\}/gi, (_, key: string) => map[key.toLowerCase()] ?? "");
}

export function NoticeGeneratorTool({ teamId }: { teamId: string | null }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [client, setClient] = useState<ClientOption | null>(null);
  const [customBody, setCustomBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    const params = new URLSearchParams({ teamId });
    fetch(`/api/message-templates?${params}`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []));
  }, [teamId]);

  useEffect(() => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) setCustomBody(tpl.body);
  }, [templateId, templates]);

  const preview = client ? fillTemplate(customBody, client) : customBody;
  const phone = client?.phone1?.replace(/\D/g, "") ?? "";

  async function copyText() {
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp() {
    if (!phone) return;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(preview)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <section className="panel-solid space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Gerador de ofício / WhatsApp</h2>
          <p className="mt-1 text-sm text-muted">
            Use templates com variáveis: {"{{nome}}"}, {"{{cod}}"}, {"{{cpf}}"}, {"{{tese}}"},{" "}
            {"{{telefone1}}"}.
          </p>
        </div>

        {!teamId && (
          <p className="text-sm text-amber-600">Usuário sem equipe — templates indisponíveis.</p>
        )}

        {teamId && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Template</label>
              <select
                className="industrial-input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Texto livre</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Cliente</label>
              <ClientSearchField value={client} onChange={setClient} />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Texto</label>
          <textarea
            className="industrial-input min-h-[140px] text-sm"
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
          />
        </div>

        {client && (
          <div className="rounded-[var(--radius-ui)] border border-border bg-background/50 p-4">
            <p className="mb-2 text-xs font-semibold text-muted uppercase">Pré-visualização</p>
            <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={!preview} onClick={() => void copyText()}>
            <Icon name="copy" className="h-4 w-4" />
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={!phone || !preview}
            onClick={openWhatsApp}
          >
            Abrir WhatsApp
          </button>
        </div>
      </section>
    </div>
  );
}
