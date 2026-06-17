"use client";

import { useEffect, useRef, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  cod: string | null;
  cpf: string | null;
  tese: string | null;
  phone1: string | null;
};

export function ClientSearchField({
  value,
  onChange,
  disabled,
  placeholder = "Buscar cliente por nome ou código…",
}: {
  value: ClientOption | null;
  onChange: (client: ClientOption | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  function handleSearch(text: string) {
    setQuery(text);
    onChange(null);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setOptions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ search: text.trim(), pageSize: "8", page: "1" });
        const res = await fetch(`/api/clients?${params}`);
        const data = await res.json();
        if (res.ok) setOptions((data.clients ?? []) as ClientOption[]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  return (
    <div className="space-y-2">
      <input
        className="industrial-input"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {searching && <p className="text-xs text-muted">Buscando…</p>}
      {options.length > 0 && !value && (
        <ul className="max-h-48 overflow-y-auto rounded-[var(--radius-ui)] border border-border">
          {options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5"
                onClick={() => {
                  onChange(c);
                  setQuery(c.name);
                  setOptions([]);
                }}
              >
                <span className="font-medium">{c.name}</span>
                {c.cod && <span className="ml-2 text-xs text-muted">#{c.cod}</span>}
                {c.tese && <span className="ml-2 text-xs text-muted">· {c.tese}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="text-xs text-muted">
          Selecionado: <span className="text-foreground">{value.name}</span>
          <button
            type="button"
            className="ml-2 text-primary hover:underline"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
          >
            limpar
          </button>
        </p>
      )}
    </div>
  );
}

export type { ClientOption };
