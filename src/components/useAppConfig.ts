"use client";

import { useEffect, useState } from "react";

export type AppConfig = {
  openaiExtract: boolean;
  blobStorage: boolean;
  documentUpload: boolean;
  hints: {
    openaiExtract: string | null;
    documentUpload: string | null;
  };
};

const DEFAULT_CONFIG: AppConfig = {
  openaiExtract: false,
  blobStorage: false,
  documentUpload: true,
  hints: { openaiExtract: null, documentUpload: null },
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/app-config")
      .then((r) => r.json())
      .then((data) => setConfig({ ...DEFAULT_CONFIG, ...data }))
      .catch(() => setConfig(DEFAULT_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
