"use client";

import { useEffect, useMemo, useState } from "react";
import type { PhoneCheckResult } from "@prisma/client";
import {
  parseResearchText,
  nextEmptyPhoneSlot,
  nextEmptyAddressSlot,
  type DataCategory,
  type ExtractedAddress,
  type ExtractedPhone,
  type ParsedResearch,
} from "@/lib/text-intelligence";
import { PHONE_FIELD_KEYS } from "@/lib/client-fields";
import { PhoneCheckButtons } from "./PhoneCheckButtons";
import { Icon } from "./ui/Icon";

export type ResearchSlotValues = {
  phone1?: string | null;
  phone2?: string | null;
  phone3?: string | null;
  phone4?: string | null;
  phone5?: string | null;
  phone6?: string | null;
  phone7?: string | null;
  phone8?: string | null;
  phone9?: string | null;
  phone10?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
};

const CATEGORY_LABELS: Record<DataCategory, string> = {
  cliente: "Cliente / herdeiro",
  autor: "Autor / falecido",
  outros: "Outros",
};

const CATEGORY_COLORS: Record<DataCategory, string> = {
  cliente: "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  autor: "border-amber-600/40 bg-amber-600/10 text-amber-900 dark:text-amber-300",
  outros: "border-border bg-surface/50 text-muted",
};

type FormValues = ResearchSlotValues;

function CategoryBadge({ category }: { category: DataCategory }) {
  return (
    <span
      className={`inline-flex rounded-[var(--radius-ui)] border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${CATEGORY_COLORS[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function PhoneRow({
  phone,
  formValues,
  clientId,
  disabled,
  latestPhoneChecks,
  onApplyPhone,
  onPhoneCheckRecorded,
}: {
  phone: ExtractedPhone;
  formValues: FormValues;
  clientId?: string;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onPhoneCheckRecorded?: () => void;
}) {
  const assignedSlot = PHONE_FIELD_KEYS.find(
    (key) => normalize(formValues[key]) === phone.digits
  );
  const nextSlot = nextEmptyPhoneSlot(formValues);

  function normalize(v: string | null | undefined) {
    return String(v ?? "").replace(/\D/g, "");
  }

  async function applyAndCheck(phoneKey: string, result: PhoneCheckResult) {
    onApplyPhone(phoneKey, phone.value);
    if (!clientId || disabled) return;

    await fetch(`/api/clients/${clientId}/history/phone-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneKey,
        result,
        phoneNumber: phone.value,
        applyToField: true,
      }),
    });
    onPhoneCheckRecorded?.();
  }

  return (
    <div className="field-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wide">{phone.value}</p>
          <p className="mt-1 text-xs text-muted line-clamp-2">{phone.context}</p>
        </div>
        <CategoryBadge category={phone.category} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {assignedSlot ? (
          <span className="text-xs text-muted">
            Em {assignedSlot.replace("phone", "Telefone ")}
          </span>
        ) : (
          <button
            type="button"
            className="btn-ghost text-xs"
            disabled={disabled || !nextSlot}
            onClick={() => nextSlot && onApplyPhone(nextSlot, phone.value)}
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Usar no próximo campo
          </button>
        )}

        {PHONE_FIELD_KEYS.map((key, index) => {
          const filled = String(formValues[key] ?? "").trim();
          if (filled && normalize(filled) !== phone.digits) return null;
          return (
            <button
              key={key}
              type="button"
              className="btn-ghost text-xs"
              disabled={disabled}
              onClick={() => onApplyPhone(key, phone.value)}
            >
              T{index + 1}
            </button>
          );
        })}
      </div>

      {clientId && (
        <div className="action-toolbar">
          <span className="px-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
            Verificar
          </span>
          {assignedSlot ? (
            <PhoneCheckButtons
              clientId={clientId}
              phoneKey={assignedSlot}
              phoneValue={phone.value}
              currentResult={latestPhoneChecks?.[assignedSlot]}
              disabled={disabled}
              onRecorded={onPhoneCheckRecorded}
            />
          ) : (
            <QuickPhoneCheck
              disabled={disabled || !nextSlot}
              onCheck={(result) => nextSlot && applyAndCheck(nextSlot, result)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function QuickPhoneCheck({
  disabled,
  onCheck,
}: {
  disabled?: boolean;
  onCheck: (result: PhoneCheckResult) => void;
}) {
  const [loading, setLoading] = useState<PhoneCheckResult | null>(null);

  const options: { result: PhoneCheckResult; label: string; className: string }[] = [
    { result: "VALIDO", label: "Válido", className: "text-emerald-700" },
    { result: "INVALIDO", label: "Inválido", className: "text-red-700" },
    { result: "NAO_ATENDE", label: "Não atende", className: "text-amber-700" },
  ];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.result}
          type="button"
          disabled={disabled || loading !== null}
          className={`btn-ghost px-2 py-1 text-xs ${opt.className}`}
          title={`Aplicar e marcar como ${opt.label.toLowerCase()}`}
          onClick={async () => {
            setLoading(opt.result);
            try {
              await onCheck(opt.result);
            } finally {
              setLoading(null);
            }
          }}
        >
          {loading === opt.result ? "…" : opt.label}
        </button>
      ))}
    </div>
  );
}

function AddressRow({
  address,
  formValues,
  disabled,
  onApplyAddress,
}: {
  address: ExtractedAddress;
  formValues: FormValues;
  disabled?: boolean;
  onApplyAddress: (addressKey: string, value: string) => void;
}) {
  const nextSlot = nextEmptyAddressSlot(formValues);

  return (
    <div className="field-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm break-words">{address.value}</p>
        <CategoryBadge category={address.category} />
      </div>
      <p className="mt-1 text-xs text-muted line-clamp-2">{address.context}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={disabled || !nextSlot}
          onClick={() => nextSlot && onApplyAddress(nextSlot, address.value)}
        >
          Usar no próximo endereço
        </button>
        {(["address1", "address2", "address3"] as const).map((key, index) => (
          <button
            key={key}
            type="button"
            className="btn-ghost text-xs"
            disabled={disabled}
            onClick={() => onApplyAddress(key, address.value)}
          >
            E{index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  items,
  type,
  formValues,
  clientId,
  disabled,
  latestPhoneChecks,
  onApplyPhone,
  onApplyAddress,
  onPhoneCheckRecorded,
}: {
  title: string;
  items: ParsedResearch;
  type: "phones" | "addresses";
  formValues: FormValues;
  clientId?: string;
  disabled?: boolean;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onApplyAddress: (addressKey: string, value: string) => void;
  onPhoneCheckRecorded?: () => void;
}) {
  const list =
    type === "phones"
      ? items.phones
      : items.addresses;

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhum {type === "phones" ? "telefone" : "endereço"} encontrado em {title.toLowerCase()}.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {type === "phones"
        ? (list as ExtractedPhone[]).map((phone) => (
            <PhoneRow
              key={phone.id}
              phone={phone}
              formValues={formValues}
              clientId={clientId}
              disabled={disabled}
              latestPhoneChecks={latestPhoneChecks}
              onApplyPhone={onApplyPhone}
              onPhoneCheckRecorded={onPhoneCheckRecorded}
            />
          ))
        : (list as ExtractedAddress[]).map((address) => (
            <AddressRow
              key={address.id}
              address={address}
              formValues={formValues}
              disabled={disabled}
              onApplyAddress={onApplyAddress}
            />
          ))}
    </div>
  );
}

export function ClientResearchParser({
  text,
  formValues,
  onApplyPhone,
  onApplyAddress,
  clientId,
  latestPhoneChecks,
  onPhoneCheckRecorded,
  disabled,
}: {
  text: string;
  formValues: FormValues;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onApplyAddress: (addressKey: string, value: string) => void;
  clientId?: string;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onPhoneCheckRecorded?: () => void;
  disabled?: boolean;
}) {
  const [parsed, setParsed] = useState<ParsedResearch | null>(null);
  const [filter, setFilter] = useState<DataCategory | "todos">("todos");
  const [tab, setTab] = useState<"phones" | "addresses">("phones");

  const filtered = useMemo(() => {
    if (!parsed) return null;
    if (filter === "todos") return parsed;
    return {
      ...parsed,
      phones: parsed.phones.filter((p) => p.category === filter),
      addresses: parsed.addresses.filter((a) => a.category === filter),
    };
  }, [parsed, filter]);

  function analyze() {
    setParsed(parseResearchText(text));
  }

  return (
    <div className="space-y-4 border-t border-border/50 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" disabled={disabled || !text.trim()} onClick={analyze}>
          <Icon name="fileText" className="h-4 w-4" />
          Extrair telefones e endereços
        </button>
        {parsed && (
          <span className="text-xs text-muted">
            {parsed.phones.length} telefone(s) · {parsed.addresses.length} endereço(s)
          </span>
        )}
      </div>

      {parsed && filtered && (
        <>
          <div className="flex flex-wrap gap-2">
            {(["todos", "cliente", "autor", "outros"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`rounded-[var(--radius-ui)] border px-3 py-1.5 text-xs transition-colors ${
                  filter === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
                onClick={() => setFilter(key)}
              >
                {key === "todos"
                  ? "Todos"
                  : CATEGORY_LABELS[key as DataCategory]}
                {key === "cliente" && ` (${parsed.summary.phonesCliente})`}
                {key === "autor" && ` (${parsed.summary.phonesAutor})`}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-[var(--radius-ui)] px-3 py-1.5 text-xs ${
                tab === "phones" ? "bg-primary/15 text-primary" : "text-muted"
              }`}
              onClick={() => setTab("phones")}
            >
              Telefones ({filtered.phones.length})
            </button>
            <button
              type="button"
              className={`rounded-[var(--radius-ui)] px-3 py-1.5 text-xs ${
                tab === "addresses" ? "bg-primary/15 text-primary" : "text-muted"
              }`}
              onClick={() => setTab("addresses")}
            >
              Endereços ({filtered.addresses.length})
            </button>
          </div>

          <ResultSection
            title={filter === "todos" ? "resultado" : CATEGORY_LABELS[filter as DataCategory]}
            items={filtered}
            type={tab}
            formValues={formValues}
            clientId={clientId}
            disabled={disabled}
            latestPhoneChecks={latestPhoneChecks}
            onApplyPhone={onApplyPhone}
            onApplyAddress={onApplyAddress}
            onPhoneCheckRecorded={onPhoneCheckRecorded}
          />
        </>
      )}
    </div>
  );
}

/** Página avulsa / sandbox — inclui textarea próprio */
export function ClientResearchTools({
  formValues,
  onApplyPhone,
  onApplyAddress,
  clientId,
  latestPhoneChecks,
  onPhoneCheckRecorded,
  disabled,
  initialText,
  onTextChange,
  compact,
}: {
  formValues: FormValues;
  onApplyPhone: (phoneKey: string, value: string) => void;
  onApplyAddress: (addressKey: string, value: string) => void;
  clientId?: string;
  latestPhoneChecks?: Partial<Record<string, PhoneCheckResult>>;
  onPhoneCheckRecorded?: () => void;
  disabled?: boolean;
  initialText?: string;
  onTextChange?: (text: string) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState(initialText ?? "");

  useEffect(() => {
    setText(initialText ?? "");
  }, [initialText]);

  return (
    <section className="industrial-panel space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
          Ferramentas de pesquisa
        </h3>
        <p className="mt-1 text-sm text-muted">
          Área de testes. No dia a dia, use o campo Pesquisa dentro de cada cliente.
        </p>
      </div>

      <textarea
        className={`industrial-input w-full resize-y font-mono text-sm ${compact ? "min-h-[140px]" : "min-h-[200px]"}`}
        placeholder="Cole aqui texto de consultas, processos, cadastros..."
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          onTextChange?.(e.target.value);
        }}
      />

      <ClientResearchParser
        text={text}
        formValues={formValues}
        onApplyPhone={onApplyPhone}
        onApplyAddress={onApplyAddress}
        clientId={clientId}
        latestPhoneChecks={latestPhoneChecks}
        onPhoneCheckRecorded={onPhoneCheckRecorded}
        disabled={disabled}
      />
    </section>
  );
}
