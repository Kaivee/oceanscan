"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, subtitle, icon, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-5 py-4">
          {icon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded border border-[var(--color-ocean-emerald)]/30 bg-[var(--color-ocean-emerald)]/10 text-[var(--color-ocean-emerald)]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-mono text-sm font-bold text-[var(--color-ocean-text)]">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-[var(--color-ocean-muted)] transition hover:bg-[var(--color-ocean-surface)] hover:text-[var(--color-ocean-red)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
