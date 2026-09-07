"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { ts, classLabel, fieldAction, priorityLabel, type Lang, type UiKey } from "./strings"

const STORAGE_KEY = "oceanscan.lang"
const DEFAULT_LANG: Lang = "en"

export type { Lang, UiKey } from "./strings"

export interface I18nCtxValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: UiKey, vars?: Record<string, string | number>) => string
  classLabel: (cls: string) => string
  fieldAction: (cls: string, priority: string) => string
  priorityLabel: (p: string) => string
}

const I18nCtx = createContext<I18nCtxValue | null>(null)

function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === "en" || v === "hi" ? v : null
  } catch {
    return null
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  useEffect(() => {
    const stored = readStoredLang()
    // One-time hydration of the persisted language from localStorage (external
    // system). English stays the server-rendered default to avoid a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {}
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nCtxValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => ts(lang, key, vars),
      classLabel: (cls) => classLabel(lang, cls),
      fieldAction: (cls, priority) => fieldAction(lang, cls, priority),
      priorityLabel: (p) => priorityLabel(lang, p),
    }),
    [lang],
  )

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useI18n(): I18nCtxValue {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider")
  return ctx
}