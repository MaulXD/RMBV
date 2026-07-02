-- Add TicketPriority enum
DO $$ BEGIN
  CREATE TYPE "TicketPriority" AS ENUM ('URGENTE', 'NORMAL', 'BAIXA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add priority column to SupportRequest
ALTER TABLE "SupportRequest"
  ADD COLUMN IF NOT EXISTS "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL';

-- CreateIndex on priority
CREATE INDEX IF NOT EXISTS "SupportRequest_priority_idx" ON "SupportRequest"("priority");

-- CreateTable: SupportTicketStatusHistory
CREATE TABLE IF NOT EXISTS "SupportTicketStatusHistory" (
    "id"            TEXT NOT NULL,
    "ticketId"      TEXT NOT NULL,
    "fromStatus"    "TicketStatus",
    "toStatus"      "TicketStatus" NOT NULL,
    "changedById"   TEXT,
    "changedByName" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on SupportTicketStatusHistory
CREATE INDEX IF NOT EXISTS "SupportTicketStatusHistory_ticketId_idx" ON "SupportTicketStatusHistory"("ticketId");

-- AddForeignKey: SupportTicketStatusHistory -> SupportRequest
DO $$ BEGIN
  ALTER TABLE "SupportTicketStatusHistory"
    ADD CONSTRAINT "SupportTicketStatusHistory_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
