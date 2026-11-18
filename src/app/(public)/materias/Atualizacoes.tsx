"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { quandoTexto, type Atualizacao } from "./dados";

export function ListaAtualizacoes({
  itens,
  vazio = "Nenhuma atualização registrada.",
  onApagar,
  limite,
}: {
  itens: Atualizacao[];
  vazio?: string;
  onApagar?: (id: string) => void;
  limite?: number;
}) {
  if (!itens.length) return <p className="text-sm text-muted">{vazio}</p>;
  const lista = limite ? itens.slice(0, limite) : itens;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {lista.map((a, i) => (
        <li key={a.id} className="relative">
          <span
            className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ${
              i === 0 ? "bg-primary" : "bg-border"
            }`}
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium tabular-nums text-foreground">{quandoTexto(a)}</span>
            {a.daEquipe && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Registrada pela equipe
              </span>
            )}
            {a.fonteUrl && (
              <a
                href={a.fonteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Fonte <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            {a.daEquipe && onApagar && (
              <button
                type="button"
                onClick={() => onApagar(a.id)}
                className="inline-flex items-center gap-1 text-danger hover:underline"
              >
                <Trash2 className="h-3 w-3" aria-hidden /> Apagar
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{a.titulo}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{a.texto}</p>
        </li>
      ))}
    </ol>
  );
}
