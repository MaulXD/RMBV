# Projeto — RMBV System

## Passo 1: Infraestrutura e Banco de Dados

- Prisma ORM com PostgreSQL
- Enums `Role`: ADMIN, GERENTE, COLABORADOR
- `Permission` vinculada a `Category` com `@@unique([role, categoryId])`
- Seed: usuário ADMIN, 3 categorias e matriz de permissões por papel

## Passo 2: Temas (Tailwind CSS)

Paleta industrial:

- **Grafite** — fundos escuros e texto em modo claro
- **Titânio** — tons neutros intermediários
- **Aço Escovado** — bordas e superfícies elevadas
- **Platina** — highlights e modo escuro

`ThemeProvider` + script inline no `<head>` evitam flash ao alternar tema.

## Passo 3: RBAC (Backend)

- `getCategoryPermission` / `assertCategoryPermission`
- ADMIN ignora restrições de categoria
- Rotas de API validam `canCreate`, `canRead`, etc. antes de persistir ou listar

## Passo 4: Dashboard

- Layout minimalista, cantos 4px
- Botões primários com inversão radical no hover
- Tabela de clientes com chips de categorias

## Passo 5: Extração inteligente

- Tela dividida: textarea terminal (esquerda) + formulário estruturado (direita)
- `POST /api/extract` envia texto ao modelo e retorna JSON validado com Zod
- Salvamento via `POST /api/clients` com vínculo à categoria
