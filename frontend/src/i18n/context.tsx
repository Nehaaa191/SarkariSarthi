import { createContext, useContext, useState, type ReactNode } from 'react';
import { en, hi } from './strings';

export type Lang = 'en' | 'hi';
export type Strings = typeof en;

interface I18nContextValue {
  lang: Lang;
  t: Strings;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: en,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const t = lang === 'en' ? en : hi;
  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
