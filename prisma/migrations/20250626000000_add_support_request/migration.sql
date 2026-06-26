-- CreateTable: SupportRequest
CREATE TABLE IF NOT EXISTS "SupportRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sala" TEXT NOT NULL,
    "necessidade" TEXT NOT NULL,
    "outroTexto" TEXT,
    "obs" TEXT,
    "email" TEXT,
    "requesterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportRequest_requesterId_idx" ON "SupportRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");
