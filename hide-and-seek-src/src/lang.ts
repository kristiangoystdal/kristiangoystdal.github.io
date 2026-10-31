/**
 * Språket i appen: norsk (nb) eller engelsk (en). Følger telefonen til brukeren velger selv.
 * Tekstene står side om side i koden med `tr('norsk', 'english')`. Bytte av språk laster
 * siden på nytt, så alt (også tekster som regnes ut én gang) kommer på det nye språket.
 * Regelboken (Rules.tsx) er bare på norsk foreløpig.
 */
export type Lang = 'nb' | 'en'

const KEY = 'hs-lang'

/** Det brukeren har valgt selv, eller null når språket følger telefonen. */
export function chosenLang(): Lang | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'nb' || v === 'en' ? v : null
  } catch {
    return null
  }
}

/** Telefonens språk: norsk (bokmål, nynorsk eller bare «no») gir norsk, alt annet engelsk. */
export function phoneLang(langs: readonly string[] | undefined): Lang {
  return (langs ?? []).some((l) => /^(nb|nn|no)\b/i.test(l)) ? 'nb' : 'en'
}

function detect(): Lang {
  // Testene sjekker de norske tekstene, uansett maskinens språk.
  if (import.meta.env?.MODE === 'test') return 'nb'
  if (typeof navigator === 'undefined') return 'nb'
  return chosenLang() ?? phoneLang(navigator.languages?.length ? navigator.languages : [navigator.language])
}

export const LANG: Lang = detect()
export const isEn = LANG === 'en'

/** Teksten på språket som er valgt. */
export const tr = <T,>(nb: T, en: T): T => (isEn ? en : nb)

/** Bytter språk (null = følg telefonen) og laster appen på nytt. */
export function setLang(lang: Lang | null) {
  try {
    if (lang) localStorage.setItem(KEY, lang)
    else localStorage.removeItem(KEY)
  } catch {
    // Uten lagring varer valget bare til siden lastes på nytt, og det skjer nå. Da følger den telefonen.
  }
  location.reload()
}

if (typeof document !== 'undefined') document.documentElement.lang = LANG === 'en' ? 'en' : 'nb'

/** Språkkoden til datoer og klokkeslett. Britisk engelsk gir 24-timersklokke, som i Norge. */
export const LOCALE = isEn ? 'en-GB' : 'nb-NO'
