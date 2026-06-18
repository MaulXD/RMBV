# RMBV — Diário de Desenvolvimento

> Este arquivo documenta o funcionamento do sistema, decisões técnicas e histórico de mudanças feitas via chat com o assistente. Sempre que uma alteração for solicitada no chat, este arquivo deve ser atualizado.

---

## Visão geral do sistema

**RMBV** é uma plataforma interna de gestão de clientes jurídicos. Cada cliente está vinculado a uma **equipe** e a uma **tese** (categoria jurídica). O sistema controla o ciclo de vida do cliente desde a captação até a finalização.

**URL de produção:** https://rmbv.vercel.app  
**Repositório:** https://github.com/MaulXD/RMBV  
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Prisma ORM · PostgreSQL (Neon) · Vercel Blob

---

## Estrutura de arquivos importantes

| Arquivo/Pasta | O que faz |
|---|---|
| `src/app/globals.css` | Paleta de cores (variáveis CSS `@theme`), dark mode, classes utilitárias |
| `src/components/AppShell.tsx` | Layout principal: sidebar com navegação, filtro de tese, footer de usuário |
| `src/components/NotificationBell.tsx` | Sino de notificações com painel flutuante posicionado por `getBoundingClientRect` |
| `src/components/ClientsTable.tsx` | Tabela de clientes na listagem do dashboard |
| `src/components/ClientDocuments.tsx` | Upload e exibição de documentos do cliente (drag-and-drop + cards em grade) |
| `src/components/TeseManager.tsx` | Gerenciamento de teses (criar, excluir) |
| `src/components/TeseFilterBar.tsx` | Filtro de tese — variante `sidebar` (vertical) ou `bar` (flutuante) |
| `src/components/ClientProfileView.tsx` | Visualização do perfil do cliente (somente leitura) |
| `src/components/LandingPage.tsx` | Página inicial com fundo animado (gradiente `hero-gradient`) |
| `src/app/equipe/page.tsx` | Página "Configurações" — tabs: Teses, Membros, Kanban |
| `src/app/admin/page.tsx` | Painel admin — tabs: Equipes, Usuários, Teses, Importar CSV, Auditoria |
| `src/lib/document-storage.ts` | Lógica de upload: usa Vercel Blob se `BLOB_READ_WRITE_TOKEN` estiver set, senão usa disco local |
| `prisma/schema.prisma` | Schema do banco de dados |
| `prisma/seed.ts` | Dados iniciais: admin padrão `Admin` / `rmbvadmin` |

---

## Sistema de temas (cores)

Configurado em `src/app/globals.css` via `@theme` (Tailwind CSS v4).

### Modo claro (padrão)
```css
--color-surface: #c2ddff           /* fundo principal */
--color-surface-elevated: #d9ecff  /* cards, painéis */
--color-foreground: #0b1e36        /* texto principal */
--color-muted: #2e5b8a             /* texto secundário */
--color-border: #6aaae0            /* bordas */
--color-primary: #2563eb           /* azul destaque */
```

### Modo escuro (GitHub-style)
```css
--color-surface: #0d1117
--color-surface-elevated: #161b22
--color-foreground: #e6edf3
--color-muted: #7d8590
--color-border: #30363d
--color-primary: #58a6ff
```

O dark mode é ativado adicionando a classe `.dark` no elemento `html`. Alternância controlada por `ThemeProvider`.

---

## Sidebar — estrutura de navegação

A sidebar (`AppShell.tsx`) exibe navegação em **3 grupos com ícones coloridos**:

| Grupo | Item | Ícone | Cor |
|---|---|---|---|
| PRINCIPAL | Clientes | dashboard | azul |
| PRINCIPAL | Kanban | kanban | violeta |
| PRINCIPAL | Relatórios | reports | verde |
| OPERAÇÕES | Ferramentas | wrench | laranja |
| OPERAÇÕES | Chamados | ticket | âmbar |
| SISTEMA | Configurações (não-admin) | briefcase | ciano |
| SISTEMA | Administração (admin) | shield | rosa |

O filtro de tese fica integrado na sidebar (não como barra flutuante) nas páginas `/dashboard`, `/reports` e `/kanban`.

---

## Upload de documentos

**Componente:** `src/components/ClientDocuments.tsx`

**Fluxo:**
1. Usuário arrasta ou clica na zona de upload
2. Após selecionar o arquivo, aparece um formulário com checkboxes de tipos de documento
3. Tipos disponíveis: RG/CNH, CPF, Contrato, Comprovante de residência, Ficha de Filiação (ANCREF), Procuração, Certidão de nascimento, Certidão de casamento, Extrato bancário, Declaração de IR, Outros
4. Campo livre para tipo customizado
5. Ao confirmar, o arquivo sobe com as tags salvas no banco
6. Documentos exibidos em **cards em grade** (2-4 colunas) com badges das tags

**Banco:** campo `tags` (JSON array como string) no model `ClientDocument`.

**Storage:**
- Dev local → pasta `storage/documents/{clientId}/`
- Produção (Vercel) → Vercel Blob (requer `BLOB_READ_WRITE_TOKEN`)

---

## Notificações

**Componente:** `src/components/NotificationBell.tsx`

O painel flutua sobre o conteúdo usando `position: fixed` com coordenadas calculadas por `getBoundingClientRect()`. Como o botão fica no rodapé da sidebar (canto inferior esquerdo), a lógica detecta:

- **Horizontal:** se o botão está na metade esquerda da tela → `left: rect.left`; direita → `right: window.innerWidth - rect.right`
- **Vertical:** se não há espaço abaixo (`spaceBelow < 320px`) → abre acima (`bottom: window.innerHeight - rect.top + 6`); senão → abre abaixo (`top: rect.bottom + 6`)

O painel aplica todas as 4 propriedades (`top`, `bottom`, `left`, `right`) no style do div.

---

## Variáveis de ambiente

| Variável | Onde usar | O que faz |
|---|---|---|
| `DATABASE_URL` | Produção + dev | Connection string PostgreSQL (Neon) |
| `JWT_SECRET` | Produção + dev | Chave de assinatura dos tokens JWT |
| `BLOB_READ_WRITE_TOKEN` | Produção | Habilita upload para Vercel Blob |
| `ADMIN_EMAIL` | Seed | Email do admin (padrão: `admin@sistema.local`) |
| `ADMIN_PASSWORD` | Seed | Senha do admin (padrão: `rmbvadmin`) |
| `ADMIN_NAME` | Seed | Nome de exibição do admin (padrão: `Admin`) |

### Configurar Vercel Blob
1. Vercel → Storage → Create → Blob
2. Dentro do Blob → Tokens → Create Token (Read & Write)
3. Copiar token → Settings → Environment Variables → `BLOB_READ_WRITE_TOKEN`
4. Redeploy

---

## Papéis de usuário

| Role | Acesso |
|---|---|
| `ADMIN` | Tudo — painel admin, todas as equipes, importação CSV |
| `ADV` | Sua equipe — gerencia membros, teses e aprova finalizações |
| `GERENTE` | Sua equipe — operação completa nos clientes |
| `COLABORADOR` | Sua equipe — acesso conforme permissões de categoria |

Login padrão após seed: **Admin** / **rmbvadmin**

---

## Histórico de mudanças

### 2026-06-18
- **Upload de documentos** — adicionado formulário de tags (RG, Contrato, Ficha de Filiação ANCREF, etc.) antes de confirmar o upload. Documentos exibidos em cards com badges das tags
- **Cor do fundo claro** ajustada para `#c2ddff`
- **Notificações corrigidas** — painel não aparecia pois `bottom` e `left` não eram aplicados no style do div fixo
- **Nome do cliente clicável** na tabela do dashboard (abre a página do cliente)
- **Sidebar reorganizada** em grupos com ícones coloridos por item (PRINCIPAL / OPERAÇÕES / SISTEMA)
- **README** atualizado com instruções detalhadas do Vercel Blob

### 2026-06-17 (sessão anterior)
- **Redesign completo da interface** — migração de top-nav para sidebar lateral
- **Dark mode** neutro estilo GitHub (`#0d1117` / `#161b22`)
- **Filtro de tese** movido para dentro da sidebar (variante `sidebar` no `TeseFilterBar`)
- **Landing page** com fundo animado (gradiente `hero-gradient` 8s)
- **Perfil do cliente** refeito — seções ocultas quando vazias, campos individuais omitidos se sem valor
- **Página "Configurações"** (antes "Minha equipe") — tabs: Teses, Membros, Kanban
- **Aba Teses** adicionada ao painel admin
- **Notificações** corrigidas para posição sidebar (canto inferior esquerdo)
- **Nav itens** que sumiam durante carregamento da sessão — corrigido tornando itens independentes do estado do usuário

---

## Como continuar o desenvolvimento

Se você iniciar um novo chat e quiser retomar, diga ao assistente:

> "Leia o arquivo `docs/DESENVOLVIMENTO.md` para entender o projeto antes de fazer qualquer alteração."

O assistente deve ler este arquivo como primeira ação e atualizar a seção **Histórico de mudanças** ao final de cada sessão de trabalho.

---

## Pendências conhecidas

- **TeseManager** — transferência de equipe responsável por tese (solicitada mas não implementada)
- Testes automatizados não existem — validação é manual via interface
