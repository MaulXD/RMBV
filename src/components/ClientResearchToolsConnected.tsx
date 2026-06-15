"use client";

import { useEffect, useRef } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import type { ClientProfileData } from "@/lib/client-fields";
import { ClientResearchTools } from "./ClientResearchTools";

export function ClientResearchToolsConnected({
  client,
  disabled,
  latestPhoneChecks,
  onUpdated,
  onPhoneCheckRecorded,
}: {
  client: ClientProfileData;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onUpdated: (client: ClientProfileData) => void;
  onPhoneCheckRecorded?: () => void;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  async function patchField(field: string, value: string) {
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const data = await res.json();
    if (res.ok) onUpdated(data.client);
  }

  function scheduleTextSave(text: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void patchField("rawExtractText", text);
    }, 1200);
  }

  return (
    <ClientResearchTools
      formValues={client}
      clientId={client.id}
      disabled={disabled}
      latestPhoneChecks={latestPhoneChecks}
      initialText={client.rawExtractText ?? ""}
      onTextChange={scheduleTextSave}
      onApplyPhone={(key, value) => {
        void patchField(key, value);
      }}
      onApplyAddress={(key, value) => {
        void patchField(key, value);
      }}
      onPhoneCheckRecorded={() => {
        onPhoneCheckRecorded?.();
        void fetch(`/api/clients/${client.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.client) onUpdated(d.client);
          });
      }}
    />
  );
}
