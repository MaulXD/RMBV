export type ChecklistProgress = {
  total: number;
  done: number;
  percent: number;
};

const CHECKBOX_RE = /^- \[( |x|X)\]/;

export function parseChecklistProgress(description: string | null | undefined): ChecklistProgress {
  if (!description?.trim()) {
    return { total: 0, done: 0, percent: 0 };
  }

  let total = 0;
  let done = 0;

  for (const line of description.split(/\r?\n/)) {
    const match = line.trim().match(CHECKBOX_RE);
    if (!match) continue;
    total += 1;
    if (match[1]!.toLowerCase() === "x") done += 1;
  }

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}
