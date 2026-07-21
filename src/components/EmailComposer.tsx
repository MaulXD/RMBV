"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ToastProvider";

type Props = {
  clientId: string;
  clientEmail?: string;
};

export function EmailComposer({ clientId, clientEmail }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(clientEmail ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setTo(clientEmail ?? "");
    setSubject("");
    setBody("");
    setErrorMsg(null);
    setNotConfigured(false);
    setOpen(true);
    setTimeout(() => toRef.current?.focus(), 50);
  }

  function handleClose() {
    if (sending) return;
    setOpen(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;

    setErrorMsg(null);
    setSending(true);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, to, subject, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "E-mail não configurado") {
          setNotConfigured(true);
        } else {
          setErrorMsg(data?.error ?? "Erro ao enviar e-mail");
        }
        return;
      }

      toast("E-mail enviado com sucesso", "success");
      setOpen(false);
    } catch {
      setErrorMsg("Erro de conexão ao enviar e-mail");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-ghost text-sm" onClick={handleOpen}>
        <Icon name="mail" className="h-4 w-4" />
        Enviar e-mail
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="panel-solid w-full max-w-lg rounded-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Icon name="mail" className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Enviar e-mail</h2>
              </div>
              <button
                type="button"
                className="btn-ghost px-2 py-1"
                onClick={handleClose}
                disabled={sending}
                aria-label="Fechar"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              {notConfigured ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                  Configure o servidor de e-mail nas{" "}
                  <a
                    href="/configuracoes/email"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    configuracoes de e-mail
                  </a>{" "}
                  antes de enviar.
                </div>
              ) : (
                <form onSubmit={handleSend} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Para
                    </label>
                    <input
                      ref={toRef}
                      type="email"
                      className="industrial-input"
                      placeholder="destinatario@exemplo.com"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      required
                      disabled={sending}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Assunto
                    </label>
                    <input
                      type="text"
                      className="industrial-input"
                      placeholder="Assunto do e-mail"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      disabled={sending}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Mensagem
                    </label>
                    <textarea
                      className="industrial-input min-h-[120px] resize-y"
                      placeholder="Digite a mensagem..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      required
                      disabled={sending}
                      rows={5}
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      onClick={handleClose}
                      disabled={sending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-sm"
                      disabled={sending}
                    >
                      {sending ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Icon name="send" className="h-4 w-4" />
                          Enviar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
