# Passo a passo — RMBV System

Guia completo: ambiente local, deploy, uso do painel e identidade visual.

---

## 1. O que você precisa

- **Node.js 20+**
- Conta **GitHub** (código) e **Vercel** (hospedagem)
- Banco **PostgreSQL** — recomendado [Neon](https://neon.tech) (grátis, liga na Vercel)
- *(Opcional)* **Vercel Blob** para upload de documentos em produção

**Não é necessário** chave OpenAI — extração por IA foi removida do sistema.

---

## 2. Clonar e instalar

```powershell
git clone https://github.com/MaulXD/RMBV.git
cd RMBV
npm install
```

---

## 3. Variáveis de ambiente

Copie o exemplo:

```powershell
cp .env.example .env
```

Edite `.env` (ou `.env.local` no dia a dia):

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | `postgresql://...?sslmode=require` (Neon) |
| `JWT_SECRET` | Sim | String aleatória com **32+ caracteres** |
| `ADMIN_EMAIL` | Seed | Email do administrador |
| `ADMIN_PASSWORD` | Seed | Senha do admin |
| `ADMIN_NAME` | Seed | Login exibido (ex.: `Admin`) |
| `BLOB_READ_WRITE_TOKEN` | Produção | Vercel → Storage → Blob |

Remova `OPENAI_API_KEY` se ainda existir no seu `.env` — não é mais usada.

---

## 4. Criar tabelas e usuários (seed)

```powershell
$env:DATABASE_URL="postgresql://..."
$env:JWT_SECRET="sua-chave-longa-aqui"
$env:ADMIN_EMAIL="admin@sistema.local"
$env:ADMIN_PASSWORD="rmbvadmin"
$env:ADMIN_NAME="Admin"
npm run db:push
npm run db:seed
```

---

## 5. Rodar localmente

```powershell
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

**Login padrão (após seed):**

| Papel | Login | Senha |
|-------|--------|--------|
| Admin | `Admin` | `rmbvadmin` |
| ADV | `adv@sistema.local` | `Adv@123` |
| Gerente | `gerente@sistema.local` | `Gerente@123` |

---

## 6. Deploy na Vercel

1. Importe o repositório **RMBV** na Vercel.
2. Adicione as variáveis da tabela acima (Settings → Environment Variables).
3. Instale **Neon** pelo Marketplace (preenche `DATABASE_URL`).
4. *(Opcional)* Crie **Blob Store** e conecte ao projeto.
5. No PC, com a **mesma** `DATABASE_URL` da Vercel:

```powershell
npm run db:push
npm run db:seed
```

6. Deploy:

```powershell
npx vercel --prod
```

7. Teste: `https://SEU-APP.vercel.app/api/health` → `"ok": true`

Detalhes: [docs/PRODUCAO.md](./PRODUCAO.md) · Melhorias: [docs/ROADMAP.md](./ROADMAP.md)

---

## 7. Usar o sistema (fluxo Admin)

1. **Login** como Admin.
2. Menu **Administração**:
   - **Equipes** — criar equipe + ADV (ou só equipe e depois usuários).
   - **Usuários** — Gerente/Colaborador/ADV em cada equipe.
   - **Importar CSV** — modelo em `public/MODEL.csv`.
3. **Clientes** — dashboard, filtros por tese, novo cliente manual.
4. **Perfil do cliente** — editar dados, documentos, histórico, finalização.
5. **Minha equipe** (ADV) — membros e teses da equipe.

---

## 8. Identidade visual (`design.md`)

O arquivo **[design.md](../design.md)** na raiz define:

- Paleta **modo claro** e **modo escuro** (ciano neon, glassmorphism).
- Tipografia **Inter** + títulos **Playfair Display**.
- Ícones **Lucide** (outline).

Aplicação técnica: `src/app/globals.css` + `src/app/layout.tsx`.

Alternar tema: botão sol/lua na barra superior.

---

## 9. Comandos úteis

| Comando | Função |
|---------|--------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:push` | Sincroniza schema Prisma |
| `npm run db:seed` | Usuários, equipes, categorias |
| `npm run lint` | ESLint |

---

## 10. Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Login falha em produção | `DATABASE_URL` + `JWT_SECRET` na Vercel; rodar seed no Neon |
| `users: empty` no health | `npm run db:seed` no banco correto |
| Upload não persiste | Configurar Vercel Blob (`BLOB_READ_WRITE_TOKEN`) |
| Equipes não criam | Rodar `db:push` após atualizar código (tabela `Team`) |
| `prisma generate` EPERM no Windows | Pare `npm run dev` e tente de novo |

---

## Produção atual

- URL: https://rmbv.vercel.app  
- Health: https://rmbv.vercel.app/api/health  
