# RMBV System

Sistema de gestão de clientes com Prisma, RBAC por categoria, filtros por tese, documentação, relatórios PDF/CSV e extração de dados via LLM.

## Pré-requisitos

- Node.js 20+
- Chave da OpenAI (para extração, opcional na extração)
- **PostgreSQL** (recomendado: [Neon](https://neon.tech) — gratuito, funciona local e na Vercel)

## Configuração

1. Copie o ambiente:

```bash
cp .env.example .env
```

2. Ajuste `DATABASE_URL` (PostgreSQL), `JWT_SECRET` e `OPENAI_API_KEY`. Veja [DEPLOY.md](./DEPLOY.md) para Vercel.

3. Instale dependências e prepare o banco:

```bash
npm install
npm run db:push
npm run db:seed
```

4. Inicie o servidor:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Credenciais padrão (seed)

| Campo   | Valor padrão          |
|---------|------------------------|
| Email   | `admin@sistema.local` |
| Senha   | `Admin@123`           |

## Estrutura implementada

| Passo | Descrição |
|-------|-----------|
| 1 | `prisma/schema.prisma` + `prisma/seed.ts` (ADMIN, categorias, permissões) |
| 2 | Tokens Grafite/Titânio/Aço/Platina em `globals.css` + `ThemeProvider` |
| 3 | `src/lib/permissions.ts` + validação nas rotas `/api/clients` e `/api/extract` |
| 4 | Dashboard em `/dashboard` com filtros por status e link ao perfil |
| 5 | Perfil em `/clients/[id]` com todos os campos do MODEL.csv + extração por texto |
| 6 | Admin em `/admin` — upload CSV (somente ADMIN) |
| 7 | Relatórios em `/reports` — estatísticas e exportação CSV |

## Deploy online

Se o login retorna **"Erro ao autenticar"** em produção, leia **[DEPLOY.md](./DEPLOY.md)** — é preciso **PostgreSQL** (ex.: Neon) e rodar o seed no banco remoto.

Teste após deploy: `/api/health`

## Scripts

- `npm run dev` — desenvolvimento
- `npm run db:push` — sincroniza schema com o banco
- `npm run db:seed` — usuários e permissões iniciais
- `npm run build` — build de produção
