# Deploy na Vercel (RMBV System)

## Checklist rápido

1. Banco **Neon PostgreSQL** (Marketplace Vercel ou [neon.tech](https://neon.tech))
2. Variáveis no projeto Vercel (ver tabela abaixo)
3. No PC: `db:push` + `db:seed` apontando para o mesmo banco
4. Redeploy e testar `/api/health`

## Variáveis obrigatórias (Vercel → Settings → Environment Variables)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL (`postgresql://...?sslmode=require`) |
| `JWT_SECRET` | String aleatória com **mín. 32 caracteres** |
| `ADMIN_EMAIL` | Email do admin (seed) |
| `ADMIN_PASSWORD` | Senha do admin (seed) |

Opcionais:

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | **Extração com IA** — sem ela o botão "Extrair com IA" fica desabilitado |
| `BLOB_READ_WRITE_TOKEN` | Upload de documentos (Vercel Blob) |
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
npm run db:push
npm run db:seed
```

## Deploy

```bash
npx vercel          # preview
npx vercel --prod   # produção
```

O `vercel.json` já executa `prisma generate` antes do build.

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

Use o **mesmo** PostgreSQL (Neon) no `.env.local` — o projeto não usa mais SQLite.

```bash
cp .env.example .env
npx vercel env pull .env.local --environment=production
npm run env:setup-local
```

O `vercel env pull` **não traz** valores secretos (ficam vazios). Copie manualmente no painel Vercel → **rmbv** → Settings → Environment Variables:

- `DATABASE_URL` → cole em `.env.local`
- `JWT_SECRET` → gere localmente (32+ caracteres) se vier vazio

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

**Produção online:** https://rmbv.vercel.app — login `Admin` / `rmbvadmin` (não depende do `.env` local).

## Equipes (isolamento)

- Cada **equipe** vê só seus clientes, teses e membros.
- **Admin** vê tudo → menu **Administração** → criar equipes e ADV.
- **ADV** → menu **Minha equipe** → cadastra **Gerente** e **Colaborador** + teses da equipe.
- Após deploy, o `db:seed` cria **Equipe Padrão** e vincula dados antigos.

## Login padrão (após seed)

| Papel | Login | Senha |
|-------|--------|--------|
| Admin | `Admin` (ou `admin@sistema.local`) | `rmbvadmin` |
| ADV | `adv@sistema.local` | `Adv@123` |
| Gerente | `gerente@sistema.local` | `Gerente@123` |
