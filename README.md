# RMBV System

Sistema de gestão de clientes com Prisma, equipes isoladas, RBAC por categoria, filtros por tese, documentação e relatórios PDF/CSV.

## Documentação

- **[docs/PASSO-A-PASSO.md](./docs/PASSO-A-PASSO.md)** — instalação, deploy e uso
- **[design.md](./design.md)** — paleta, tipografia e ícones
- **[DEPLOY.md](./DEPLOY.md)** — Vercel e variáveis de ambiente

## Pré-requisitos

- Node.js 20+
- **PostgreSQL** ([Neon](https://neon.tech) recomendado)

## Início rápido

```bash
cp .env.example .env
# Edite DATABASE_URL e JWT_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Credenciais padrão (seed)

| Login | Senha |
|-------|--------|
| `Admin` | `rmbvadmin` |

## Scripts

| Comando | Função |
|---------|--------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:push` | Sincroniza schema |
| `npm run db:seed` | Usuários e equipes iniciais |

## Deploy

https://rmbv.vercel.app — ver [DEPLOY.md](./DEPLOY.md).

Teste: `/api/health`
