# RMBV — Documento Vivo de Desenvolvimento

> Gerado e mantido automaticamente junto com o código. Toda vez que uma alteração for solicitada no chat com o assistente, este arquivo deve ser atualizado na mesma sessão.
>
> **Para retomar em novo chat:** diga _"Leia `docs/DESENVOLVIMENTO.md` antes de qualquer alteração"_.

---

## 1. Visão geral

**RMBV** é uma plataforma interna para escritórios de advocacia gerenciarem clientes jurídicos com múltiplas equipes e teses (categorias jurídicas). Controla o ciclo de vida do cliente desde a captação até a finalização, com Kanban, chamados, documentos e relatórios.

| Item | Valor |
|---|---|
| URL produção | https://rmbv.vercel.app |
| Repositório | https://github.com/MaulXD/RMBV |
| Framework | Next.js 15 — App Router + Turbopack |
| Linguagem | TypeScript + React 19 |
| Estilo | Tailwind CSS v4 (config via `@theme` no CSS, sem `tailwind.config.ts`) |
| Banco | PostgreSQL via Prisma ORM (Neon em produção, SQLite em dev) |
| Auth | JWT com `jose` + cookies httpOnly + bcrypt |
| Storage | Vercel Blob (produção) / pasta `storage/` (dev local) |
| PDF | pdf-lib, pdfkit, pdfjs-dist |
| OCR | Tesseract.js |
| Validação | Zod |
| Deploy | Vercel (auto-deploy a cada push em `main`) |

---

## 2. Estrutura de arquivos

```
src/
├── app/
│   ├── globals.css          ← PALETA DE CORES E CLASSES UTILITÁRIAS
│   ├── layout.tsx           ← fonts, meta tags, providers
│   ├── dashboard/           ← listagem de clientes
│   ├── clients/[id]/        ← perfil do cliente (abas: Perfil, Pesquisa, Histórico, Tarefas)
│   ├── kanban/              ← board de tarefas por equipe
│   ├── chamados/            ← sistema de tickets internos
│   ├── ferramentas/         ← pesquisa CPF, verificação telefone, OCR
│   ├── reports/             ← relatórios, gráficos, exportação PDF/CSV
│   ├── equipe/              ← "Configurações" — tabs: Teses, Membros, Kanban
│   ├── admin/               ← painel admin — tabs: Equipes, Usuários, Teses, CSV, Auditoria
│   └── api/                 ← todas as rotas REST
│       ├── auth/            ← login, logout, /me
│       ├── clients/         ← CRUD clientes + documentos + histórico + tarefas
│       ├── teses/           ← CRUD teses
│       ├── teams/           ← CRUD equipes
│       ├── kanban/          ← colunas + tarefas
│       ├── chamados/        ← tickets + anexos + comentários
│       ├── notifications/   ← notificações do usuário
│       ├── reports/         ← dados para relatórios
│       └── admin/           ← importação CSV, usuários admin
├── components/
│   ├── AppShell.tsx         ← LAYOUT PRINCIPAL (sidebar + conteúdo)
│   ├── NotificationBell.tsx ← sino de notificações flutuante
│   ├── ClientsTable.tsx     ← tabela de clientes (nome clicável)
│   ├── ClientDocuments.tsx  ← upload drag-and-drop + cards com tags
│   ├── ClientProfileView.tsx← visualização somente leitura do perfil
│   ├── ClientProfileForm.tsx← formulário de edição do perfil
│   ├── TeseManager.tsx      ← criar/excluir teses
│   ├── TeseFilterBar.tsx    ← filtro de tese (variante sidebar ou bar)
│   ├── LandingPage.tsx      ← página inicial com gradiente animado
│   └── ui/
│       ├── Icon.tsx         ← wrapper Lucide Icons
│       └── SelectField.tsx  ← select estilizado
└── lib/
    ├── document-storage.ts  ← lógica Vercel Blob / disco local
    ├── client-fields.ts     ← campos do modelo de cliente + cabeçalho CSV
    ├── roles.ts             ← funções de permissão por role
    ├── automations.ts       ← regras de automação por evento
    ├── notifications.ts     ← criação de notificações no banco
    └── prisma.ts            ← instância singleton do Prisma

prisma/
├── schema.prisma            ← schema completo do banco
└── seed.ts                  ← dados iniciais (admin, equipe padrão, categorias)
```

---

## 3. Sistema de cores e temas

Arquivo: `src/app/globals.css`

O Tailwind CSS v4 usa um bloco `@theme` no CSS (não `tailwind.config.ts`). As variáveis CSS são geradas automaticamente como classes (`bg-surface`, `text-foreground`, etc.).

### Modo claro
```css
--color-surface: #c2ddff           /* fundo da página */
--color-surface-elevated: #d9ecff  /* cards, painéis, sidebar */
--color-surface-glass: rgb(217 236 255 / 0.92)
--color-foreground: #0b1e36
--color-muted: #2e5b8a
--color-border: #6aaae0
--color-primary: #2563eb
--color-primary-foreground: #ffffff
```

### Modo escuro (GitHub-style)
```css
--color-surface: #0d1117
--color-surface-elevated: #161b22
--color-surface-glass: rgb(13 17 23 / 0.88)
--color-foreground: #e6edf3
--color-muted: #7d8590
--color-border: #30363d
--color-primary: #58a6ff
--color-primary-foreground: #0d1117
```

A classe `.dark` no `<html>` ativa o modo escuro. Alternância controlada por `ThemeProvider` e persistida em `localStorage`. O botão fica no rodapé da sidebar.

### Classes utilitárias definidas no CSS
| Classe | Uso |
|---|---|
| `.industrial-panel` | Painel com borda, blur e fundo glass |
| `.panel-solid` | Painel sem blur, fundo `surface-elevated` |
| `.soft-card` | Card arredondado com hover |
| `.btn-primary` | Botão azul primário |
| `.btn-ghost` | Botão transparente com borda |
| `.btn-icon` | Botão quadrado de ícone |
| `.industrial-input` | Input estilizado |
| `.alert-success / alert-error / alert-warn` | Alertas coloridos |
| `.data-table` | Tabela com hover e bordas |

---

## 4. Layout — Sidebar

Arquivo: `src/components/AppShell.tsx`

A sidebar ocupa 240px à esquerda (desktop). Em mobile, é um overlay deslizante com backdrop.

### Estrutura da sidebar
1. **Brand** — logo RMBV + nome da equipe/usuário
2. **Busca** — botão que abre `GlobalSearchPalette` (atalho ⌘K / Ctrl+K)
3. **Filtro de tese** — aparece nas páginas `/dashboard`, `/reports`, `/kanban`
4. **Navegação em grupos com ícones coloridos:**

| Grupo | Item | Cor do ícone |
|---|---|---|
| PRINCIPAL | Clientes | azul (`text-blue-500`) |
| PRINCIPAL | Kanban | violeta (`text-violet-500`) |
| PRINCIPAL | Relatórios | verde (`text-emerald-500`) |
| OPERAÇÕES | Ferramentas | laranja (`text-orange-500`) |
| OPERAÇÕES | Chamados | âmbar (`text-amber-500`) |
| SISTEMA | Configurações (não-admin) | ciano (`text-cyan-500`) |
| SISTEMA | Administração (admin) | rosa (`text-rose-500`) |

5. **Footer do usuário** — avatar, nome, role, notificações, toggle tema, logout

**Detalhe importante:** durante o carregamento da sessão (`user === null`), os itens de navegação continuam visíveis porque não dependem do estado do usuário para renderizar — apenas o item SISTEMA muda entre Configurações e Administração após o user carregar.

---

## 5. Upload de documentos

Arquivo: `src/components/ClientDocuments.tsx`  
API: `src/app/api/clients/[id]/documents/route.ts`  
Storage: `src/lib/document-storage.ts`

### Fluxo completo
1. Usuário arrasta arquivo para a zona de drop (ou clica para abrir seletor)
2. Após selecionar, aparece formulário inline com checkboxes de tipo:
   - RG / CNH, CPF, Contrato, Comprovante de residência
   - Ficha de Filiação (ANCREF), Procuração
   - Certidão de nascimento, Certidão de casamento
   - Extrato bancário, Declaração de IR, Outros
   - Campo livre para tipo customizado
3. Usuário confirma → arquivo + tags enviados via `FormData`
4. API salva no Vercel Blob (produção) ou disco local (dev)
5. `tags` salvo como JSON array no campo `ClientDocument.tags`
6. Cards dos documentos exibem badges com as tags

### Storage
```typescript
// document-storage.ts
if (process.env.BLOB_READ_WRITE_TOKEN) → Vercel Blob (produção)
else if (!process.env.VERCEL)           → pasta storage/ (dev local)
else                                    → erro (Vercel sem Blob configurado)
```

### Tipos permitidos
PDF, JPEG, PNG, WebP, TXT, Word (.doc/.docx), Excel (.xls/.xlsx) — máx. 15 MB

---

## 6. Notificações

Arquivo: `src/components/NotificationBell.tsx`

Painel flutuante criado com `createPortal` no `document.body`. Posicionado com `getBoundingClientRect()` toda vez que abre, e recalculado no resize/scroll.

### Lógica de posicionamento
O botão fica no rodapé da sidebar (canto inferior esquerdo da tela):

```typescript
// Horizontal
buttonCenterX < window.innerWidth / 2
  ? { left: rect.left }           // botão à esquerda → painel alinha à esquerda
  : { right: window.innerWidth - rect.right }  // botão à direita → alinha à direita

// Vertical
spaceBelow >= 320
  ? { top: rect.bottom + 6 }      // espaço suficiente → abre abaixo
  : { bottom: window.innerHeight - rect.top + 6 }  // sem espaço → abre acima
```

O div do painel aplica **todas as 4 propriedades** (`top`, `bottom`, `left`, `right`) — se alguma for `undefined`, o CSS a ignora.

---

## 7. Papéis de usuário

| Role | Acesso |
|---|---|
| `ADMIN` | Tudo — painel admin, todas as equipes, importação CSV, auditoria global |
| `ADV` | Sua equipe — gerencia membros, teses e aprova finalizações |
| `GERENTE` | Sua equipe — operação completa nos clientes |
| `COLABORADOR` | Sua equipe — acesso conforme permissões de categoria |

Login padrão pós-seed: **Admin** / **rmbvadmin**

---

## 8. Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (`?sslmode=require`) |
| `JWT_SECRET` | ✅ | Chave aleatória 32+ caracteres |
| `BLOB_READ_WRITE_TOKEN` | Produção | Token Vercel Blob para uploads persistentes |
| `ADMIN_EMAIL` | Seed | Padrão: `admin@sistema.local` |
| `ADMIN_PASSWORD` | Seed | Padrão: `rmbvadmin` |
| `ADMIN_NAME` | Seed | Padrão: `Admin` |

### Configurar Vercel Blob
1. Vercel → Storage → Create → Blob → nomear e criar
2. Dentro do Blob → Tokens → Create Token (Read & Write) → copiar
3. Projeto → Settings → Environment Variables → `BLOB_READ_WRITE_TOKEN`
4. Redeploy para aplicar

---

## 9. Deploy

O `vercel.json` executa no build:
```
prisma generate → prisma db push → db:seed → next build
```

Push em `main` dispara deploy automático. O `prisma db push` aplica mudanças de schema sem migrations explícitas (pode aceitar data loss em campos novos com default).

---

## 10. Pendências conhecidas

| Item | Status |
|---|---|
| Transferir equipe responsável por tese no TeseManager | ⏳ Pendente |
| Testes automatizados (E2E / integração) | ❌ Não existem |
| Paginação na lista de clientes com muitos registros | ⏳ Pendente |
| Reset de senha pelo admin via UI | ⏳ Pendente |

---

## 11. Histórico de alterações

### 2026-06-18 — Sessão atual
- **Tags em documentos** — ao subir arquivo, formulário com checkboxes (RG, CPF, Contrato, Comprovante, Ficha ANCREF, Procuração, Certidões, IR, etc.) + campo livre. Tags salvas em `ClientDocument.tags` (JSON). Cards exibem badges.
- **ClientDocuments redesenhado** — zona drag-and-drop + cards em grade (2-4 colunas por tese de arquivo, tamanho, uploader, data, ações)
- **Cor do fundo claro** ajustada para `#c2ddff` (após iterações: `#96c5ff` → `#add2ff` → `#c2ddff`)
- **Notificações corrigidas** — painel não aparecia: `bottom` e `left` não estavam sendo aplicados no style do div `position: fixed`
- **Nome do cliente clicável** na tabela do dashboard (link para `/clients/[id]`)
- **Sidebar com grupos e ícones coloridos** — PRINCIPAL / OPERAÇÕES / SISTEMA, cada item com cor própria no ícone
- **README atualizado** com setup detalhado do Vercel Blob
- **Este documento criado** (`docs/DESENVOLVIMENTO.md`)

### 2026-06-17 — Redesign geral
- Migração de **top-nav para sidebar** lateral (sticky, 240px, full height)
- **Dark mode** neutro estilo GitHub (`#0d1117` / `#161b22`) — rejeitada paleta azul-marinha anterior
- **Filtro de tese** movido da barra flutuante para dentro da sidebar (`TeseFilterBar variant="sidebar"`)
- **Landing page** com fundo animado — gradiente `background-size: 300% 300%` animado por `hero-gradient` (8s, ease, infinite)
- **Perfil do cliente** (`ClientProfileView`) refeito — seções sem dados ocultas, campos individuais vazios omitidos
- **"Minha equipe" → "Configurações"** com 3 tabs: Teses, Membros, Kanban
- **Painel admin** — adicionada aba Teses com `TeseManager`
- **Notificações** — lógica de posicionamento para sidebar (canto inferior esquerdo)
- **Nav itens** não sumiam mais durante carregamento da sessão (`sessionCache` no `SessionProvider`)
- **Commits reescritos** para usuário `MaulXD` (raulmacaluz@live.com) via `git filter-branch`
