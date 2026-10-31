import { useState } from 'react'
import { useDemo } from './demo'
import { LOCALE, tr } from './lang'
import { QuestionPicker } from './Panels'
import { changeText, isEmpty, onlyDifferent, proposalText, waitingFor } from './proposal'
import { deviceId } from './device'
import { useGame } from './store'
import { useSync } from './sync'
import { Section } from './ui'

const CLOCK = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

/**
 * Under Verktøy: foreslå ny sone, gjemmetid eller nye spørsmål midt i runden. I et rom må den
 * andre siden si ja. På én telefon er begge sider til stede, så endringen gjøres etter en bekreftelse.
 */
export function ChangeRules() {
  const settings = useGame((s) => s.settings)
  const hidingMinutes = useGame((s) => s.round.hidingMinutes)
  const replay = useDemo((s) => s.kind === 'showcase')
  if (replay) return null
  // Formen starter på nytt fra det som gjelder når reglene er endret.
  return <ChangeForm key={`${settings.zoneRadius}:${hidingMinutes}:${JSON.stringify(settings.questions ?? null)}`} />
}

function ChangeForm() {
  const settings = useGame((s) => s.settings)
  const round = useGame((s) => s.round)
  const mode = useGame((s) => s.mode)
  const pending = useGame((s) => !!s.proposal)
  const room = useSync((s) => s.room)
  const [zone, setZone] = useState(settings.zoneRadius)
  const [hiding, setHiding] = useState(round.hidingMinutes)
  const [questions, setQuestions] = useState(settings.questions ?? null)
  const change = onlyDifferent({ zoneRadius: zone, hidingMinutes: hiding, questions }, settings, round)
  const seeking = round.seekFrom !== null && Date.now() >= round.seekFrom

  const send = () => {
    const g = useGame.getState()
    if (room) return g.propose(change, mode)
    const ask = tr(`Er begge sider enige om å endre reglene? ${proposalText(change)}. Kartet regnes ut på nytt.`, `Do both sides agree to change the rules? ${proposalText(change)}. The map is worked out again.`)
    if (confirm(ask)) g.changeNow(change)
  }

  return (
    <Section title={tr('Endre reglene', 'Change the rules')}>
      <details className="card" data-guide="change-rules">
        <summary className="cursor-pointer text-sm font-medium">{tr('Sone, gjemmetid og spørsmål', 'Zone, hiding time and questions')}</summary>
        <p className="mt-2 mb-3 text-xs text-muted">
          {tr(
            'Kan endres midt i runden hvis hider og seekerne er enige. Sone og spørsmål gjelder hele loggen, så kartet regnes ut på nytt fra første spørsmål.',
            'Can be changed mid-round if the hider and the seekers agree. Zone and questions apply to the whole log, so the map is worked out again from the first question.',
          )}
        </p>
        <label className="mb-3 block">
          <span className="label">
            {tr('Sone', 'Zone')}: {zone} m{zone !== settings.zoneRadius && <span className="text-muted"> ({tr('nå', 'now')} {settings.zoneRadius} m)</span>}
          </span>
          <input className="w-full accent-accent" type="range" min={250} max={1000} step={50} value={zone} aria-label={tr('Ny sone i meter', 'New zone in meters')} onChange={(e) => setZone(+e.target.value)} />
        </label>
        <label className="mb-3 block">
          <span className="label">{tr('Gjemmetid (min)', 'Hiding time (min)')}</span>
          <input className="field" type="number" min={1} inputMode="numeric" value={hiding} aria-label={tr('Ny gjemmetid i minutter', 'New hiding time in minutes')} onChange={(e) => setHiding(Math.max(1, +e.target.value || 1))} />
          <span className="mt-1 block text-xs text-muted">
            {seeking
              ? tr('Letingen har startet, så ny gjemmetid gjelder bare Move resten av runden.', 'The seeking has started, so a new hiding time only applies to Move for the rest of the round.')
              : tr('Letingen starter tidligere eller senere like mye som gjemmetiden endres.', 'The seeking starts earlier or later by as much as the hiding time changes.')}
          </span>
        </label>
        <div className="mb-3">
          <span className="label">{tr('Spørsmål', 'Questions')}</span>
          <QuestionPicker size={settings.size} value={questions} onChange={setQuestions} />
        </div>
        {pending ? (
          <p className="text-sm text-muted">{tr('Et forslag venter på svar. Det må besvares før et nytt kan foreslås.', 'A proposal is waiting for an answer. It must be answered before a new one can be made.')}</p>
        ) : (
          <>
            <button className="btn btn-primary w-full" disabled={isEmpty(change)} onClick={send}>
              {room ? tr('Foreslå endringen', 'Propose the change') : tr('Endre nå', 'Change now')}
            </button>
            <p className="mt-1 text-xs text-muted">
              {isEmpty(change)
                ? tr('Endre noe over først.', 'Change something above first.')
                : room
                  ? tr(`${mode === 'hider' ? 'Seekerne' : 'Hider'} må si ja før det gjelder: ${proposalText(change)}.`, `${mode === 'hider' ? 'The seekers' : 'The hider'} must agree before it applies: ${proposalText(change)}.`)
                  : proposalText(change)}
            </p>
          </>
        )}
      </details>
    </Section>
  )
}

/** Øverst på spillskjermen mens et forslag venter: godta eller avslå, eller vent på den andre siden. */
export function ProposalBanner() {
  const proposal = useGame((s) => s.proposal)
  const mode = useGame((s) => s.mode)
  const answer = useGame((s) => s.answerProposal)
  if (!proposal) return null
  const mine = !!proposal.ok[mode]
  const waiting = waitingFor(proposal)
  return (
    <div className="mb-4 rounded-[12px] border border-accent p-3 text-sm" role="status" data-guide="proposal">
      <b className="block font-sign">{tr('Forslag om å endre reglene', 'Proposal to change the rules')}</b>
      <span className="block">{proposalText(proposal.change)}.</span>
      {mine ? (
        <>
          <span className="mt-1 block text-xs text-muted">
            {waiting === 'hider' ? tr('Venter på at hider sier ja.', 'Waiting for the hider to agree.') : tr('Venter på at en seeker sier ja.', 'Waiting for a seeker to agree.')}
          </span>
          {proposal.by === deviceId() && (
            <button className="btn mt-2 w-full" onClick={() => answer(false, mode)}>
              {tr('Trekk tilbake', 'Withdraw')}
            </button>
          )}
        </>
      ) : (
        <>
          <span className="mt-1 block text-xs text-muted">
            {tr('Sier du ja, gjelder det med en gang, og kartet regnes ut på nytt.', 'If you agree, it applies right away, and the map is worked out again.')}
          </span>
          <div className="mt-2 flex gap-1.5">
            <button className="btn btn-primary flex-1" onClick={() => answer(true, mode)}>
              {tr('Godta', 'Accept')}
            </button>
            <button className="btn flex-1" onClick={() => answer(false, mode)}>
              {tr('Avslå', 'Decline')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Endringene som er gjort i runden, så alle ser hvorfor kartet ser annerledes ut. */
export function ChangesNotice() {
  const changes = useGame((s) => s.round.changes)
  if (!changes?.length) return null
  return (
    <div className="mb-4 rounded-lg border border-border bg-panel-2 p-3 text-xs">
      {changes.map((c) => (
        <p key={c.at}>
          <b>{tr(`Reglene ble endret kl. ${CLOCK.format(c.at)}:`, `Rules changed at ${CLOCK.format(c.at)}:`)}</b> {changeText(c)}.
        </p>
      ))}
    </div>
  )
}
