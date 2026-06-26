-- AlterEnum: add PROCESSUAL_UPDATE to NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROCESSUAL_UPDATE';

-- AlterTable: Ação — add processual tracking fields
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "numProcesso" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "classe" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "assunto" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "vara" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "foro" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "tribunal" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "sistema" TEXT DEFAULT 'DATAJUD';
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "ultimaMovimentacaoAt" TIMESTAMP(3);
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "ultimaMovimentacaoText" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "dataAjuizamento" TIMESTAMP(3);
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "dataDistribuicao" TIMESTAMP(3);
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "valorAtualizado" DOUBLE PRECISION;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "parteContraria" TEXT;
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "ultimaConsultaAt" TIMESTAMP(3);
ALTER TABLE "Acao" ADD COLUMN IF NOT EXISTS "consultaStatus" TEXT DEFAULT 'pendente';

-- CreateIndex: unique numProcesso on Acao
CREATE UNIQUE INDEX IF NOT EXISTS "Acao_numProcesso_key" ON "Acao"("numProcesso");
CREATE INDEX IF NOT EXISTS "Acao_numProcesso_idx" ON "Acao"("numProcesso");

-- CreateTable: Movimentacao
CREATE TABLE IF NOT EXISTS "Movimentacao" (
    "id" TEXT NOT NULL,
    "acaoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on Movimentacao
CREATE UNIQUE INDEX IF NOT EXISTS "Movimentacao_hash_key" ON "Movimentacao"("hash");
CREATE INDEX IF NOT EXISTS "Movimentacao_acaoId_idx" ON "Movimentacao"("acaoId");
CREATE INDEX IF NOT EXISTS "Movimentacao_data_idx" ON "Movimentacao"("data");

-- AddForeignKey for Movimentacao
ALTER TABLE "Movimentacao" DROP CONSTRAINT IF EXISTS "Movimentacao_acaoId_fkey";
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "Acao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
