import { z } from "zod";

const optionalString = z.string().optional().nullable();

/** Campos do cliente (cadastro e edição). */
export const clientDataSchema = z.object({
  cod: optionalString,
  tese: optionalString,
  name: z.string().min(1),
  cpf: optionalString,
  birthDate: optionalString,
  obito: optionalString,
  deathDate: optionalString,
  phone1: optionalString,
  phone2: optionalString,
  phone3: optionalString,
  phone4: optionalString,
  phone5: optionalString,
  phone6: optionalString,
  phone7: optionalString,
  phone8: optionalString,
  phone9: optionalString,
  phone10: optionalString,
  address1: optionalString,
  address2: optionalString,
  address3: optionalString,
  rawExtractText: optionalString,
});

export type ClientDataInput = z.infer<typeof clientDataSchema>;

export const clientUpdateSchema = clientDataSchema.partial().extend({
  name: z.string().min(1).optional(),
  teseId: z.string().uuid().optional().nullable(),
  status: z.enum(["AGUARDANDO", "LOCALIZADO", "SEM_SUCESSO", "TENTE_NOVAMENTE"]).optional(),
  statusChangeNote: z.string().min(3).max(2000).optional(),
  categoryId: z.string().uuid().optional(),
});
