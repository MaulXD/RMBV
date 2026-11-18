"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Plus, Search, UserPlus } from "lucide-react";
import { juntarAtualizacoes, materiaDaTese, quandoTexto, type Atualizacao } from "./dados";
import { ListaAtualizacoes } from "./Atualizacoes";
import { CadastroCliente } from "./CadastroCliente";

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
  teseId: string | null;
  teseRef: { name: string } | null;
  acoes: Acao[];
};
type Tese = { id: string; name: string; _count: { clients: number } };
type AtualizacaoApi = { id: string; data: string; titulo: string; texto: string; fonteUrl: string | null };

const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "");

function etapa(a: Acao) {
  if (a.sentencaAt) return `Sentença em ${fmt(a.sentencaAt)}${a.sentencaResultado ? ` (${a.sentencaResultado})` : ""}`;
  if (a.entradaAt) return `Processo ajuizado em ${fmt(a.entradaAt)}, aguardando sentença`;
  if (a.docsEnviadosAt) return `Documentos enviados em ${fmt(a.docsEnviadosAt)}, aguardando ajuizamento`;
  if (a.advConfirmadoAt) return `Advogado confirmado em ${fmt(a.advConfirmadoAt)}, aguardando documentos`;
  return "Ação cadastrada, ainda sem andamento";
}

function primeiroNome(nome: string) {
  const p = nome.trim().split(/\s+/)[0] ?? "";
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

function textoCliente(c: Cliente, ultimas: Atualizacao[]) {
  const nome = primeiroNome(c.name);
  const partes: string[] = [];
  const acaoNome = c.teseRef?.name;
  const ultima = ultimas[0];
  if (ultima) {
    partes.push(
      `${nome}, sobre a sua ação${acaoNome ? ` (${acaoNome})` : ""}: a última atualização foi em ${quandoTexto(ultima)}. ${ultima.titulo}. ${ultima.texto}`,
    );
  }
  for (const a of c.acoes) {
    const num = a.numCNJ || a.numProcesso;
    const e = etapa(a);
    let t = `${partes.length ? "Sobre" : `${nome}, sobre`} o seu processo${num ? ` ${num}` : ""}: ${e.charAt(0).toLowerCase() + e.slice(1)}.`;
    const mov = a.movimentacoes[0];
    if (mov) t += ` A última movimentação foi em ${fmt(mov.data)}: ${mov.texto}`;
    else if (a.ultimaMovimentacaoText) t += ` A última movimentação foi em ${fmt(a.ultimaMovimentacaoAt)}: ${a.ultimaMovimentacaoText}`;
    partes.push(t);
  }
  if (!partes.length) {
    partes.push(
      `${nome}, seu cadastro está${acaoNome ? ` na ação ${acaoNome}` : " com o escritório"}. Ainda não há decisão nova para informar. Assim que houver andamento, a gente te avisa.`,
    );
  } else {
    partes.push("Qualquer novidade, a gente te avisa por aqui.");
  }
  return partes.join("\n\n");
}

export function BuscaAcoes() {
  const [teses, setTeses] = useState<Tese[]>([]);
  const [teseId, setTeseId] = useState("");
  const [q, setQ] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [daEquipe, setDaEquipe] = useState<Record<string, AtualizacaoApi[]>>({});
  const [podeEditar, setPodeEditar] = useState(false);
  const [estado, setEstado] = useState<"carregando" | "sem-login" | "ok" | "erro">("carregando");
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [novaAberta, setNovaAberta] = useState(false);

  async function buscar(tid: string, termo: string) {
    setBuscando(true);
    try {
      const params = new URLSearchParams();
      if (tid) params.set("teseId", tid);
      if (termo) params.set("q", termo);
      const r = await fetch(`/api/materias/busca?${params}`, { credentials: "include" });
      if (r.status === 401) {
        setEstado("sem-login");
        return;
      }
      if (!r.ok) throw new Error();
      const j = await r.json();
      setTeses(j.teses);
      setClientes(j.clientes);
      setDaEquipe(j.atualizacoes ?? {});
      setPodeEditar(!!j.usuario?.podeEditar);
      setEstado("ok");
      setBuscou(!!tid || termo.trim().length >= 3);
    } catch {
      setEstado("erro");
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    void buscar("", "");
  }, []);

  const teseNomes = useMemo(() => Object.fromEntries(teses.map((t) => [t.id, t.name])), [teses]);

  function atualizacoesDa(tid: string | null, nome?: string | null): Atualizacao[] {
    const equipe: Atualizacao[] = tid ? (daEquipe[tid] ?? []).map((a) => ({ ...a })) : [];
    const publicas = materiaDaTese(nome ?? (tid ? teseNomes[tid] : null))?.atualizacoes ?? [];
    return juntarAtualizacoes(equipe, publicas);
  }

  async function copiar(c: Cliente) {
    try {
      await navigator.clipboard.writeText(textoCliente(c, atualizacoesDa(c.teseId, c.teseRef?.name)));
      setCopiadoId(c.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      setCopiadoId(null);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta atualização?")) return;
    const r = await fetch(`/api/materias/atualizacoes?id=${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) void buscar(teseId, q);
  }

  const teseSel = teses.find((t) => t.id === teseId);
  const atualizacoesSel = teseId ? atualizacoesDa(teseId) : [];

  return (
    <section className="industrial-panel mb-6 rounded-2xl p-5 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Passo 2</p>
          <h2 className="text-lg font-semibold">Buscar o cliente e ver as atualizações</h2>
        </div>
        {estado === "ok" && (
          <button type="button" onClick={() => setCadastroAberto((v) => !v)} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Cadastrar cliente
          </button>
        )}
      </div>

      {estado === "carregando" && <p className="text-sm text-muted">Carregando...</p>}

      {estado === "sem-login" && (
        <div className="soft-card rounded-xl p-4 text-sm">
          <p>A busca, as atualizações de cada processo e o cadastro mostram dados de clientes, então só funcionam com login.</p>
          <a href="/login?from=/materias" className="btn-primary mt-3 inline-flex px-4 py-2 text-sm">
            Entrar no SCS
          </a>
        </div>
      )}

      {estado === "erro" && <p className="text-sm text-danger">Não foi possível buscar agora. Tente de novo.</p>}

      {estado === "ok" && (
        <>
          {cadastroAberto && (
            <div className="mb-4">
              <CadastroCliente
                teses={teses}
                teseInicial={teseId}
                nomeInicial={q.trim().length >= 3 && !/\d/.test(q) ? q.trim() : ""}
                onCriado={(nome) => {
                  setQ(nome);
                  void buscar(teseId, nome);
                }}
                onFechar={() => setCadastroAberto(false)}
              />
            </div>
          )}

          <form
            className="filter-bar flex flex-col gap-2 rounded-xl p-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void buscar(teseId, q);
            }}
          >
            <select
              value={teseId}
              onChange={(e) => {
                setTeseId(e.target.value);
                setNovaAberta(false);
                void buscar(e.target.value, q);
              }}
              className="industrial-input sm:w-64"
              aria-label="Ação"
            >
              <option value="">Todas as ações</option>
              {teses.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t._count.clients})
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nome, CPF ou número do processo"
                className="industrial-input w-full pl-8"
              />
            </div>
            <button className="btn-primary px-4 py-2 text-sm" disabled={buscando}>
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </form>
          {!teseId && q.trim().length < 3 && (
            <p className="mt-2 text-xs text-muted">Escolha a ação ou digite pelo menos 3 letras.</p>
          )}

          {teseSel && (
            <div className="soft-card mt-4 rounded-xl p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Atualizações da ação {teseSel.name}</h3>
                {podeEditar && (
                  <button type="button" onClick={() => setNovaAberta((v) => !v)} className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Registrar atualização
                  </button>
                )}
              </div>
              {novaAberta && (
                <NovaAtualizacao
                  teseId={teseSel.id}
                  onSalva={() => {
                    setNovaAberta(false);
                    void buscar(teseId, q);
                  }}
                />
              )}
              <ListaAtualizacoes
                itens={atualizacoesSel}
                vazio="Nenhuma atualização registrada para esta ação. Use Registrar atualização quando sair uma decisão."
                onApagar={podeEditar ? apagar : undefined}
              />
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {clientes.map((c) => {
              const ultimas = atualizacoesDa(c.teseId, c.teseRef?.name);
              return (
                <li key={c.id} className="soft-card rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">
                        {c.teseRef?.name ?? "Sem ação definida"}
                        {c.cpf ? ` · CPF ${c.cpf}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <a href={`/clients/${c.id}`} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 text-xs">
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Abrir
                      </a>
                      <button type="button" onClick={() => copiar(c)} className="btn-primary flex items-center gap-1 px-2.5 py-1.5 text-xs">
                        {copiadoId === c.id ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                        {copiadoId === c.id ? "Copiado" : "Copiar resposta"}
                      </button>
                    </div>
                  </div>

                  {ultimas[0] && !teseSel && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Última atualização da ação</p>
                      <ListaAtualizacoes itens={ultimas} limite={1} />
                    </div>
                  )}

                  {c.acoes.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Sem processo individual cadastrado.</p>
                  ) : (
                    c.acoes.map((a) => (
                      <div key={a.id} className="mt-3 border-t border-border pt-3 text-sm">
                        <p className="font-medium text-foreground">
                          {a.numCNJ || a.numProcesso || "Sem número"}
                          {a.tribunal ? ` · ${a.tribunal}` : ""}
                          {a.vara ? ` · ${a.vara}` : ""}
                        </p>
                        <p className="text-muted">{etapa(a)}</p>
                        {a.movimentacoes.length > 0 ? (
                          <ol className="mt-2 space-y-1">
                            {a.movimentacoes.map((m) => (
                              <li key={m.id} className="flex gap-2">
                                <span className="shrink-0 tabular-nums text-muted">{fmt(m.data)}</span>
                                <span>{m.texto}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-1 text-muted">Nenhuma movimentação registrada ainda.</p>
                        )}
                        {a.ultimaConsultaAt && (
                          <p className="mt-1 text-xs text-muted">Consultado no tribunal em {fmt(a.ultimaConsultaAt)}</p>
                        )}
                      </div>
                    ))
                  )}
                </li>
              );
            })}
            {buscou && clientes.length === 0 && !buscando && (
              <li className="soft-card rounded-xl p-4 text-sm text-muted">
                Nenhum cliente encontrado.{" "}
                <button type="button" onClick={() => setCadastroAberto(true)} className="font-medium text-primary hover:underline">
                  Cadastrar agora
                </button>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}

function NovaAtualizacao({ teseId, onSalva }: { teseId: string; onSalva: () => void }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [fonteUrl, setFonteUrl] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const r = await fetch("/api/materias/atualizacoes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teseId, data, titulo, texto, fonteUrl: fonteUrl || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErro(d.error ?? "Não foi possível salvar.");
      onSalva();
    } catch {
      setErro("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="mb-4 grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[10rem_1fr]">
      <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="industrial-input" required aria-label="Data" />
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex.: TRF5 marca julgamento)" className="industrial-input" required />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="O que foi decidido e o que muda para o cliente"
        className="industrial-input sm:col-span-2"
        required
      />
      <input value={fonteUrl} onChange={(e) => setFonteUrl(e.target.value)} placeholder="Link da fonte (opcional)" className="industrial-input sm:col-span-2" />
      {erro && <p className="text-sm text-danger sm:col-span-2">{erro}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={salvando} className="btn-primary px-4 py-2 text-sm">
          {salvando ? "Salvando..." : "Salvar atualização"}
        </button>
      </div>
    </form>
  );
}
