import { useEffect } from 'react'
import { hiderPathFor, useGame } from './store'
import { saveHiderPath } from './sync'

/** Runder eldre enn dette får ikke hiders punkter lagt til. */
const ATTACH_MS = 2 * 24 * 3600000

/** Legger hiders punkter til rundene i arkivet som mangler dem. Gjelder bare telefonen hider brukte. */
function attach() {
  const { archive, hiderPts, addHiderPath } = useGame.getState()
  if (!hiderPts.length) return
  const now = Date.now()
  for (const a of archive) {
    if (now - a.endedAt > ATTACH_MS) continue
    const pts = hiderPathFor(hiderPts, a.round, a.endedAt)
    if (pts.length <= (a.hiderPath?.length ?? 0)) continue
    addHiderPath(a.id, pts)
    if (a.room) void saveHiderPath(a.room, a.id, pts)
  }
}

/**
 * Hiders side av rundens video. Hider husker punktet sitt ved hvert svar (i `answerQuestion`)
 * og når endgame starter, og legger dem til runden i arkivet når den er over.
 */
export function useHiderPath() {
  useEffect(() => {
    attach()
    return useGame.subscribe((s, prev) => {
      if (s.round.endgame && !prev.round.endgame) s.markHider()
      if (s.archive !== prev.archive) attach()
    })
  }, [])
}
