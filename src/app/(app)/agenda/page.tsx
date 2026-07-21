"use client";

import { PageHeader } from "@/components/PageHeader";
import { CalendarView } from "@/components/CalendarView";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        icon="calendar"
        title="Agenda"
        subtitle="Eventos e compromissos da equipe"
      />
      <CalendarView />
    </>
  );
}
