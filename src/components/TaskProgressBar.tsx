import type { ChecklistProgress } from "@/lib/task-checklist";

export function TaskProgressBar({
  checklist,
  showLabel = true,
}: {
  checklist: ChecklistProgress;
  showLabel?: boolean;
}) {
  if (checklist.total === 0) return null;

  return (
    <div className="mt-2">
      {showLabel && (
        <p className="mb-1 text-[10px] text-muted">
          Checklist {checklist.done}/{checklist.total}
        </p>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${checklist.percent}%` }}
        />
      </div>
    </div>
  );
}
