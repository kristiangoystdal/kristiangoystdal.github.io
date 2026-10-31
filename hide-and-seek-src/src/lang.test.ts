import { describe, expect, it } from 'vitest'
import { phoneLang, tr } from './lang'

describe('språket følger telefonen', () => {
  it('bokmål, nynorsk og «no» gir norsk', () => {
    expect(phoneLang(['nb-NO'])).toBe('nb')
    expect(phoneLang(['nn'])).toBe('nb')
    expect(phoneLang(['no'])).toBe('nb')
    expect(phoneLang(['NB-no'])).toBe('nb')
  })
  it('norsk et stykke ned i listen teller også', () => {
    expect(phoneLang(['en-US', 'nb-NO'])).toBe('nb')
  })
  it('alt annet gir engelsk, også svensk og dansk', () => {
    expect(phoneLang(['en-GB'])).toBe('en')
    expect(phoneLang(['sv-SE', 'da-DK'])).toBe('en')
    expect(phoneLang([])).toBe('en')
    expect(phoneLang(undefined)).toBe('en')
  })
  it('ord som bare ligner, gir ikke norsk', () => {
    expect(phoneLang(['nbx', 'node'])).toBe('en')
  })
  it('testene kjører på norsk', () => {
    expect(tr('ja', 'yes')).toBe('ja')
  })
})
