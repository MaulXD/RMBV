export const ONBOARDING_STEPS: Record<string, { title: string; body: string }[]> = {
  ADMIN: [
    { title: "Painel de clientes", body: "Filtre por tese, status e exporte em lote." },
    { title: "Ferramentas", body: "PDF, validadores e templates na aba Ferramentas." },
    { title: "Busca global", body: "Use Ctrl+K em qualquer tela para achar clientes e chamados." },
  ],
  ADV: [
    { title: "Kanban da equipe", body: "Organize tarefas e acompanhe prazos." },
    { title: "Chamados", body: "Registre bugs e solicitações da equipe." },
    { title: "Ferramentas PDF", body: "Junte, organize e salve documentos no cliente." },
  ],
  GERENTE: [
    { title: "Clientes", body: "Acompanhe status e finalize cadastros." },
    { title: "Relatórios", body: "Metas e timeline da equipe." },
    { title: "Busca rápida", body: "Ctrl+K para localizar qualquer registro." },
  ],
  COLABORADOR: [
    { title: "Seus clientes", body: "Atualize status e registre contatos no histórico." },
    { title: "Ferramentas", body: "PDF e validadores disponíveis para você." },
    { title: "Kanban", body: "Veja tarefas atribuídas a você." },
  ],
};
