"use client";

import Link from "next/link";

export default function PesquisaPage() {
  return (
    <div className="industrial-panel space-y-3 p-6 text-center">
      <h1 className="font-display text-xl font-semibold tracking-wide">Pesquisa</h1>
      <p className="text-sm text-muted">
        O campo de pesquisa fica dentro de cada cliente. Abra um cliente e use a seção{" "}
        <strong className="text-foreground">Pesquisa</strong> para colar textos e extrair
        telefones e endereços.
      </p>
      <Link href="/dashboard" className="btn-primary mt-2 inline-flex">
        Ir para clientes
      </Link>
    </div>
  );
}
