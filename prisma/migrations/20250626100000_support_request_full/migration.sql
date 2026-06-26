-- Add TicketStatus enum
DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'FECHADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add missing columns to SupportRequest
ALTER TABLE "SupportRequest"
  ADD COLUMN IF NOT EXISTS "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

-- CreateTable: SupportTicketResponse
CREATE TABLE IF NOT EXISTS "SupportTicketResponse" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportRequest_assignedToId_idx" ON "SupportRequest"("assignedToId");
CREATE INDEX IF NOT EXISTS "SupportRequest_status_idx" ON "SupportRequest"("status");
CREATE INDEX IF NOT EXISTS "SupportTicketResponse_ticketId_idx" ON "SupportTicketResponse"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketResponse_userId_idx" ON "SupportTicketResponse"("userId");

-- AddForeignKey (idempotent via DO block)
DO $$ BEGIN
  ALTER TABLE "SupportRequest"
    ADD CONSTRAINT "SupportRequest_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupportTicketResponse"
    ADD CONSTRAINT "SupportTicketResponse_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupportTicketResponse"
    ADD CONSTRAINT "SupportTicketResponse_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
