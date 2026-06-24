-- AlterTable: add structured address fields and followUpAt to Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cep" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logradouro" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "numero" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "complemento" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bairro" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "uf" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);

-- CreateIndex: performance indices on Client
CREATE INDEX IF NOT EXISTS "Client_teamId_status_idx" ON "Client"("teamId", "status");
CREATE INDEX IF NOT EXISTS "Client_teamId_workflowStatus_idx" ON "Client"("teamId", "workflowStatus");
CREATE INDEX IF NOT EXISTS "Client_teseId_idx" ON "Client"("teseId");
CREATE INDEX IF NOT EXISTS "Client_followUpAt_idx" ON "Client"("followUpAt");

-- CreateTable: Acao
CREATE TABLE IF NOT EXISTS "Acao" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "teamId" TEXT,
    "numCNJ" TEXT,
    "valorCausa" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "advConfirmadoAt" TIMESTAMP(3),
    "advConfirmadoById" TEXT,
    "advNota" TEXT,
    "docsEnviadosAt" TIMESTAMP(3),
    "docsEnviadosById" TEXT,
    "docsNota" TEXT,
    "entradaAt" TIMESTAMP(3),
    "entradaById" TEXT,
    "entradaNota" TEXT,
    "sentencaAt" TIMESTAMP(3),
    "sentencaById" TEXT,
    "sentencaResultado" TEXT,
    "sentencaNota" TEXT,

    CONSTRAINT "Acao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Acao
CREATE INDEX IF NOT EXISTS "Acao_clientId_idx" ON "Acao"("clientId");
CREATE INDEX IF NOT EXISTS "Acao_teamId_idx" ON "Acao"("teamId");

-- AddForeignKey for Acao
ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_clientId_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_teamId_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_createdById_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_advConfirmadoById_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_advConfirmadoById_fkey" FOREIGN KEY ("advConfirmadoById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_docsEnviadosById_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_docsEnviadosById_fkey" FOREIGN KEY ("docsEnviadosById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_entradaById_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_entradaById_fkey" FOREIGN KEY ("entradaById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Acao" DROP CONSTRAINT IF EXISTS "Acao_sentencaById_fkey";
ALTER TABLE "Acao" ADD CONSTRAINT "Acao_sentencaById_fkey" FOREIGN KEY ("sentencaById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
