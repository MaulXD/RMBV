# RMBV — Documento Vivo de Desenvolvimento

> Gerado e mantido automaticamente junto com o código. Toda vez que uma alteração for solicitada no chat com o assistente, este arquivo deve ser atualizado na mesma sessão.
>
> **Para retomar em novo chat:** diga _"Leia `docs/DESENVOLVIMENTO.md` antes de qualquer alteração"_.

---

## 1. Visão geral

**RMBV** é uma plataforma interna para escritórios de advocacia gerenciarem clientes jurídicos com múltiplas equipes e teses (categorias jurídicas). Controla o ciclo de vida do cliente desde a captação até a finalização, com Kanban, chamados, documentos, relatórios, chat interno e ponto eletrônico facial.

| Item | Valor |
|---|---|
| URL produção | https://rmbv.vercel.app |
| Repositório | https://github.com/MaulXD/RMBV |
| Framework | Next.js 15 — App Router + Turbopack |
| Linguagem | TypeScript + React 19 |
| Estilo | Tailwind CSS v4 (config via `@theme` no CSS, sem `tailwind.config.ts`) |
| Banco | PostgreSQL via Prisma ORM (Neon em produção e dev) |
| Auth | JWT com `jose` + cookies httpOnly + bcrypt |
| Storage | Vercel Blob (produção) / pasta `storage/` (dev local) |
| PDF | pdf-lib, pdfkit, pdfjs-dist |
| OCR | Tesseract.js |
| Reconhecimento facial | `@vladmandic/face-api` (modelos em `/public/models`) |
| Validação | Zod |
| Deploy | Vercel (auto-deploy a cada push em `main`) |

---

## 2. Estrutura de arquivos

```
src/
├── app/
│   ├── globals.css              ← PALETA, GLASSMORPHISM, CLASSES UTILITÁRIAS
│   ├── layout.tsx               ← fonts, meta tags, providers globais
│   ├── page.tsx                 ← landing pública
│   ├── login/                   ← login glassmorphism
│   └── (app)/                   ← route group autenticado (layout compartilhado)
│       ├── layout.tsx           ← LAYOUT PRINCIPAL (sidebar + bottom nav + chat)
│       ├── dashboard/           ← listagem de clientes
│       ├── clients/[id]/        ← perfil (abas: Perfil, Pesquisa, Revisão, Histórico, Tarefas, Parentes)
│       ├── kanban/
│       ├── chamados/
│       ├── ferramentas/         ← PDF, validadores, OCR, templates
│       ├── reports/
│       ├── equipe/              ← Configurações (ADV): Teses, Membros, Kanban
│       ├── admin/               ← Equipes, Usuários, Teses, Clientes, CSV, Auditoria
│       ├── acesso/              ← histórico de logins + horários por colaborador
│       ├── ponto/               ← ponto eletrônico com reconhecimento facial
│       ├── perfil/              ← foto de perfil + cadastro facial
│       └── pesquisa/
│   └── api/
│       ├── auth/                ← login, logout (POST + redirect 303), /me
│       ├── clients/             ← CRUD + documentos + histórico + bulk
│       ├── chat/                ← mensagens em tempo real (equipe + DM)
│       ├── ponto/               ← registro e consulta de ponto
│       ├── equipe/              ← schedule-check, horários, membros
│       ├── notifications/
│       ├── reports/             ← stats, PDF, pesquisa, timeline
│       └── admin/
├── components/
│   ├── Sidebar.tsx              ← sidebar colapsável (desktop) + overlay (mobile)
│   ├── MobileBottomNav.tsx      ← nav inferior mobile: Clientes, Kanban, Chat, Menu
│   ├── ChatFloating.tsx         ← messenger flutuante (desktop) / full-screen (mobile)
│   ├── NotificationBell.tsx     ← portal no document.body
│   ├── AccessBlockedScreen.tsx  ← bloqueio full-screen fora do horário (COLABORADOR)
│   ├── ClientDocuments.tsx      ← upload drag-and-drop + tags
│   ├── ClientsTable.tsx
│   ├── TeseManager.tsx
│   ├── GlobalSearchPalette.tsx
│   └── ui/
└── lib/
    ├── document-storage.ts      ← Blob / disco; imagens convertidas para WebP
    ├── roles.ts
    ├── automations.ts
    └── prisma.ts

prisma/
├── schema.prisma
└── seed.ts
```

> **Nota:** `AppShell.tsx` foi **removido** — o layout autenticado está em `(app)/layout.tsx` + `Sidebar.tsx`.

---

## 3. Sistema de cores e temas

Arquivo: `src/app/globals.css`

Visual unificado com **glassmorphism** (mesmo DNA da tela de login). Dark mode usa fundo índigo/violeta profundo com orbs e grid sutil.

### Modo claro (atual — neutro azul-ardósia)
```css
--color-surface: #dce3ef
--color-surface-elevated: #edf1f8
--color-foreground: #1a2035
--color-muted: #56637a
--color-border: #bfc9db
--color-primary: #4f46e5
```

### Modo escuro (glass índigo/violeta)
```css
--color-surface: #080c18
--color-surface-elevated: #0f1428
--color-foreground: #e2e4f0
--color-muted: #8b8fb8
--color-border: rgb(255 255 255 / 0.10)
--color-primary: #6366f1
```

Alternância via `ThemeProvider` + `localStorage`. Botão sol/lua no rodapé da sidebar.

### Classes utilitárias relevantes
| Classe | Uso |
|---|---|
| `.sidebar-glass` / `.sidebar-nav-link` | Sidebar com blur e link ativo via pseudo-elemento |
| `.soft-card` / `.panel-solid` | Cards e painéis |
| `.btn-primary` / `.btn-ghost` / `.btn-danger` | Botões |
| `.industrial-input` | Inputs e selects estilizados |
| `.page-header` / `.tab-bar` | Cabeçalhos e abas compartilhados |
| `.safe-area-bottom` | Padding para bottom nav no mobile |

---

## 4. Layout — Sidebar + mobile

Arquivos: `src/app/(app)/layout.tsx`, `src/components/Sidebar.tsx`, `src/components/MobileBottomNav.tsx`

### Desktop
- Sidebar **colapsável** (240px ↔ 56px), estado em `localStorage` (`sidebar-collapsed`)
- Sticky, altura total da viewport
- Orbs + grid no dark mode (atmosphere layer)

### Mobile
- **Top bar** — hamburger, logo, busca, notificações
- **Bottom nav** fixa — Clientes · Kanban · Chat · Menu (abre sidebar overlay)
- **Chat** abre full-screen; demais páginas com `pb-24` para não ficar atrás da bottom nav
- Sidebar deslizante com backdrop

### Navegação por grupos

| Grupo | Item | Quem vê |
|---|---|---|
| Trabalho | Clientes, Kanban, Chamados | Todos autenticados |
| Trabalho | Relatórios, Ferramentas | Todos exceto `PESQUISADOR` |
| Trabalho | Ponto facial | `COLABORADOR`, `PESQUISADOR` (grupo Trabalho) |
| Trabalho | APA | Todos (badge **Em breve**) |
| Sistema | Acesso | `GERENTE`, `ADV`, `ADMIN` |
| Sistema | Configurações | `ADV` |
| Sistema | Ponto facial | `GERENTE`, `ADMIN` (grupo Sistema) |
| Sistema | Administração | `ADMIN` |

`COLABORADOR` e `PESQUISADOR` **não veem** o grupo Sistema — acessam ponto pelo grupo Trabalho.

**Sessão:** `SessionProvider` com cache em memória + `localStorage` (`primeSessionCache`) para evitar flash ao navegar ou abrir nova aba.

**Logout:** `fetch POST /api/auth/logout` + `window.location.assign("/")`. A rota responde **303** (evita HTTP 405 por re-POST na home).

---

## 5. Upload de documentos

Arquivo: `src/components/ClientDocuments.tsx`  
API: `src/app/api/clients/[id]/documents/route.ts`  
Storage: `src/lib/document-storage.ts`

### Fluxo
1. Drag-and-drop ou seletor de arquivo
2. Formulário inline com checkboxes de tipo (RG, CPF, Contrato, etc.) + campo livre
3. `FormData` → Vercel Blob (prod) ou `storage/` (dev)
4. Tags em `ClientDocument.tags` (JSON); badges nos cards

### Imagens
Uploads de imagem são **convertidos para WebP** automaticamente antes de persistir.

### Tipos permitidos
PDF, JPEG, PNG, WebP, TXT, Word, Excel — máx. 15 MB

---

## 6. Notificações

Arquivo: `src/components/NotificationBell.tsx`

Painel via **`createPortal`** no `document.body` (z-index acima do header). Posição calculada com `getBoundingClientRect()` no resize/scroll.

No mobile, overlay escuro semi-transparente ao abrir; altura máxima adaptada à viewport (`100dvh`).

---

## 7. Chat interno

Arquivos: `src/components/ChatFloating.tsx`, `src/app/api/chat/`  
Modelo: `ChatMessage` (equipe + DM opcional por `receiverId`)

- **Desktop:** painel flutuante estilo messenger
- **Mobile:** full-screen ao tocar na bottom nav
- Badge de não lidas na bottom nav
- Avatares com foto (`User.avatarUrl`) ou iniciais
- Polling periódico para novas mensagens

---

## 8. Ponto eletrônico facial

Arquivos: `src/components/ponto/SelfServicePonto.tsx`, `src/components/ponto/AdminPontoView.tsx`, `src/lib/face-verify.ts`  
Modelos: `/public/models` (face-api)  
Modelo DB: `PontoRecord` (`ENTRADA` / `SAIDA` / intervalo, `origin`, GPS)

- Colaborador/Pesquisador: bater próprio ponto em `/ponto` + cadastrar rosto em `/perfil`
- Gerente/Admin: painel da equipe + cadastro facial de membros
- **Validação no servidor** — `POST /api/ponto` exige descritor 128D; confiança calculada em `face-verify.ts`
- Quiosque: `/kiosk?teamId=…&kioskKey=…` — match via `POST /api/ponto/match` com `X-Kiosk-Key`
- `GET /api/ponto/faces` → **410 Gone** (não expõe templates)
- Confiança mínima mobile: `FACE_SELFIE_MIN_CONFIDENCE` em `face-match.ts`
- Descriptor facial em `User.faceDescriptor` (JSON)

Ver operação em produção: [PRODUCAO.md](./PRODUCAO.md#6-ponto-eletrônico-facial-produção).

---

## 9. Controle de acesso e horários

Arquivos: `src/lib/schedule-access.ts`, `src/app/(app)/acesso/page.tsx`  
Modelos: `UserSession` (logins), `UserAccessRule` (horário por colaborador)

- Página **Acesso** — histórico de logins + regras de horário (dias, início, fim)
- `COLABORADOR` e `PESQUISADOR` fora do horário: `AccessBlockedScreen` + **403 nas APIs** (`withAuth` → `assertScheduleAccess`)
- Login **não** bloqueia — bloqueio só após autenticar
- API: `GET /api/equipe/schedule-check` (UI, a cada 60s + on focus); `{ skipSchedule: true }` em `/api/auth/me`

---

## 10. Papéis de usuário

| Role | Acesso resumido |
|---|---|
| `ADMIN` | Tudo — admin global, acesso, ponto da equipe, bulk clientes |
| `ADV` | Equipe — configurações, acesso, aprova finalizações |
| `GERENTE` | Equipe — operação completa, acesso, ponto da equipe |
| `COLABORADOR` | Equipe — clientes conforme permissões; ponto próprio; sem grupo Sistema |
| `PESQUISADOR` | Clientes + Kanban + Chamados + Ponto; sem Relatórios/Ferramentas/Sistema |

Login padrão pós-seed: **Admin** / **rmbvadmin**

---

## 11. Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (`?sslmode=require`) |
| `JWT_SECRET` | ✅ | Chave aleatória 32+ caracteres |
| `BLOB_READ_WRITE_TOKEN` | Produção | Token Vercel Blob para uploads persistentes |
| `KIOSK_API_KEY` | Quiosque | Chave dos tablets de ponto |
| `CRON_SECRET` | Cron | Purge de retenção LGPD (30 dias) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seed | Credenciais iniciais |

---

## 12. Deploy

O `vercel.json` executa no build:
```
prisma generate → prisma migrate deploy → next build
```

Push em `main` dispara deploy automático. Seed **não** roda no build.

Documentação operacional: [PRODUCAO.md](./PRODUCAO.md). Melhorias planejadas: [ROADMAP.md](./ROADMAP.md).

---

## 13. Pendências conhecidas

| Item | Status |
|---|---|
| Módulo APA (`/apa`) | ⏳ Placeholder "Em breve" |
| Transferir equipe responsável por tese no TeseManager | ⏳ Pendente |
| Testes automatizados (E2E / integração) | ✅ Smoke (14 testes) + CI — ampliar cobertura |
| Paginação no dashboard principal (lista geral) | ⏳ Parcial — admin tem paginação customizável |
| Reset de senha pelo admin via UI | ⏳ Pendente |
| Desativar usuário/equipe sem apagar | ⏳ Pendente |
| Rate limiting APIs públicas | ⏳ Ver [ROADMAP.md](./ROADMAP.md) Sprint 4 |
| Tokens de quiosque por dispositivo | ⏳ Ver [ROADMAP.md](./ROADMAP.md) Sprint 4 |
| `followUpAt` no schema Client | ⏳ Revertido até migração formal |

---

## 14. Histórico de alterações

### 2026-06-05 — Sprints 1–3 (segurança, CI, manutenção)
- **Sprint 1** — validação facial no servidor (`face-verify.ts`); quiosque com `KIOSK_API_KEY`; `faces` descontinuado; `migrate deploy` no build
- **Sprint 2** — Playwright (14 testes), GitHub Actions CI, `npm run typecheck`
- **Sprint 3** — refatoração `/ponto` em componentes; limites export (10k clientes, 500 bulk); horário no servidor (`schedule-access.ts`); remoção `AppShell.tsx`
- Documentação: `docs/PRODUCAO.md`, `docs/ROADMAP.md`

### 2026-06-20 — Mobile, chat e ponto
- **Route group `(app)`** — páginas autenticadas migradas; removidas duplicatas fora do grupo
- **`Sidebar.tsx` colapsável** — substitui layout monolítico; estado persistido
- **Bottom nav mobile** — Clientes, Kanban, Chat, Menu (`MobileBottomNav.tsx`)
- **Chat messenger** — `ChatFloating` flutuante (desktop) e full-screen (mobile); modelo `ChatMessage`
- **Foto de perfil** — `User.avatarUrl`; página `/perfil`
- **Ponto eletrônico facial** — `/ponto` com face-api; `PontoRecord`; cadastro de descriptor
- **Confiança mínima 65%** no reconhecimento facial
- **WebP automático** em uploads de imagem
- **Fix F5 / hidratação SSR** — mismatch eliminado
- **Fix race condition** no carregamento de clientes no dashboard
- **Router cache dinâmico desabilitado** — UI não fica stale após deploy
- **Lembretes de follow-up** por cliente (campo revertido no schema até migração)

### 2026-06-19 — Design, roles, admin em lote
- **Glassmorphism unificado** — login, landing e app (dark mode índigo/violeta + orbs)
- **Paleta modo claro neutra** — `#dce3ef` / `#edf1f8` (substitui azuis anteriores)
- **Login redesign** — preview flutuante do produto + card glass
- **Animações** — fluidity, active states, keyboard UX
- **Role `PESQUISADOR`** — nav reduzida; APA com badge "Em breve"
- **Cores por tese** — campo `Tese.color`
- **Sidebar por papel** — COLABORADOR sem Sistema; GERENTE/ADV/ADMIN com Acesso; ADMIN sem Configurações redundante
- **Admin — aba Clientes** — filtro sem tese, atribuição em lote, bulk delete (até 50k IDs), edição inline
- **Paginação customizável** — input + botão "Ver todos"
- **CSV** — tese obrigatória, merge/unir teses, backup por equipe
- **TeseManager** — admin passa `teamId`; coluna Categorias removida da tabela
- **Performance** — listagem de clientes mais leve; teses padrão removidas do seed
- **Fix logout** em Ferramentas; acesso ADMIN a horários; bugs `res.ok`
- **Visual overhaul** — CSS compartilhado de tabs/headers; JSON.parse safety

### 2026-06-18 — Acesso, relatórios e UX (tarde)
- **Controle de horário** — `UserAccessRule` + tela de bloqueio full-screen
- **Página `/acesso`** — histórico de logins + restrições por colaborador
- **Toast, confirm dialog, rate limiting, skeletons**
- **Sessão sem flash** — cache em memória + localStorage (`sessionCache`)
- **Parentes** — aba no perfil do cliente com identificação automática na pesquisa
- **Kanban drag** — ghost card flutuante com inclinação direcional
- **WhatsApp** — botão verde ao lado de copiar telefone
- **Relatório de pesquisa** — média por dia útil, feriados nacionais, badge na tabela
- **Relatório mensal** — gráficos, período selecionável, documentos no PDF
- **Relatório por colaborador/equipe**
- **Gerenciamento de membros** no painel de configurações
- **Fix logout HTTP 405** — redirect 303 + fetch no botão Sair
- **Fix mobile** — ferramentas visíveis; notificações via portal

### 2026-06-18 — Documentos e sidebar (manhã)
- **Tags em documentos** — checkboxes + campo livre; badges nos cards
- **ClientDocuments redesenhado** — drag-and-drop + grade de cards
- **Cor fundo claro** `#c2ddff` → evoluída depois para paleta neutra (19/06)
- **Notificações corrigidas** — posicionamento bottom/left no portal
- **Nome do cliente clicável** no dashboard
- **Sidebar com grupos e ícones coloridos**
- **`docs/DESENVOLVIMENTO.md` criado**

### 2026-06-17 — Redesign geral
- Migração **top-nav → sidebar** lateral
- **Dark mode** inicial estilo GitHub (depois substituído por glass índigo)
- **Filtro de tese** na sidebar
- **Landing** com gradiente animado
- **Perfil do cliente** refeito — campos vazios omitidos
- **"Minha equipe" → "Configurações"**
- **Admin** — aba Teses
- **Nav visível** durante carregamento da sessão
