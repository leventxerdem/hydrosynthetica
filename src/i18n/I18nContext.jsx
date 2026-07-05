import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { getTranslation } from './translations.js'

const STORAGE_KEY = 'hydrosynthetica.lang'
const I18nContext = createContext(null)

function detectDefaultLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return saved
  } catch (e) {
    /* ignore */
  }
  const nav = (navigator.language || 'en').toLowerCase()
  return nav.startsWith('tr') ? 'tr' : 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectDefaultLang)

  const setLang = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch (e) {
      /* ignore */
    }
  }, [])

  const t = useCallback((path) => getTranslation(lang, path), [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
