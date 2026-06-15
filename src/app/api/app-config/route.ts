import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { isOpenAiConfigured, openAiConfigHint } from "@/lib/openai-env";
import { canPersistDocuments, usesBlobStorage } from "@/lib/document-storage";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async () => {
    const openai = isOpenAiConfigured();
    const blob = usesBlobStorage();

    return NextResponse.json({
      openaiExtract: openai,
      blobStorage: blob,
      documentUpload: canPersistDocuments(),
      hints: {
        openaiExtract: openai ? null : openAiConfigHint(),
        documentUpload: canPersistDocuments()
          ? null
          : process.env.VERCEL
            ? "Configure Vercel Blob (BLOB_READ_WRITE_TOKEN) para persistir uploads."
            : "Upload local funciona apenas em desenvolvimento.",
      },
    });
  });
}
