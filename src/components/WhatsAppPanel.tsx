"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

type WaMessage = {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  sent: boolean;
};

type HistoryEntry = {
  id: string;
  type: string;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
};

export function WhatsAppPanel({
  clientId,
  phones,
}: {
  clientId: string;
  phones: string[];
}) {
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((d: { config: unknown }) => setHasConfig(d.config !== null))
      .catch(() => setHasConfig(false));
  }, []);

  const loadMessages = useCallback(() => {
    setLoading(true);
    fetch(`/api/clients/${clientId}/history`)
      .then((r) => r.json())
      .then((d: { entries?: HistoryEntry[] }) => {
        const entries = d.entries ?? [];
        const waMessages: WaMessage[] = entries
          .filter((e) => e.type === "WHATSAPP")
          .map((e) => ({
            id: e.id,
            note: e.note ?? "",
            createdAt: e.createdAt,
            createdBy: e.createdBy,
            sent: (e.note ?? "").startsWith("[enviado]"),
          }))
          .reverse();
        setMessages(waMessages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (open && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, message: trimmed }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar mensagem");
        return;
      }
      setText("");
      loadMessages();
    } catch {
      setError("Erro de rede ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function displayNote(msg: WaMessage) {
    return msg.sent ? msg.note.replace(/^\[enviado\]\s*/, "") : msg.note;
  }

  return (
    <div className="panel-solid overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Icon name="messageCircle" className="h-4 w-4 text-green-500" />
        <span className="text-sm font-semibold">WhatsApp</span>
        <span className="ml-auto">
          <Icon
            name={open ? "chevronDown" : "chevronRight"}
            className="h-4 w-4 text-muted"
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-border">
          {hasConfig === false ? (
            <p className="p-4 text-sm text-muted">
              Configure o WhatsApp nas configurações
            </p>
          ) : loading ? (
            <p className="p-4 text-sm text-muted">Carregando...</p>
          ) : (
            <>
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted">
                    Nenhuma mensagem ainda
                  </p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.sent
                          ? "rounded-br-sm bg-green-600 text-white dark:bg-green-700"
                          : "rounded-bl-sm bg-surface text-foreground"
                      }`}
                    >
                      <p className="break-words">{displayNote(m)}</p>
                      <p
                        className={`mt-0.5 text-right text-[10px] ${
                          m.sent ? "text-green-200" : "text-muted"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {error && (
                <p className="px-4 pb-2 text-xs text-red-500">{error}</p>
              )}

              {phones.length > 0 ? (
                <div className="flex gap-2 border-t border-border p-3">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem..."
                    className="input flex-1 text-sm"
                    disabled={sending}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="btn-primary flex items-center justify-center px-3"
                    title="Enviar"
                  >
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="p-4 text-xs text-muted">
                  Cliente sem telefone cadastrado
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
