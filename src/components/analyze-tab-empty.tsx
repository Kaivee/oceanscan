"use client";

import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="grid place-items-center border border-dashed border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-6 py-24 text-center">
      <div>
        <span className="mx-auto flex h-11 w-11 items-center justify-center border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)]">
          {icon}
        </span>
        <h3 className="mt-3 font-mono text-sm font-bold text-[var(--color-ocean-text)]">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-[var(--color-ocean-muted)]">{body}</p>
        <button
          onClick={onCta}
          className="mt-4 inline-flex items-center justify-center border border-[#0E6BA8] bg-[#0E6BA8] px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[#0B5C8F]"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
