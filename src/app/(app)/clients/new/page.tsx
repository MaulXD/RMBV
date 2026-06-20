"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClientManualCreateForm } from "@/components/ClientManualCreateForm";

type Category = { id: string; name: string };

export default function NewClientPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-muted hover:text-foreground">
          ← Voltar ao painel
        </Link>
        <h1 className="font-display mt-2 text-xl font-semibold tracking-wide">Cadastro manual</h1>
        <p className="mt-1 text-sm text-muted">Preencha os campos do cadastro do cliente</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando categorias...</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhuma categoria disponível para cadastro. Verifique suas permissões.
        </p>
      ) : (
        <ClientManualCreateForm categories={categories} />
      )}
    </>
  );
}
