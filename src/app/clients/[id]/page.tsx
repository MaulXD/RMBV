"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ClientProfileForm } from "@/components/ClientProfileForm";
import { ClientProfileView } from "@/components/ClientProfileView";
import { ClientDocuments } from "@/components/ClientDocuments";
import type { ClientProfileData } from "@/lib/client-fields";

type Category = { id: string; name: string };

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<ClientProfileData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${id}`);
    const data = await res.json();
    if (res.ok) setClient(data.client);
  }, [id]);

  useEffect(() => {
    Promise.all([
      loadClient(),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([, catData, meData]) => {
        setCategories(catData.categories ?? []);
        setIsAdmin(meData.user?.role === "ADMIN");
      })
      .finally(() => setLoading(false));
  }, [loadClient]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Carregando cliente...</p>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Cliente não encontrado.</p>
        <Link href="/dashboard" className="btn-ghost mt-4 inline-flex">
          Voltar
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
            ← Voltar ao painel
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-wide">Perfil do cliente</h1>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? "Modo visualização" : "Editar perfil"}
        </button>
      </div>

      <div className="space-y-6">
        {editMode ? (
          <ClientProfileForm
            client={client}
            categories={categories}
            onSaved={(updated) => {
              setClient(updated);
              setEditMode(false);
            }}
          />
        ) : (
          <ClientProfileView client={client} />
        )}
        <ClientDocuments clientId={client.id} isAdmin={isAdmin} />
      </div>
    </AppShell>
  );
}
