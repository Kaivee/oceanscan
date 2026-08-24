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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101c30]/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b-2 border-[#22385c]/20 bg-[#efe6cf]/50 px-5 py-4">
          {icon ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#22385c] text-[#22385c]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-base font-bold text-[#1b2a4a]">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8574]">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-[#6b5d3f] transition hover:bg-[#efe6cf] hover:text-[#b03a2e]"
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
