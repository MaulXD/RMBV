# SCS — Guia de Produção

Documento operacional para manter **https://rmbv.vercel.app** em funcionamento.  
Atualizado após as Sprints 1–3 (jun/2026).

---

## 1. Visão geral da arquitetura

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│  Navegador  │ ─────────────► │  Vercel (Next.js) │
│  / Tablet   │                │  Serverless Node  │
└─────────────┘                └────────┬─────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌──────────┐      ┌────────────┐      ┌─────────────┐
              │   Neon   │      │ Vercel Blob│      │ Vercel Cron │
              │ Postgres │      │ documentos │      │ 03:00 UTC   │
              └──────────┘      └────────────┘      └─────────────┘
```

| Componente | Serviço | Observação |
|---|---|---|
| App web | Vercel | Auto-deploy em push para `main` |
| Banco | Neon PostgreSQL | Obrigatório — SQLite não funciona na Vercel |
| Documentos | Vercel Blob | Sem token, upload não persiste |
| Sessão | Cookie `gestao_session` (JWT) | `JWT_SECRET` obrigatório |
| Ponto facial | face-api no browser + validação no servidor | Ver seção 6 |
| CI | GitHub Actions | Lint, typecheck, e2e com Postgres 16 |

---

## 2. URLs e health check

| Recurso | URL |
|---|---|
| Produção | https://rmbv.vercel.app |
| Health | https://rmbv.vercel.app/api/health |
| Repositório | https://github.com/MaulXD/RMBV |
| Login | https://rmbv.vercel.app/login |
| Quiosque | https://rmbv.vercel.app/kiosk?teamId=…&kioskKey=… |

### Interpretar `/api/health`

```json
{
  "ok": true,
  "checks": {
    "JWT_SECRET": "ok",
    "DATABASE_URL": "ok",
    "database_provider": "postgresql",
    "blob_storage": "ok (Vercel Blob)",
    "database": "ok",
    "users": "ok (5 usuário(s))"
  }
}
```

| Campo | `ok` esperado | Se falhar |
|---|---|---|
| `JWT_SECRET` | `ok` | Definir na Vercel (32+ caracteres) |
| `DATABASE_URL` | `ok` | Reconectar Neon ou colar URL manualmente |
| `database_provider` | `postgresql` | URL errada ou SQLite |
| `blob_storage` | `ok (Vercel Blob)` | Criar Blob Store + token |
| `database` | `ok` | Banco inacessível ou credenciais inválidas |
| `users` | `ok (N usuário(s))` | Rodar `npm run db:seed` no banco de produção |

`ok: false` retorna HTTP **503** — útil para monitoramento externo.

---

## 3. Variáveis de ambiente (produção)

Configurar em **Vercel → projeto rmbv → Settings → Environment Variables**.

### Obrigatórias

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | `postgresql://…?sslmode=require` (Neon via Marketplace recomendado) |
| `JWT_SECRET` | Chave aleatória com **mínimo 32 caracteres** |
| `KIOSK_API_KEY` | Chave secreta para tablets de ponto (ver seção 6) |

### Seed (rodar manualmente, não no build)

| Variável | Padrão |
|---|---|
| `ADMIN_EMAIL` | `admin@sistema.local` |
| `ADMIN_PASSWORD` | `rmbvadmin` |
| `ADMIN_NAME` | `Admin` |
| `ADV_EMAIL` / `ADV_PASSWORD` / `ADV_NAME` | opcionais |
| `GERENTE_EMAIL` / `GERENTE_PASSWORD` / `GERENTE_NAME` | opcionais |

### Recomendadas

| Variável | Descrição |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Upload persistente de documentos |
| `CRON_SECRET` | Protege `GET /api/cron/purge-retention` (Bearer token) |

### Não commitar

- `.env`, `.env.local`, `.env*.tmp`
- Tokens puxados via `vercel env pull` — manter só na máquina local

---

## 4. Pipeline de deploy

### Build automático (`vercel.json`)

```
prisma generate → prisma migrate deploy → next build
```

- **Migrations** rodam em todo deploy — schema sempre alinhado
- **Seed não roda** no deploy — evita sobrescrever dados de produção
- Push em `main` dispara deploy na Vercel

### Primeira vez no banco (ou banco vazio)

```powershell
cd D:\Cursor\Database
$env:DATABASE_URL="postgresql://..."   # mesma URL da Vercel
$env:JWT_SECRET="..."
$env:ADMIN_EMAIL="admin@sistema.local"
$env:ADMIN_PASSWORD="rmbvadmin"
$env:ADMIN_NAME="Admin"

npx prisma migrate deploy
npm run db:seed
```

### Banco que já existia com `db push` (migração única)

Se as tabelas já existiam antes das migrations formais:

```powershell
npx prisma migrate resolve --applied 20250605120000_init
```

Depois disso, `prisma migrate deploy` nos próximos deploys aplica apenas migrations novas.

### Deploy manual

```powershell
npx vercel --prod
```

### CI (GitHub Actions)

Cada push/PR em `main` executa:

1. `npm run lint`
2. `npm run typecheck`
3. E2E com Postgres 16 (migrations + seed + build + Playwright)

Artefato `playwright-report` é salvo em caso de falha (7 dias).

---

## 5. Operação do dia a dia

### Login padrão (após seed)

| Papel | Login | Senha |
|---|---|---|
| Admin | `Admin` | `rmbvadmin` |
| ADV | `adv@sistema.local` | `Adv@123` |
| Gerente | `gerente@sistema.local` | `Gerente@123` |

Trocar senhas em produção após o primeiro acesso.

### Fluxo Admin inicial

1. **Administração → Equipes** — criar equipes
2. **Administração → Usuários** — ADV, Gerente, Colaborador, Pesquisador
3. **Administração → Importar CSV** — modelo em `public/MODEL.csv`
4. **Minha equipe** (ADV) — teses, membros, horário, GPS do escritório
5. **Administração → Ponto** — gerar link do quiosque por equipe

### Backup e exportação

| Operação | Limite | Onde |
|---|---|---|
| Export CSV clientes | 10.000 registros | Relatórios ou `/api/reports/export` |
| Backup JSON admin | 10.000 clientes | Administração → Backup |
| Bulk delete/assign | 500 IDs por requisição | Administração → Clientes |

Exports truncados retornam flag `truncated` / header `X-Export-Truncated: true`.

### Retenção LGPD (cron)

- **Agendamento:** diário às 03:00 UTC (`vercel.json`)
- **Rota:** `GET /api/cron/purge-retention`
- **Auth:** header `Authorization: Bearer {CRON_SECRET}`
- **Ação:** remove registros de ponto e logs faciais com mais de **30 dias**

Sem `CRON_SECRET`, o cron retorna 503.

---

## 6. Ponto eletrônico facial (produção)

### Canais

| Canal | Rota | Origem no registro |
|---|---|---|
| Celular | `/ponto` | `MOBILE` |
| Tablet quiosque | `/kiosk?teamId=…&kioskKey=…` | `KIOSK` |

### Segurança (Sprint 1)

- `POST /api/ponto` é público no middleware, mas **valida o descritor facial no servidor** (`src/lib/face-verify.ts`)
- O cliente não pode mais enviar `confidence: 1.0` sem prova biométrica
- `GET /api/ponto/faces` retorna **410 Gone** (descontinuado — não expõe templates)
- `POST /api/ponto/match` — match no servidor; exige header `X-Kiosk-Key`
- `GET /api/ponto/last` — exige sessão ou chave do quiosque

### Configurar quiosque

1. Na Vercel, definir `KIOSK_API_KEY` (string longa e aleatória, diferente do JWT)
2. Redeploy
3. Login como Admin → **Administração → aba Ponto**
4. Selecionar equipe → **Gerar link do quiosque**
5. Abrir o link no tablet (modo quiosque / tela fixa)
6. Cadastrar rostos dos colaboradores antes do primeiro uso

O link contém `teamId` e `kioskKey` na query string. **Não compartilhar publicamente.**

Em desenvolvimento, sem `KIOSK_API_KEY`, o fallback é `dev-kiosk-key`.

### GPS (opcional por usuário)

- Coordenadas do escritório: **Minha equipe → Localização**
- Flag `gpsRequired` por membro
- Raio padrão configurável (metros)
- Validação no `POST /api/ponto` via Haversine

### Horário de acesso

- Regras por colaborador (`UserAccessRule`) ou por equipe (`Team.schedule*`)
- **COLABORADOR** e **PESQUISADOR** bloqueados fora do horário:
  - UI: `AccessBlockedScreen`
  - API: `withAuth()` retorna 403 (`ScheduleBlockedError`)
- Exceções: `/api/auth/me`, `/api/equipe/schedule-check` usam `{ skipSchedule: true }`

---

## 7. Monitoramento e troubleshooting

### Problemas comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| Login falha | `JWT_SECRET` ou banco | Verificar health; rodar seed |
| `users: empty` | Seed não executado | `npm run db:seed` no Neon de produção |
| Upload some após deploy | Sem Blob | Criar Vercel Blob + `BLOB_READ_WRITE_TOKEN` |
| Quiosque 503 | `KIOSK_API_KEY` ausente | Definir na Vercel e redeploy |
| Quiosque 401 | Chave errada no tablet | Gerar novo link no Admin |
| Ponto rejeitado | Rosto não cadastrado ou baixa confiança | Recadastrar em Perfil ou Admin |
| Build falha em migration | Banco desalinhado | `migrate resolve` ou corrigir schema |
| Build falha `_document` | Cache `.next` corrompido | `Remove-Item -Recurse .next` e rebuild |

### Comandos úteis (local, apontando para produção)

```powershell
# Puxar variáveis (secrets ficam vazios — copiar manualmente)
npx vercel env pull .env.local --environment=production

# Verificar tipos e build
npm run typecheck
npm run build

# Testes E2E (exige DATABASE_URL + seed)
npm run test:e2e
```

### Logs

- **Vercel → projeto → Logs** — erros de API em tempo real
- **Neon → Monitoring** — conexões e queries lentas
- Auditoria interna: Administração → Auditoria

---

## 8. Segurança operacional

| Item | Status atual |
|---|---|
| Validação facial no servidor | ✅ Implementado |
| Templates faciais não expostos publicamente | ✅ `faces` descontinuado |
| Quiosque com chave dedicada | ✅ `KIOSK_API_KEY` |
| Horário enforced no servidor | ✅ `schedule-access.ts` |
| Rate limiting login | Parcial — ver roadmap |
| HTTPS | ✅ Vercel |
| Cookies httpOnly | ✅ JWT em cookie |
| Retenção biométrica 30 dias | ✅ Cron |

**Checklist pós-deploy das Sprints 1–3:**

- [ ] `KIOSK_API_KEY` definida na Vercel
- [ ] `CRON_SECRET` definida (se quiser purge automático)
- [ ] `BLOB_READ_WRITE_TOKEN` configurado
- [ ] Seed executado no banco de produção
- [ ] `/api/health` retorna `ok: true`
- [ ] Tablets reconfigurados com novo link do quiosque
- [ ] Senhas padrão alteradas

---

## 9. Referências

| Documento | Conteúdo |
|---|---|
| [PASSO-A-PASSO.md](./PASSO-A-PASSO.md) | Instalação local e fluxo de uso |
| [ROADMAP.md](./ROADMAP.md) | Melhorias sugeridas para implementar |
| [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md) | Documento vivo técnico |
| [../DEPLOY.md](../DEPLOY.md) | Checklist rápido de deploy |
| [../README.md](../README.md) | Visão geral do projeto |
