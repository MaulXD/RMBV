# Relatório de auditoria — RMBV (27/05/2026)

## Resumo

Passagem focada em UI (ícones, temas), painel admin (equipes/usuários) e menu responsivo. Deploy em produção depende de `git push` + build Vercel com `prisma db push` e seed.

## Corrigido nesta entrega

| Área | Problema | Correção |
|------|----------|----------|
| UI | Sem ícones; selects “crus” | `lucide-react`, `Icon`, `SelectField` com chevron; nav, botões, login, cópia |
| Tema | Claro muito forte / escuro cansativo | Tokens em `globals.css`: claro `#eeeff1`/`#f7f7f8`, escuro `#16171a`/`#1f2126` |
| Menu | Hamburger no desktop sem nav útil | Nav visível a partir de `md`; hamburger só `< md` |
| Admin | Não criava equipes/ADVs/usuários no painel | Abas **Equipes**, **Usuários**, **Importar CSV**; APIs `/api/teams` e `/api/admin/users` |
| Equipes | Erro confuso ao criar ADV incompleto | Validação Zod: nome+email+senha ou nenhum |
| Cópia | Caracteres Unicode feios | `CopyButton` com ícones check/copy |

## Riscos / pendências conhecidas

1. **Banco produção** — Se tabela `Team` não existir, APIs retornam 503 com mensagem explícita. Solução: deploy com `db push` + `db:seed`.
2. **OpenAI 429** — Cota/billing na OpenAI; não é bug de código.
3. **Admin cria tese** — POST `/api/teses` exige `teamId` no body para ADMIN.
4. **“Gerenciar teses”** na barra de filtro aponta para `/equipe#teses` (fluxo ADV); admin gerencia teses via contexto de equipe ou futura tela dedicada.
5. **Edição/remoção** de usuários e equipes — ainda não há UI (só criação e listagem).
6. **Windows dev** — `prisma generate` pode falhar com EPERM se `next dev` estiver rodando.

## Tolices / melhorias futuras (não bloqueantes)

- Paginação na lista de clientes com muitos registros
- Reset de senha pelo admin
- Desativar usuário/equipe sem apagar
- Ícones nos `<option>` não são suportados nativamente; chevron no wrapper é o padrão usado
- Testes E2E automatizados inexistentes

## Arquivos principais alterados

- `src/components/AppShell.tsx`, `ui/Icon.tsx`, `ui/SelectField.tsx`
- `src/app/globals.css`, `src/app/admin/page.tsx`
- `src/components/TeamAdminPanel.tsx`, `AdminUsersPanel.tsx`
- `src/app/api/admin/users/route.ts`, `src/app/api/teams/route.ts`

## Verificação recomendada pós-deploy

1. Login Admin → `/admin` → aba Equipes → criar “Equipe Teste” com ADV
2. Aba Usuários → criar Gerente/Colaborador na mesma equipe
3. Aba Importar CSV com equipe selecionada
4. Redimensionar janela: ≥768px nav horizontal; &lt;768px menu lateral
5. `/api/health` — `DATABASE_URL`, `JWT_SECRET`, `blob_storage` conforme env
