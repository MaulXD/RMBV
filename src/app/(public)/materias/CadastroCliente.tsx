"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import type { Advogado } from "./BuscaAcoes";

type Tese = { id: string; name: string };
type Categoria = { id: string; name: string };

export function CadastroCliente({
  teses,
  advogados,
  teseInicial,
  nomeInicial,
  onCriado,
  onFechar,
}: {
  teses: Tese[];
  advogados: Advogado[];
  teseInicial: string;
  nomeInicial: string;
  onCriado: (nome: string) => void;
  onFechar: () => void;
}) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nome, setNome] = useState(nomeInicial);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [teseId, setTeseId] = useState(teseInicial);
  const [categoriaId, setCategoriaId] = useState("");
  const [advogadoId, setAdvogadoId] = useState("");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [criado, setCriado] = useState<{ id: string; nome: string; aviso: string } | null>(null);

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => {
        const lista: Categoria[] = d.categories ?? [];
        setCategorias(lista);
        if (lista.length === 1) setCategoriaId(lista[0].id);
      })
      .catch(() => setCategorias([]));
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (nome.trim().length < 3) return setErro("Digite o nome completo.");
    if (!categoriaId) return setErro("Escolha a categoria.");
    setEnviando(true);
    try {
      const r = await fetch("/api/clients", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome.trim().toUpperCase(),
          cpf: cpf.trim() || null,
          phone1: telefone.trim() || null,
          teseId: teseId || null,
          categoryId: categoriaId,
          pesquisa: obs.trim() ? `Cadastrado pelo atendimento (/materias): ${obs.trim()}` : null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(d.error ?? "Não foi possível cadastrar.");
        return;
      }
      let aviso = "";
      if (advogadoId && d.client?.id) {
        const v = await fetch("/api/materias/vincular", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: d.client.id, advogadoId }),
        });
        if (!v.ok) {
          const dv = await v.json().catch(() => ({}));
          aviso = dv.error ?? "Cliente cadastrado, mas não foi possível definir o advogado.";
        }
      }
      setCriado({ id: d.client?.id, nome: nome.trim(), aviso });
      onCriado(nome.trim());
    } catch {
      setErro("Não foi possível cadastrar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (criado) {
    return (
      <div className="soft-card rounded-xl p-4">
        <p className="text-sm font-semibold text-success">Cliente cadastrado: {criado.nome}</p>
        {criado.aviso && <p className="mt-1 text-sm text-danger">{criado.aviso}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {criado.id && (
            <a href={`/clients/${criado.id}`} className="btn-primary px-3 py-1.5 text-xs">
              Abrir cadastro completo
            </a>
          )}
          <button type="button" onClick={onFechar} className="btn-ghost px-3 py-1.5 text-xs">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="soft-card space-y-3 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Cadastrar cliente</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Nome completo</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} className="industrial-input w-full" required />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">CPF</span>
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" placeholder="000.000.000-00" className="industrial-input w-full" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Telefone ou WhatsApp</span>
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" className="industrial-input w-full" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Ação</span>
          <select value={teseId} onChange={(e) => setTeseId(e.target.value)} className="industrial-input w-full">
            <option value="">Sem ação definida</option>
            {teses.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-muted">Categoria</span>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="industrial-input w-full" required>
            <option value="">Escolha</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {advogados.length > 0 && (
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted">Advogado responsável</span>
            <select value={advogadoId} onChange={(e) => setAdvogadoId(e.target.value)} className="industrial-input w-full">
              <option value="">Definir depois</option>
              {advogados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.role === "GERENTE" ? " (gerente)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">Observação do atendimento</span>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="industrial-input w-full" />
        </label>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="btn-primary px-4 py-2 text-sm">
          {enviando ? "Cadastrando..." : "Cadastrar"}
        </button>
        <button type="button" onClick={onFechar} className="btn-ghost px-4 py-2 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
