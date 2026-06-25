import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { t, type MessageKey } from '@/lib/i18n/messages'
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences'
import type { Locale } from '@/types/i18n'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  translate: (key: MessageKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (!user) return 'en'
    const prefs = loadUserPreferences(user.uid)
    return prefs.general.language === 'hi' ? 'hi' : 'en'
  })

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      if (!user) return
      const prefs = loadUserPreferences(user.uid)
      saveUserPreferences(user.uid, {
        ...prefs,
        general: { ...prefs.general, language: next },
      })
    },
    [user],
  )

  useEffect(() => {
    if (!user) return
    const prefs = loadUserPreferences(user.uid)
    const next = prefs.general.language === 'hi' ? 'hi' : 'en'
    setLocaleState(next)
  }, [user])

  const translate = useCallback((key: MessageKey) => t(locale, key), [locale])

  const value = useMemo(
    () => ({ locale, setLocale, translate }),
    [locale, setLocale, translate],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    return {
      locale: 'en',
      setLocale: () => undefined,
      translate: (key) => t('en', key),
    }
  }
  return context
}
