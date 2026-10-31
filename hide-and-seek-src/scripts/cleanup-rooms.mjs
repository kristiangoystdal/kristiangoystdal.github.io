/**
 * Sletter rom og arkiv som ikke er brukt på 90 dager. Kjøres hver måned av GitHub Actions
 * (.github/workflows/cleanup.yml) med en Firebase-nøkkel i hemmeligheten FIREBASE_SERVICE_ACCOUNT.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...}' DRY_RUN=1 node scripts/cleanup-rooms.mjs   viser bare hva som ville blitt slettet
 */
import { cert, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

const DAYS = 90
const DATABASE_URL = 'https://jetlag-hide-and-seek-norway-default-rtdb.europe-west1.firebasedatabase.app'
const dry = !!process.env.DRY_RUN

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: DATABASE_URL })
const db = getDatabase()
const cutoff = Date.now() - DAYS * 86400000

const rooms = (await db.ref('rooms').get()).val() ?? {}
const archive = (await db.ref('archive').get()).val() ?? {}
const updates = {}
const kept = new Set()
for (const [code, r] of Object.entries(rooms)) {
  // Sist i bruk: merket appen setter, ellers når rommet ble laget.
  const last = r?.active ?? r?.created ?? 0
  if (last < cutoff) updates[`rooms/${code}`] = null
  else kept.add(code)
}
// Arkivet hører til rommet. Er rommet borte eller slettes nå, går arkivet med.
for (const code of Object.keys(archive)) if (!kept.has(code)) updates[`archive/${code}`] = null

const gone = Object.keys(updates)
console.log(`${Object.keys(rooms).length} rom, ${kept.size} i bruk siste ${DAYS} dager. Sletter ${gone.filter((k) => k.startsWith('rooms/')).length} rom og ${gone.filter((k) => k.startsWith('archive/')).length} arkiv.`)
if (dry) console.log('DRY_RUN: ingenting slettet.')
else if (gone.length) await db.ref().update(updates)
process.exit(0)
