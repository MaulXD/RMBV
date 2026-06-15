import OpenAI from "openai";
import { extractionResultSchema, type ExtractionResult } from "./extract-types";
import { CSV_HEADERS } from "./client-fields";
import { isOpenAiConfigured, openAiMissingError } from "./openai-env";

const SYSTEM_PROMPT = `Você extrai dados estruturados de textos brutos sobre clientes.
Responda APENAS com JSON válido, sem markdown, usando exatamente estas chaves:
{
  "cod": "",
  "tese": "",
  "name": "",
  "cpf": "",
  "birthDate": "",
  "obito": "",
  "deathDate": "",
  "phone1": "", "phone2": "", "phone3": "", "phone4": "", "phone5": "",
  "phone6": "", "phone7": "", "phone8": "", "phone9": "", "phone10": "",
  "address1": "", "address2": "", "address3": ""
}
Campos do modelo: ${CSV_HEADERS.join(", ")}.
"name" é obrigatório (campo NOME). Use string vazia ou null para campos desconhecidos.`;

export async function extractClientDataFromText(rawText: string): Promise<ExtractionResult> {
  if (!isOpenAiConfigured()) {
    throw new Error(openAiMissingError());
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia do modelo");

  const parsed = JSON.parse(content);
  return extractionResultSchema.parse(parsed);
}
