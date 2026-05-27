import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { canPersistDocuments, usesBlobStorage } from "@/lib/document-storage";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async () => {
    const blob = usesBlobStorage();

    return NextResponse.json({
      blobStorage: blob,
      documentUpload: canPersistDocuments(),
      hints: {
        documentUpload: canPersistDocuments()
          ? null
          : process.env.VERCEL
            ? "Configure Vercel Blob (BLOB_READ_WRITE_TOKEN) para persistir uploads."
            : "Upload local funciona apenas em desenvolvimento.",
      },
    });
  });
}
