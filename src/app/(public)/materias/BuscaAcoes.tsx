"use client";

import { useEffect, useState } from "react";

type Mov = { id: string; data: string; texto: string; tipo: string | null };
type Acao = {
  id: string;
  numProcesso: string | null;
  numCNJ: string | null;
  tribunal: string | null;
  vara: string | null;
  classe: string | null;
  advConfirmadoAt: string | null;
  docsEnviadosAt: string | null;
  entradaAt: string | null;
  sentencaAt: string | null;
  sentencaResultado: string | null;
  ultimaMovimentacaoAt: string | null;
  ultimaMovimentacaoText: string | null;
  ultimaConsultaAt: string | null;
  movimentacoes: Mov[];
};
type Cliente = {
  id: string;
  name: string;
  cpf: string | null;
  status: string;
  teseRef: { name: string } | null;
  acoes: Acao[];
};
type Tese = { id: string; name: string; _count: { clients: number } };

const data = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "");

function etapa(a: Acao) {
  if (a.sentencaAt) return `Sentença em ${data(a.sentencaAt)}${a.sentencaResultado ? ` (${a.sentencaResultado})` : ""}`;
  if (a.entradaAt) return `Processo ajuizado em ${data(a.entradaAt)}, aguardando sentença`;
  if (a.docsEnviadosAt) return `Documentos enviados em ${data(a.docsEnviadosAt)}, aguardando ajuizamento`;
  if (a.advConfirmadoAt) return `Advogado confirmado em ${data(a.advConfirmadoAt)}, aguardando documentos`;
  return "Ação cadastrada, ainda sem andamento";
}

function textoCliente(c: Cliente) {
  const primeiro = c.name.split(" ")[0];
  const nome = primeiro.charAt(0) + primeiro.slice(1).toLowerCase();
  if (!c.acoes.length) {
    return `${nome}, seu cadastro está na ação ${c.teseRef?.name ?? ""}. O processo ainda não tem número na Justiça, então não há decisão para informar. Assim que houver andamento, o escritório te avisa.`;
  }
  return c.acoes
    .map((a) => {
      const num = a.numCNJ || a.numProcesso;
      const ult = a.movimentacoes[0];
      const linhas = [`${nome}, sobre o seu processo${num ? ` ${num}` : ""}: ${etapa(a).charAt(0).toLowerCase() + etapa(a).slice(1)}.`];
      if (ult) linhas.push(`A última movimentação foi em ${data(ult.data)}: ${ult.texto}`);
      else if (a.ultimaMovimentacaoText) linhas.push(`A última movimentação foi em ${data(a.ultimaMovimentacaoAt)}: ${a.ultimaMovimentacaoText}`);
      return linhas.join(" ");
    })
    .join("\n\n");
}

export function BuscaAcoes() {
  const [teses, setTeses] = useState<Tese[]>([]);
  const [teseId, setTeseId] = useState("");
  const [q, setQ] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estado, setEstado] = useState<"carregando" | "sem-login" | "ok" | "erro">("carregando");
  const [buscando, setBuscando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  async function buscar(tid: string, termo: string) {
    setBuscando(true);
    try {
      const params = new URLSearchParams();
      if (tid) params.set("teseId", tid);
      if (termo) params.set("q", termo);
      const r = await fetch(`/api/materias/busca?${params}`, { credentials: "include" });
      if (r.status === 401 || r.status === 403) {
        setEstado("sem-login");
        return;
      }
      if (!r.ok) throw new Error();
      const j = await r.json();
      setTeses(j.teses);
      setClientes(j.clientes);
      setEstado("ok");
    } catch {
      setEstado("erro");
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    void buscar("", "");
  }, []);

  async function copiar(c: Cliente) {
    try {
      await navigator.clipboard.writeText(textoCliente(c));
      setCopiadoId(c.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      setCopiadoId(null);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold">2. Buscar o cliente e ver as últimas decisões</h2>

      {estado === "carregando" && <p className="text-sm text-slate-500">Carregando...</p>}

      {estado === "sem-login" && (
        <p className="text-sm text-slate-700">
          A busca mostra dados de clientes, então só funciona com login.{" "}
          <a href="/login" className="font-medium text-blue-700 underline">Entrar no SCS</a> e voltar para esta página.
        </p>
      )}

      {estado === "erro" && <p className="text-sm text-red-600">Não foi possível buscar agora. Tente de novo.</p>}

      {estado === "ok" && (
        <>
          <form
            className="mt-2 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void buscar(teseId, q);
            }}
          >
            <select
              value={teseId}
              onChange={(e) => {
                setTeseId(e.target.value);
                void buscar(e.target.value, q);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Ação"
            >
              <option value="">Todas as ações</option>
              {teses.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t._count.clients})
                </option>
              ))}
            </select>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, CPF ou número do processo"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>
          {!teseId && q.trim().length < 3 && (
            <p className="mt-2 text-xs text-slate-500">Escolha a ação ou digite pelo menos 3 letras.</p>
          )}

          <ul className="mt-4 space-y-3">
            {clientes.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.teseRef?.name ?? "Sem ação definida"}
                      {c.cpf ? ` · CPF ${c.cpf}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={`/clients/${c.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                      Abrir
                    </a>
                    <button onClick={() => copiar(c)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                      {copiadoId === c.id ? "Copiado" : "Copiar resposta"}
                    </button>
                  </div>
                </div>

                {c.acoes.length === 0 && (
                  <p className="mt-2 text-sm text-slate-600">Ainda sem processo cadastrado para este cliente.</p>
                )}

                {c.acoes.map((a) => (
                  <div key={a.id} className="mt-3 border-t border-slate-100 pt-3 text-sm">
                    <p className="font-medium">
                      {a.numCNJ || a.numProcesso || "Sem número"}
                      {a.tribunal ? ` · ${a.tribunal}` : ""}
                      {a.vara ? ` · ${a.vara}` : ""}
                    </p>
                    <p className="text-slate-600">{etapa(a)}</p>
                    {a.movimentacoes.length > 0 ? (
                      <ol className="mt-2 space-y-1">
                        {a.movimentacoes.map((m) => (
                          <li key={m.id} className="flex gap-2">
                            <span className="shrink-0 tabular-nums text-slate-500">{data(m.data)}</span>
                            <span>{m.texto}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-slate-500">Nenhuma movimentação registrada ainda.</p>
                    )}
                    {a.ultimaConsultaAt && (
                      <p className="mt-1 text-xs text-slate-400">Consultado no tribunal em {data(a.ultimaConsultaAt)}</p>
                    )}
                  </div>
                ))}
              </li>
            ))}
            {clientes.length === 0 && (teseId || q.trim().length >= 3) && !buscando && (
              <li className="text-sm text-slate-500">Nenhum cliente encontrado.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
