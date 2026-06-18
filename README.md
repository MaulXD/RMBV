# RMBV — Sistema de Gestão de Clientes Jurídicos

Plataforma interna para escritórios de advocacia com múltiplas equipes e teses. Controla o ciclo de vida completo dos clientes desde a captação até a finalização, com Kanban, chamados, documentos e relatórios.

**Produção:** [rmbv.vercel.app](https://rmbv.vercel.app) · **Health:** [/api/health](https://rmbv.vercel.app/api/health)

---

## Funcionalidades

### Clientes
- Listagem com busca, filtros por status, workflow e tese — nome clicável abre o perfil
- Perfil completo: dados, documentos (drag-and-drop + categorização por tags), pesquisa e revisão por OCR
- Cadastro manual e importação em lote via CSV
- Finalização com fluxo solicitar → aprovar
- Detecção de duplicatas por CPF

### Documentos
- Upload por drag-and-drop com formulário de categorização (RG, CPF, Contrato, Comprovante de residência, Ficha de Filiação ANCREF, Procuração, Certidões, IR, etc.)
- Exibição em cards com badges de tipo
- Storage: Vercel Blob em produção, disco local em dev

### Kanban e tarefas
- Board por equipe com colunas configuráveis (nome, cor, coluna final)
- Alertas de SLA e "vence em breve"
- Sincronização com fluxo de finalização de clientes

### Chamados
- Sistema de tickets internos com anexos, comentários e histórico

### Ferramentas
- Pesquisa de dados via CPF, verificação de telefones, extração por OCR (Tesseract.js)

### Relatórios
- Cards por status, gráfico mensal (12 meses), metas de finalização
- Exportação CSV e PDF

### Administração
- Equipes, usuários (ADMIN / ADV / GERENTE / COLABORADOR), teses, importação CSV, auditoria
- Painel de configurações por equipe: teses, membros, colunas Kanban

### Interface
- Sidebar lateral com navegação em grupos e ícones coloridos
- Modo claro (`#c2ddff`) e escuro (GitHub-style `#0d1117`) com alternância persistida
- Notificações em tempo real, busca global (⌘K)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Linguagem | TypeScript + React 19 |
| Estilo | Tailwind CSS v4 — config via CSS `@theme` (sem `tailwind.config.ts`) |
| Banco | PostgreSQL via Prisma ORM (Neon em produção) |
| Auth | JWT com `jose` + cookies httpOnly + bcrypt |
| Storage | Vercel Blob (produção) / `storage/` local (dev) |
| PDF | pdf-lib, pdfkit, pdfjs-dist |
| OCR | Tesseract.js |
| Validação | Zod |
| Deploy | Vercel (auto-deploy em push para `main`) |

---

## Início rápido

### Pré-requisitos
- Node.js 20+
- Conta Vercel + banco PostgreSQL (recomendado: [Neon](https://neon.tech))

### Instalação

```bash
git clone https://github.com/MaulXD/RMBV.git
cd RMBV
npm install
cp .env.example .env
```

Edite `.env`:

```env
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"
JWT_SECRET="chave-aleatoria-com-32-ou-mais-caracteres"

# Opcionais para seed
ADMIN_EMAIL="admin@sistema.local"
ADMIN_PASSWORD="rmbvadmin"
ADMIN_NAME="Admin"

# Obrigatório em produção para uploads
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

```bash
npm run db:push   # cria as tabelas
npm run db:seed   # cria usuário admin e dados iniciais
npm run dev       # http://localhost:3000
```

**Login padrão:** `Admin` / `rmbvadmin`

---

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL |
| `JWT_SECRET` | ✅ | Chave aleatória 32+ caracteres |
| `BLOB_READ_WRITE_TOKEN` | Produção | Upload persistente de documentos |
| `ADMIN_EMAIL` | Seed | Padrão: `admin@sistema.local` |
| `ADMIN_PASSWORD` | Seed | Padrão: `rmbvadmin` |
| `ADMIN_NAME` | Seed | Padrão: `Admin` |

### Configurar Vercel Blob

1. Vercel → **Storage** → Create → **Blob** → criar
2. Dentro do Blob → **Tokens** → Create Token (Read & Write) → copiar
3. Projeto → **Settings** → **Environment Variables** → adicionar `BLOB_READ_WRITE_TOKEN`
4. Redeploy para aplicar

Sem o token, uploads falham em produção (o filesystem da Vercel é efêmero). Em dev local, arquivos vão para `storage/` na raiz do projeto.

---

## Deploy

O repositório tem deploy automático na Vercel a cada push em `main`.

O `vercel.json` executa no build:
```
prisma generate → prisma db push → db:seed → next build
```

### Checklist inicial

1. Importar o repo na Vercel
2. Conectar banco **Neon** pelo Marketplace (preenche `DATABASE_URL`)
3. Definir `JWT_SECRET` e variáveis de seed
4. *(Opcional)* Criar **Vercel Blob** e adicionar `BLOB_READ_WRITE_TOKEN`
5. Deploy e validar `GET /api/health` → `"ok": true`

---

## Papéis de usuário

| Role | Acesso |
|---|---|
| `ADMIN` | Tudo — painel admin, todas equipes, importação CSV, auditoria global |
| `ADV` | Sua equipe — gerencia membros, teses e aprova finalizações |
| `GERENTE` | Sua equipe — operação completa nos clientes |
| `COLABORADOR` | Sua equipe — acesso conforme permissões de categoria |

---

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | `prisma generate` + build de produção |
| `npm run start` | Servidor de produção após build |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza schema Prisma → banco |
| `npm run db:seed` | Usuários, equipes, categorias e permissões iniciais |

---

## Estrutura

```
src/
├── app/
│   ├── globals.css       ← paleta de cores e classes utilitárias
│   ├── dashboard/        ← listagem de clientes
│   ├── clients/[id]/     ← perfil completo do cliente
│   ├── kanban/           ← board de tarefas
│   ├── chamados/         ← tickets internos
│   ├── ferramentas/      ← pesquisa e OCR
│   ├── reports/          ← relatórios e exportação
│   ├── equipe/           ← configurações da equipe
│   ├── admin/            ← painel administrativo
│   └── api/              ← rotas REST
├── components/           ← componentes React
└── lib/                  ← lógica de negócio, auth, storage

prisma/
├── schema.prisma         ← modelos do banco
└── seed.ts               ← dados iniciais
```

---

## Documentação interna

| Arquivo | Conteúdo |
|---|---|
| [docs/DESENVOLVIMENTO.md](./docs/DESENVOLVIMENTO.md) | **Documento vivo** — funcionamento detalhado, decisões técnicas e histórico de mudanças |
| [docs/PASSO-A-PASSO.md](./docs/PASSO-A-PASSO.md) | Instalação, deploy e fluxo de uso |
| [docs/RELATORIO-AUDITORIA.md](./docs/RELATORIO-AUDITORIA.md) | Auditoria técnica de 27/05/2026 |

---

## Licença

Projeto privado — uso interno. Todos os direitos reservados.
