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
$env:ADMIN_PASSWORD="Admin@123"
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

Use o **mesmo** PostgreSQL (Neon) no `.env` — o projeto não usa mais SQLite.

```bash
cp .env.example .env
# edite DATABASE_URL e JWT_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Login padrão (após seed)

| Papel | Email | Senha |
|-------|--------|--------|
| Admin | `admin@sistema.local` | `Admin@123` |
| ADV | `adv@sistema.local` | `Adv@123` |
| Gerente | `gerente@sistema.local` | `Gerente@123` |
