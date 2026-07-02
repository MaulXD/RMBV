# SCS — Roadmap de melhorias

O que já foi entregue (Sprints 1–3) e o que vale implementar em seguida, ordenado por impacto.

**Legenda:** ✅ feito · 🔄 em andamento · ⏳ sugerido · 🔮 futuro

---

## Entregue recentemente (Sprints 1–4)

| Sprint | Entrega | Status |
|---|---|---|
| **1 — Segurança do ponto** | Validação facial no servidor, quiosque com `KIOSK_API_KEY`, `faces` descontinuado, `migrate deploy` | ✅ |
| **2 — Testes e CI** | Playwright (14 testes), GitHub Actions, `typecheck` | ✅ |
| **3 — Manutenção** | Refatoração `/ponto`, limites de export (10k/500), horário no servidor, remoção `AppShell` | ✅ |
| **4 — Mobile UX + Ações + Cartas** | MobileBottomNav, ChatFloating full-screen mobile, ponto facial self-service, 65% confiança, página Ações (processos, 4 etapas, CSV), página Cartas (endereço estruturado, ViaCEP, export PDF/CSV), aba Ações no perfil do cliente | ✅ |

> **Migração pendente:** `npx prisma db push` para campos `Acao` e endereço no `Client` (BD Neon inacessível na última sessão).

---

## Sprint 4 — Segurança e confiabilidade (prioridade alta)

### 4.1 Rate limiting e proteção de APIs públicas

⏳ Endpoints públicos (`POST /api/ponto`, `POST /api/ponto/match`, `POST /api/auth/login`) ainda podem receber abuso por volume.

**Sugestão:**
- Rate limit por IP (Upstash Redis ou Vercel KV)
- Lockout temporário após N tentativas de login falhas
- Throttle no match facial do quiosque

**Impacto:** reduz brute force e spam de ponto.

### 4.2 Tokens de quiosque por dispositivo

⏳ Hoje um único `KIOSK_API_KEY` vale para todos os tablets.

**Sugestão:**
- Chave por equipe + dispositivo, com expiração e revogação no Admin
- QR code de pareamento em vez de URL com chave na query string

**Impacto:** comprometimento de um tablet não expõe todos os quiosques.

### 4.3 Auditoria de ponto reforçada

⏳ Já existe `faceAuditLog` e `PONTO_FAIL` — falta painel e alertas.

**Sugestão:**
- Dashboard de tentativas rejeitadas (fraude vs. falso negativo)
- Export CSV de auditoria facial para RH
- Notificação in-app para gerente quando há 3+ falhas do mesmo usuário

### 4.4 Testes E2E ampliados

⏳ Cobertura atual é smoke; faltam cenários críticos.

**Sugestão:**
- Teste de bloqueio fora do horário (403 na API)
- Teste de export truncado
- Teste de GPS rejeitado (mock)
- Teste de fluxo de primeiro acesso

---

## Sprint 5 — Ponto facial e RH (prioridade alta)

### 5.1 Estabilidade do reconhecimento

⏳ Confiança ainda oscila entre frames (iluminação, ângulo, câmera).

**Sugestão:**
- Média de N frames estáveis antes de registrar (5 frames no ponto, como no cadastro)
- Threshold adaptativo por usuário após N pontos bem-sucedidos
- Feedback visual de qualidade (luz, distância, centralização)
- Recadastro assistido com comparação antes/depois

### 5.2 Relatórios de RH

⏳ Horas CLT (8h) e estagiário (6h) calculadas na UI; falta export formal.

**Sugestão:**
- Relatório mensal por colaborador (PDF/CSV): horas, atrasos, faltas de saída
- Visão gerente: equipe inteira, filtros por período
- Integração com folha (export formato padrão)

### 5.3 Notificações de ponto

🔮 Definido como “não por enquanto” nas specs anteriores, mas útil depois.

**Sugestão:**
- Lembrete push/email de saída não registrada
- Alerta de intervalo longo demais
- Web Push via service worker (PWA)

### 5.4 Modo offline no quiosque

⏳ Tablet sem internet perde o ponto.

**Sugestão:**
- Fila local (IndexedDB) com sync quando reconectar
- Indicador visual “sem conexão”

---

## Sprint 6 — Produto e UX (prioridade média)

### 6.1 Mobile e PWA

⏳ App responsivo, mas sem instalação nem push.

**Sugestão:**
- `manifest.json` + ícones para “Adicionar à tela inicial”
- Gestos e touch targets revisados em `/ponto` e `/clients/[id]`
- Bottom sheet em modais longos
- `next/image` nos avatares (hoje `<img>` gera warnings no build)

### 6.2 Dashboard e listagens

⏳ Paginação parcial; listas grandes podem ficar lentas.

**Sugestão:**
- Paginação server-side no dashboard principal
- Virtualização de tabela (react-virtual)
- Filtros salvos por usuário
- Atalhos de teclado documentados

### 6.3 Kanban e Chamados

⏳ Kanban funcional; chamados existem mas com menos polish que o guia Nexus.

**Sugestão:**
- Prioridade e etiquetas nas tarefas
- Checklist com progresso no card
- Pipeline visual nos chamados (como Kanban de tickets)
- SLA com escalação automática

### 6.4 Ferramentas PDF

⏳ Pacote rico (merge, Bates, OCR, redação) — falta polish.

**Sugestão:**
- Preview em tempo real antes de aplicar Bates/marca d'água
- Templates de capa do escritório
- Histórico de operações PDF por cliente

---

## Sprint 7 — Dados e integrações (prioridade média)

### 7.1 Extração de pesquisa

⏳ Parser de CPF/data melhorado; fluxo de revisão existe.

**Sugestão:**
- Extração em lote de múltiplos clientes
- Diff visual antes de aplicar (campo a campo)
- Histórico de extrações com rollback
- Validação de CPF com dígito verificador na UI

### 7.2 Duplicatas e qualidade de dados

⏳ Detecção por CPF existe.

**Sugestão:**
- Merge assistido de clientes duplicados
- Score de completude do cadastro (% campos preenchidos)
- Alertas de cliente parado há X dias

### 7.3 Integrações externas

🔮 Depende de necessidade do escritório.

**Sugestão:**
- Webhook ao finalizar cliente
- API read-only para BI (Metabase, Power BI)
- Importação periódica de planilhas (SFTP/cron)

---

## Sprint 8 — Governança e admin (prioridade média-baixa)

### 8.1 Gestão de usuários

⏳ Reset de senha e desativação sem apagar ainda pendentes.

**Sugestão:**
- Admin reseta senha e força primeiro acesso
- `isActive: false` bloqueia login com mensagem clara
- Log de quem desativou/reativou

### 8.2 LGPD e compliance

⏳ Termo no cadastro facial e retenção 30 dias implementados.

**Sugestão:**
- Export de dados pessoais por usuário (portabilidade)
- Anonimização de cliente arquivado
- Registro de consentimento com versão do termo
- Política de privacidade versionada no sistema

### 8.3 Multi-equipe e permissões finas

⏳ RBAC por categoria funciona; alguns casos edge persistem.

**Sugestão:**
- Colaborador com acesso a múltiplas equipes
- Permissão “somente leitura” por categoria
- Delegação temporária (férias do gerente)

---

## Sprint 9 — Infra e qualidade (contínuo)

| Item | Status | Próximo passo |
|---|---|---|
| Migrations formais | ✅ | Novas alterações sempre via `prisma migrate dev` |
| CI com e2e | ✅ | Aumentar cobertura; badge no README |
| Monitoramento | ⏳ | Sentry ou Vercel Observability para erros 5xx |
| Performance DB | ⏳ | Índices em `PontoRecord.recordedAt`, `Client.teamId+status` |
| Cache | ⏳ | `unstable_cache` em relatórios pesados |
| Prisma 7 | 🔮 | Migrar de `package.json#prisma` para `prisma.config.ts` |

---

## Backlog rápido (quick wins)

Itens pequenos com bom retorno:

1. **Reset senha pelo admin** — 1 tela + 1 rota API
2. **Desativar usuário** — flag `isActive` já existe no schema?
3. **Módulo APA** — placeholder “Em breve” em `/pesquisa`
4. **Transferir tese entre equipes** — pendente no TeseManager
5. **Documentar atalhos** — modal `?` com ⌘K, navegação, etc.
6. **Health check do quiosque** — página `/kiosk` mostra status da chave e modelos carregados

---

## Como priorizar

```
Impacto alto + esforço baixo  →  Sprint 4 quick wins + testes E2E
Impacto alto + esforço médio  →  Tokens por dispositivo + relatório RH
Impacto médio + esforço alto  →  PWA + integrações externas
```

**Recomendação imediata (próximas 2 semanas):**

1. Completar checklist de produção (`docs/PRODUCAO.md` seção 8)
2. Sprint 4.1 — rate limiting no login e ponto
3. Sprint 4.4 — testes de horário e export
4. Sprint 5.2 — relatório mensal de horas (PDF)

---

## Referências

- [PRODUCAO.md](./PRODUCAO.md) — operação em produção
- [DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md) — arquitetura e histórico técnico
- [RELATORIO-AUDITORIA.md](./RELATORIO-AUDITORIA.md) — auditoria de maio/2026
