"use client";

import { useState } from "react";
import { Check, Copy, Scale } from "lucide-react";
import { BuscaAcoes } from "./BuscaAcoes";
import { ListaAtualizacoes } from "./Atualizacoes";
import { ABERTURA, GRUPOS, MATERIAS, NIVEIS, type Nivel } from "./dados";

function useCopiar() {
  const [copiado, setCopiado] = useState<string | null>(null);
  async function copiar(chave: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  }
  return { copiado, copiar };
}

export default function MateriasPage() {
  const [materiaId, setMateriaId] = useState(MATERIAS[0].id);
  const [nivel, setNivel] = useState<Nivel>("simples");
  const [soColetivas, setSoColetivas] = useState(false);
  const { copiado, copiar } = useCopiar();
  const materia = MATERIAS.find((m) => m.id === materiaId) ?? MATERIAS[0];
  const texto = materia.resumos[nivel];

  return (
    <main className="min-h-screen bg-surface px-4 py-8 font-sans text-foreground">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Base para atendimento</p>
            <h1 className="font-display text-2xl font-semibold tracking-wide sm:text-3xl">Dúvidas e atualizações</h1>
            <p className="mt-1 text-sm text-muted">
              Confirme o nome do cliente, veja a ação e as últimas decisões, e copie a resposta pronta.
            </p>
          </div>
        </header>

        <section className="industrial-panel mb-6 rounded-2xl p-5 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">Passo 1</p>
              <h2 className="text-lg font-semibold">Primeira mensagem ao cliente</h2>
            </div>
            <button
              type="button"
              onClick={() => copiar("abertura", ABERTURA)}
              className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              {copiado === "abertura" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copiado === "abertura" ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="soft-card rounded-xl p-4 leading-relaxed">{ABERTURA}</p>
        </section>

        <BuscaAcoes />

        <section className="industrial-panel rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Passo 3</p>
          <h2 className="mb-3 text-lg font-semibold">Explicar a ação</h2>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">Trocar matéria ({MATERIAS.length})</p>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={soColetivas} onChange={(e) => setSoColetivas(e.target.checked)} />
              Só ações coletivas
            </label>
          </div>
          <div className="mb-4 space-y-3">
            {GRUPOS.map((g) => {
              const itens = MATERIAS.filter((m) => m.grupo === g.id && (!soColetivas || m.coletiva));
              if (!itens.length) return null;
              return (
                <div key={g.id}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{g.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {itens.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMateriaId(m.id)}
                        className={`nav-pill flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                          m.id === materiaId ? "nav-pill-active" : "nav-pill-idle"
                        }`}
                      >
                        {m.titulo}
                        {m.coletiva && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Coletiva</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Tamanho do resumo">
            {NIVEIS.map((n) => (
              <button
                key={n.id}
                type="button"
                role="tab"
                aria-selected={n.id === nivel}
                onClick={() => setNivel(n.id)}
                className={`soft-card soft-card-hover rounded-xl p-3 text-left ${
                  n.id === nivel ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="block text-sm font-semibold">{n.nome}</span>
                <span className="hidden text-xs text-muted sm:block">{n.dica}</span>
              </button>
            ))}
          </div>

          <article className="soft-card rounded-xl p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold">{materia.titulo}</h3>
                <p className="text-sm text-muted">{materia.subtitulo}</p>
              </div>
              <button
                type="button"
                onClick={() => copiar("resumo", `${materia.titulo}\n\n${texto.join("\n\n")}`)}
                className="btn-primary flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                {copiado === "resumo" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copiado === "resumo" ? "Copiado" : "Copiar"}
              </button>
            </div>
            <div className="space-y-4 leading-relaxed">
              {texto.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="mb-3 text-sm font-semibold">Linha do tempo da ação</h4>
              <ListaAtualizacoes itens={materia.atualizacoes} />
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h4 className="mb-2 text-sm font-semibold text-muted">Fontes</h4>
              <ul className="space-y-1 text-sm">
                {materia.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {f.nome}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </section>

        <p className="mt-4 text-xs text-muted">
          Pesquisa em fontes públicas feita em novembro de 2026. Antes de passar prazo ou valor ao cliente, confira o andamento no processo.
        </p>
      </div>
    </main>
  );
}
