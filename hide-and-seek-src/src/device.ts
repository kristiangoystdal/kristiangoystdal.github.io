const DEVICE_KEY = 'hideandseek.device'

/** Telefonens egen nøkkel. Brukes under `seekers` i rommet og til å vite hvem som stilte et spørsmål. */
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) localStorage.setItem(DEVICE_KEY, (id = Math.random().toString(36).slice(2, 10)))
    return id
  } catch {
    return 'ukjent'
  }
}
