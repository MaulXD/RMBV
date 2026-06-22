# Deploy na Vercel (RMBV System)

> Guia completo de produção: **[docs/PRODUCAO.md](./docs/PRODUCAO.md)**  
> Melhorias sugeridas: **[docs/ROADMAP.md](./docs/ROADMAP.md)**

## Checklist rápido

1. Banco **Neon PostgreSQL** (Marketplace Vercel ou [neon.tech](https://neon.tech))
2. Variáveis no projeto Vercel (ver tabela abaixo)
3. No PC: `prisma migrate deploy` + `db:seed` apontando para o mesmo banco
4. Definir `KIOSK_API_KEY` (tablets de ponto) e `CRON_SECRET` (purge LGPD)
5. Redeploy e testar `/api/health`

## Variáveis obrigatórias (Vercel → Settings → Environment Variables)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL (`postgresql://...?sslmode=require`) |
| `JWT_SECRET` | String aleatória com **mín. 32 caracteres** |
| `ADMIN_EMAIL` | Email do admin (seed) |
| `ADMIN_PASSWORD` | Senha do admin (seed) |
| `ADMIN_NAME` | Login exibido (ex.: `Admin`) |

Opcionais:

| Variável | Descrição |
|----------|-----------|
| `BLOB_READ_WRITE_TOKEN` | Upload de documentos (Vercel Blob) |
| `KIOSK_API_KEY` | Tablets de ponto (quiosque) |
| `CRON_SECRET` | Cron de retenção LGPD (`/api/cron/purge-retention`) |
| `ADV_*`, `GERENTE_*` | Usuários extras no seed |

Ao instalar **Neon** pelo Marketplace da Vercel, `DATABASE_URL` é preenchida automaticamente.

Para **Blob**: Vercel → Storage → Create Blob Store → conecte ao projeto (`BLOB_READ_WRITE_TOKEN` automático).

## Preparar o banco (uma vez)

No PowerShell, com a URL do Neon (a mesma da Vercel):

```powershell
cd d:\Cursor\Database
$env:DATABASE_URL="postgresql://..."
$env:JWT_SECRET="sua-chave-secreta-longa"
$env:ADMIN_EMAIL="admin@sistema.local"
$env:ADMIN_PASSWORD="rmbvadmin"
$env:ADMIN_NAME="Admin"
npm run db:push
npm run db:seed
```

**Banco já existente (migrado com `db push`):** marque a migration inicial uma vez:

```powershell
npx prisma migrate resolve --applied 20250605120000_init
```

## Deploy

```bash
npx vercel          # preview
npx vercel --prod   # produção
```

O `vercel.json` executa no build:

```
prisma generate → prisma migrate deploy → next build
```

## Verificar

```
https://SEU-APP.vercel.app/api/health
```

Resposta esperada:

```json
{
  "ok": true,
  "checks": {
    "JWT_SECRET": "ok",
    "DATABASE_URL": "ok",
    "database_provider": "postgresql",
    "blob_storage": "ok (Vercel Blob)",
    "database": "ok",
    "users": "ok (N usuário(s))"
  }
}
```

Se `users` for `empty`, rode o seed. Se `database_provider` mencionar sqlite, a `DATABASE_URL` na Vercel está errada.

## Desenvolvimento local

Use o **mesmo** PostgreSQL (Neon) no `.env.local` — o projeto não usa SQLite.

```bash
cp .env.example .env
npx vercel env pull .env.local --environment=production
npm run env:setup-local
```

O `vercel env pull` **não traz** valores secretos (ficam vazios). Copie manualmente no painel Vercel:

- `DATABASE_URL` → cole em `.env.local`
- `JWT_SECRET` → gere localmente (32+ caracteres) se vier vazio

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

**Produção:** https://rmbv.vercel.app — login `Admin` / `rmbvadmin`

## Equipes (isolamento)

- Cada **equipe** vê só seus clientes, teses e membros.
- **Admin** → **Administração** → Equipes | Usuários | Importar CSV.
- **ADV** → **Minha equipe** → Gerente/Colaborador + teses.

## Identidade visual

Paleta e tipografia: **[design.md](./design.md)**  
Guia completo: **[docs/PASSO-A-PASSO.md](./docs/PASSO-A-PASSO.md)**

## Login padrão (após seed)

| Papel | Login | Senha |
|-------|--------|--------|
| Admin | `Admin` (ou `admin@sistema.local`) | `rmbvadmin` |
| ADV | `adv@sistema.local` | `Adv@123` |
| Gerente | `gerente@sistema.local` | `Gerente@123` |
