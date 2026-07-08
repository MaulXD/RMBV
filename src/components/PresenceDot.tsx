"use client";

type Props = {
  userId: string;
  onlineIds: Set<string>;
  size?: "sm" | "md";
};

export function PresenceDot({ userId, onlineIds, size = "sm" }: Props) {
  const online = onlineIds.has(userId);
  const dim = size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";
  const border = size === "md" ? "ring-2" : "ring-[1.5px]";
  return (
    <span
      className={`inline-block rounded-full ${dim} ${border} ring-[var(--card)] shrink-0
        ${online ? "bg-emerald-500" : "bg-[var(--border)]"}`}
      title={online ? "Online" : "Offline"}
    />
  );
}
