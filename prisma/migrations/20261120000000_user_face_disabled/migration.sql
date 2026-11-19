-- Dispensa de reconhecimento facial por usuário
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "faceDisabled" BOOLEAN NOT NULL DEFAULT false;
