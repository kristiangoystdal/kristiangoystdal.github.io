import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { restoreAfterReload } from './demo'
import '@fontsource-variable/overpass'
import '@fontsource/overpass-mono/500.css'
import './index.css'
import { installTestMode } from './testmode'

registerSW({ immediate: true })
// Falsk GPS for demoen. Uten demo sendes alt videre til telefonens GPS.
installTestMode()
// Ble siden lastet på nytt midt i demoen, kommer det ekte spillet tilbake.
restoreAfterReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
