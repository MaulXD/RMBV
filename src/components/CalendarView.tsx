"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  color?: string | null;
  clientId?: string | null;
  client?: { id: string; name: string } | null;
  createdBy: { name: string };
  createdById: string;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" },
  { value: "red", label: "Vermelho" },
  { value: "amber", label: "Âmbar" },
  { value: "violet", label: "Roxo" },
];

function getEventBg(color?: string | null): string {
  switch (color) {
    case "green":
      return "bg-green-500";
    case "red":
      return "bg-red-500";
    case "amber":
      return "bg-amber-500";
    case "violet":
      return "bg-violet-500";
    default:
      return "bg-blue-500";
  }
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const emptyForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  allDay: false,
  color: "blue",
  clientId: "",
};

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0, 23, 59, 59);
      const res = await fetch(
        `/api/agenda?from=${from.toISOString()}&to=${to.toISOString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents((data.events as CalendarEvent[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function prevMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function openCreateModal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const startsAt = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T08:00`;
    setEditEvent(null);
    setForm({ ...emptyForm, startsAt });
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(evt: CalendarEvent) {
    setEditEvent(evt);
    setForm({
      title: evt.title,
      description: evt.description ?? "",
      startsAt: toDatetimeLocal(evt.startsAt),
      endsAt: evt.endsAt ? toDatetimeLocal(evt.endsAt) : "",
      allDay: evt.allDay,
      color: evt.color ?? "blue",
      clientId: evt.clientId ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      setFormError("Título é obrigatório");
      return;
    }
    if (!form.startsAt) {
      setFormError("Data de início é obrigatória");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        allDay: form.allDay,
        color: form.color || null,
        clientId: form.clientId.trim() || null,
      };

      const res = editEvent
        ? await fetch(`/api/agenda/${editEvent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/agenda", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) {
        setFormError((data as { error?: string }).error ?? "Erro ao salvar evento");
        return;
      }

      setModalOpen(false);
      void loadEvents();
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!editEvent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agenda/${editEvent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setFormError((data as { error?: string }).error ?? "Erro ao excluir evento");
        return;
      }
      setModalOpen(false);
      void loadEvents();
    } finally {
      setSaving(false);
    }
  }

  // Build calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  const trailing = 7 - (cells.length % 7);
  if (trailing < 7) {
    for (let d = 1; d <= trailing; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
    }
  }

  const today = new Date();

  function getEventsForDay(date: Date): CalendarEvent[] {
    return events.filter((e) => isSameDay(new Date(e.startsAt), date));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="panel-solid flex items-center justify-between px-4 py-3">
        <button
          type="button"
          className="btn-ghost p-2"
          onClick={prevMonth}
          title="Mês anterior"
        >
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-foreground">
            {MONTHS[month]} {year}
          </span>
          {loading && (
            <span className="text-xs text-muted">carregando...</span>
          )}
        </div>
        <button
          type="button"
          className="btn-ghost p-2"
          onClick={nextMonth}
          title="Próximo mês"
        >
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="panel-solid overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map(({ date, isCurrentMonth }, idx) => {
            const dayEvents = getEventsForDay(date);
            const isToday = isSameDay(date, today);
            const totalRows = cells.length / 7;
            const rowIndex = Math.floor(idx / 7);
            const isLastRow = rowIndex === totalRows - 1;
            const isLastCol = (idx + 1) % 7 === 0;

            return (
              <div
                key={idx}
                className={[
                  "relative cursor-pointer border-border p-1.5 transition-colors hover:bg-surface-elevated",
                  !isLastRow ? "border-b" : "",
                  !isLastCol ? "border-r" : "",
                  !isCurrentMonth ? "opacity-40" : "",
                ].join(" ")}
                style={{ minHeight: 80 }}
                onClick={() => {
                  if (isCurrentMonth) openCreateModal(date);
                }}
              >
                <div className="mb-1">
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      className={[
                        "w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white",
                        getEventBg(evt.color),
                      ].join(" ")}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(evt);
                      }}
                      title={evt.title}
                    >
                      {evt.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="pl-1 text-[10px] text-muted">
                      +{dayEvents.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setModalOpen(false)}
          />
          <div className="panel-solid relative z-10 w-full max-w-md rounded-xl p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                {editEvent ? "Editar evento" : "Novo evento"}
              </h2>
              <button
                type="button"
                className="btn-ghost p-1"
                onClick={() => setModalOpen(false)}
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Título *</label>
                <input
                  className="industrial-input w-full"
                  placeholder="Título do evento"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">Descrição</label>
                <textarea
                  className="industrial-input w-full resize-none"
                  rows={2}
                  placeholder="Descrição opcional"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Início *</label>
                  <input
                    type="datetime-local"
                    className="industrial-input w-full"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startsAt: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Fim</label>
                  <input
                    type="datetime-local"
                    className="industrial-input w-full"
                    value={form.endsAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endsAt: e.target.value }))
                    }
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, allDay: e.target.checked }))
                  }
                />
                Dia inteiro
              </label>

              <div>
                <label className="mb-1 block text-xs text-muted">Cor</label>
                <select
                  className="industrial-input w-full"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                >
                  {COLOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted">
                  ID do cliente (opcional)
                </label>
                <input
                  className="industrial-input w-full"
                  placeholder="UUID do cliente"
                  value={form.clientId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientId: e.target.value }))
                  }
                />
              </div>

              {formError && (
                <p className="text-xs text-red-500">{formError}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                {editEvent && (
                  <button
                    type="button"
                    className="btn-ghost text-red-500 hover:bg-red-500/10"
                    disabled={saving}
                    onClick={() => void deleteEvent()}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    Excluir
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void saveEvent()}
                >
                  {saving ? "Salvando..." : editEvent ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
