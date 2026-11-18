-- Atualizações por ação coletiva (tese)
CREATE TABLE IF NOT EXISTS "TeseAtualizacao" (
    "id" TEXT NOT NULL,
    "teseId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "fonteUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeseAtualizacao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeseAtualizacao_teseId_data_idx" ON "TeseAtualizacao"("teseId", "data");
ALTER TABLE "TeseAtualizacao" ADD CONSTRAINT "TeseAtualizacao_teseId_fkey" FOREIGN KEY ("teseId") REFERENCES "Tese"("id") ON DELETE CASCADE ON UPDATE CASCADE;
