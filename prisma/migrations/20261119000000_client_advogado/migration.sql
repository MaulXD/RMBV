-- Advogado responsável pelo cliente
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "advogadoId" TEXT;
CREATE INDEX IF NOT EXISTS "Client_advogadoId_idx" ON "Client"("advogadoId");
DO $$ BEGIN
  ALTER TABLE "Client" ADD CONSTRAINT "Client_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
