"use client";

import { useEffect, useState } from "react";

export type AppConfig = {
  blobStorage: boolean;
  documentUpload: boolean;
  hints: {
    documentUpload: string | null;
  };
};

const DEFAULT_CONFIG: AppConfig = {
  blobStorage: false,
  documentUpload: true,
  hints: { documentUpload: null },
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
