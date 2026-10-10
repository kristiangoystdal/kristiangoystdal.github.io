# Kortbok — architecture notes

Static page, no build step. Classic `<script>` tags (not ES modules) sharing
`window.KB`, so it also works from `file://`.

- `index.html` — all CSS inline in `<head><style>`, markup for the four tabs
  (Oversikt, Samling, Salg, Import og data) and five `<dialog>` elements.
- `js/csv.js` → `KB.csv` — RFC 4180 parser (`parse`), locale-ish number
  parsing (`parseNumber`), Collectr export → card rows (`parseCollectrCSV`),
  the reverse mapping for CSV export (`toCollectrCSV`), and the id builder
  (`buildId`) shared by CSV import and the manual/TCGdex add flows.
- `js/tcgdex.js` → `KB.tcgdex` — fetch wrapper for `api.tcgdex.net` (search,
  card detail) and `api.frankfurter.dev` (USD/EUR → NOK), plus
  `priceByVariant`/`mapWithConcurrency` helpers. Purely in-memory `Map`
  caching for the lifetime of the page — nothing here touches
  `localStorage`, and no polling/background refresh of any kind.
- `js/app.js` → `KB.app` — state load/save/mutate, all rendering, tab
  switching, the sell dialog, manual card add/edit, the TCGdex search-and-add
  dialog, sales log, import flow, backup/restore, and GitHub Gist sync. No
  separate store module — `mutate(fn)` / `replaceState(obj)` in `app.js` are
  the only two ways state changes, so the persistence backend can still be
  swapped later without touching rendering code.

## Data model

Stored as one JSON document in `localStorage["kortbok.v1"]`:

```
{
  cards: [{ id, pf, set, name, no, rarity, variant, cond, qty, price, added }],
  sales: [{ id, date, title, platform, note, price, shipping, items: [...] }],
  meta: { lastImport, lastBackup, priceDate },
  priceHistory: [{ date, prices: { [cardId]: price } }],
}
```

**No cost tracking.** Kortbok deliberately has no concept of purchase cost
anywhere — not on a card, not on a sale, not on a sale item. Every "how am I
doing" figure (Oversikt's "Fortjeneste", the profit chart, a sale's line in
the Salg log, a row in "Nytt salg") is market-price-based: *sold price minus
market price*, never *sold price minus what I paid*. This was a deliberate
removal of an earlier cost-tracking feature (manual cost field, bulk
"Sett kostpris", a CSV cost-override on import, `mergeCardInto` averaging
cost on merge) — don't re-add a `cost` field without being asked; it was cut
on purpose, not an oversight. `sale.shipping` survived the cut as a purely
informational field (shown as "frakt X kr" in the Salg list) since it was
never part of the market-based profit formula to begin with.

`priceHistory` is a top-level array, one entry per CSV import, each a full
snapshot of every row's price in that file (keyed by `id`, not just cards
kept in `cards[]`). Capped to the last `PRICE_HISTORY_LIMIT` (12) entries,
oldest dropped first. Re-importing the same "Market Price (As of ...)" date
twice overwrites that entry instead of appending a duplicate. Missing on
restored backups older than this feature — `state.priceHistory || []` is
used everywhere it's read, so that's not a crash, just "no comparison
available yet".

`sale.shipping` (NOK, optional — no UI control for it anymore; carried through
unmodified when editing a sale that already has one) and each sale item's
`soldPrice`/`fromCollection`/`removeFromCollection` (see below) are additive
fields from the "Nytt salg"
feature — absent on sales created before it, which still render and undo
correctly (see Import semantics / Nytt salg sections).

- `id` = `[pf, set, name, no, variant, cond]` lower-cased, joined by `|`.
  Rarity and grade are intentionally excluded from the id.
- `price` is a per-card unit value — the market-price snapshot, same field
  CSV import, TCGdex add, and manual add/edit all write.
- A sale's `items[]` is a full snapshot of each sold card at sale time (not a
  reference), so the sales log survives later re-imports or deletions of the
  current collection.
- Duplicate ids within one imported CSV are merged by summing `qty`. The
  same merge rule (`mergeCardInto` in `app.js`) applies when editing a card
  into an id that already exists, or adding a card (manually or via TCGdex)
  whose id matches one already in `cards[]`.
- `cardSoftKey(c)` = `name|no|variant` lower-cased — "the same physical card"
  regardless of set spelling or portfolio. Used for TCGdex duplicate
  detection (so a card added by hand isn't re-added under a different set
  name) and for CSV import matching (a CSV row is "already have it" if it
  matches an existing card by `id` *or* by this soft key).

## Definitions

- `saleMarketRevenue(s)` = sum of `(item.price || 0) * item.qty` over a
  sale's items — what the items would have fetched at their market-price
  snapshot. 0 for a manual no-card sale (nothing to compute from).
- `saleOverMarket(s)` = `s.price - saleMarketRevenue(s)` when the sale has
  items, else 0 — "Fortjeneste" everywhere means this, and only this. There
  is no cost-based alternative definition anywhere in the app.
- Oversikt's "Fortjeneste" stat = sum of `saleOverMarket(s)` over sold
  (non-draft) sales.
- "Fortjeneste over tid" chart = running total of `saleOverMarket(s)`,
  grouped by sale date, sold sales with at least one item only (a manual
  no-card sale has no market price to compare against, so it's excluded,
  not counted as zero).
- Per sale item (Nytt salg): line sum = `soldPrice * qty`; line fortjeneste
  = `(soldPrice - price) * qty` — "price" is the one-time market-price
  snapshot (same field CSV import, TCGdex add, and manual add/edit all
  write); multiplier = `soldPrice / price` (null if `price` is 0 or null).

## Import semantics

Default import only adds cards whose `id` isn't already in `cards[]`.

**Existing cards (`toSyncExisting` in `computeImportPreview`): `qty` and
`pf` are always resynced to the CSV, unconditionally** — Collectr is the
source of truth for how many of a card you actually own and which
portfolio it's filed under, so re-importing after buying more (or fewer,
e.g. a correction) of a card, or moving it to a different portfolio in
Collectr, updates the stored `qty`/`pf` to match, with no checkbox gating
it. `price` is separate and still opt-in via "Oppdater pris". A card can
match as "existing" by `id` (pf included) or by `cardSoftKey` alone (pf
excluded) — the latter is exactly the case where the CSV's `pf` can differ
from what's stored, which is what the sync is for. Changing `pf` changes
`id` (`buildId` includes it), so this goes through `movePortfolio(s, card,
newPf)` — the same helper "Flytt portefølje" uses — which merges into
another card already occupying the resulting id (via `mergeCardInto`)
rather than creating a duplicate-id row. Checkboxes:
- "Oppdater pris" — also updates `price` on cards that already exist (qty
  syncs either way, see above).
- "Ta også med solgte" — cards whose `id` appears in any `sales[].items` are
  normally skipped (so re-importing a stale export doesn't resurrect sold
  cards); this checkbox includes them as new again.
- "Legg ... som egen rad" — cards that already exist are pushed as a brand
  new, separate `cards[]` entry instead of having their qty/pf/price synced
  (lets you track a second purchase batch of the same card as its own row,
  rather than it being merged into the existing one via `mergeCardInto`).
  Takes priority over qty/pf/price sync for the rows it matches. Since `id` is
  relied on as a unique key everywhere (edit/sell/select all do
  `cards.find(c => c.id === x)`), the new row's id is disambiguated with a
  `#2`, `#3`, ... suffix at import time (`computeImportPreview`/the
  `importBtn` handler in `app.js`) when it would otherwise collide.

**Rebuying a card you'd fully sold before.** A card id that only appears in
`sales[].items` (fully sold, no longer in `cards[]`) is normally skipped
entirely on reimport, "Ta også med solgte" notwithstanding — that checkbox
is for genuinely wanting stale/sold inventory back, not the common case.
Instead, `isRebuyAfterSale`/`latestSaleDateById` compare the CSV row's
"Date Added" against the *latest* sale date recorded for that id: if the
row was added to Collectr strictly after that sale, it's treated as a
legitimate new copy and goes through the normal `toAdd` path (counted in
"nye kort legges til", with a note on how many were rebuys) regardless of
the checkbox. A row with no comparable date, or dated at/before the sale,
still falls back to the old skip-unless-checked behavior.

The Collectr CSV's "Average Cost Paid" column is still a required header
(`REQUIRED_HEADERS` in `csv.js`, since that's the real Collectr export
format, not Kortbok's choice) but its value is read and discarded —
`parseCollectrCSV` never puts a `cost` field on a row.

**Price history.** Every successful import pushes a `priceHistory` snapshot
(see Data model) of the *file's* prices, independent of the checkboxes
above — even a row skipped as "already have it" or "solgt tidligere" is
still recorded, since this is about market-price trend, not collection
membership. Before that push, the live preview (`renderImportPreview`) diffs
`lastParsed.rows` against the previous snapshot (`computePriceChanges`) and
shows how many prices went up/down/unchanged since that date, plus the 5
biggest movers — so the comparison is always "new file vs. last import",
never against the current `cards[].price` (which "Oppdater pris" may or may
not have touched).

## TCGdex search-and-add ("Legg til kort")

`openFindCardDialog`/`initFindCardDialog` in `app.js`. Flow: debounced
(300 ms) search against `KB.tcgdex.searchCards` with an `AbortController`
per keystroke (10 s internal timeout) → brief results (id/name/image only)
→ full detail (`getCardDetail`) fetched 4-at-a-time for the visible page to
backfill set/number/rarity in the list → selecting one fetches its detail
plus both currency rates and shows price per existing variant.

Price source chain, confirmed against real API responses (not the originally
assumed shape): `pricing.tcgplayer` is `null` or `{unit, updated, normal?,
holofoil?, "reverse-holofoil"?}`, each with `marketPrice` in USD; when absent,
fall back to `pricing.cardmarket` (EUR, `trend`/`avg`, `-holo` suffixed for
holo) — see `priceByVariant` in `tcgdex.js`. Whichever source has a value is
converted to NOK via the matching currency rate; if the rate fetch failed,
the raw price is shown but the NOK field is left blank for the user to fill
in. **The price is a one-time snapshot** — stored on the card like any
manually-typed price, never revisited. No background refresh, no polling, no
"live price": this was deliberately cut from an earlier draft of the
feature.

Duplicate handling: before adding, the dialog checks `cardSoftKey` against
existing cards. If any match, "Legg til i samlingen" is replaced by "Øk
antall" (adds the entered qty to the first matching card, nothing else
changes) and "Legg til som egen rad" (pushes a new card row regardless,
still going through the same id-merge rule as everything else). If search,
detail lookup, or both currency fetches fail, "Legg til manuelt i stedet"
closes this dialog and opens the existing manual `#cardDialog` with the typed
name carried over.

CSV import rows are never touched by this feature or its pricing — a card's
`price` only changes via CSV import's "Oppdater pris" checkbox, manual edit,
or at creation time here.

## Nytt salg ("Salg" tab)

`openNewSaleDialog`/`initNewSaleDialog` in `app.js`. A third, independent
entry point into creating a sale — the simpler "Selg" (from Samling) and
"Legg til salg uten kort" flows are unchanged. This one supports a single
sale mixing cards already in the collection with cards that are *not* (and
never get added to it).

One search box drives two parallel, independently rendered result lists:
`searchCollectionForSale` (synchronous substring match over `state.cards`)
and `KB.tcgdex.searchCards` (same debounce/abort pattern as the TCGdex
add-card dialog, `splitNameAndNumber` doing the same trailing-number-token
split). Both can show a match for the same physical card — the user always
picks which "Legg til" to click, nothing is auto-deduped between the two
groups.

Each added card becomes a draft row (`newSaleItems`, dialog-local, not
persisted until submit) with independently editable `qty`, `price` (the
market-price snapshot — fetched once from TCGdex for API-sourced rows,
copied from the card for collection-sourced rows) and `soldPrice` (always
blank until typed or distributed). A collection-sourced row also carries
`fromCollection: true` and a `removeFromCollection` checkbox (default off);
an API-sourced row is `fromCollection: false` and is never written into
`cards[]`, regardless of that checkbox.

"Fordel total" (`distributeSaleTotal`) splits one entered target number
across every row's `soldPrice` proportionally to `price * qty` (falling back
to an even split per unit if no row has a market price), then nudges the
last row by the rounding remainder so the allocated sum ties out to the
cent. The diff line (`updateNewSaleSummary`) compares the live sum of
`soldPrice * qty` against that same target number on every edit, so manual
tweaks after distributing stay visible until they match again.

On submit, `sale.price` is *computed* from the rows (sum of `soldPrice*qty`)
— unlike the older "Selg" dialog, where the total is what the user types.
Collection quantities are only touched for rows where
`fromCollection && removeFromCollection`, in one `mutate()` alongside pushing
the sale.

Editing (`openNewSaleDialog(saleId)`, from "Rediger" in the Salg list) works
for any sale with `items.length > 0`, including ones from the older "Selg"
flow — those get `fromCollection`/`removeFromCollection` defaulted to `true`
(matching their actual original behavior) and a one-time `soldPrice`
estimate from distributing the sale's stored total by market-value share.
Saving an edit restores the *old* sale's collection effects first, then
reapplies the *new* ones, in the same `mutate()` call as replacing the sale
record — so toggling "Fjern fra samling" during an edit correctly adjusts
stock either direction. `undoSale` mirrors this: it only restores a card for
items where `fromCollection !== false && removeFromCollection !== false`
(true for old-style items, since both flags are `undefined` there), so it
never wrongly "restores" a card that was never removed, or recreates a
TCGdex-only card into the collection. A sale with `items.length === 0`
(manual, no-card) is edited through the existing `#manualSaleDialog`
instead (`openManualSaleDialog(saleId)`), which gained the same optional
edit-in-place mode.

### Draft vs. sold

`sale.status` is `"draft"` or `"sold"`; missing (all pre-existing sales)
counts as sold — see `isSoldSale(s)`. For the "packing cards up before the
sale is confirmed" workflow: "Nytt salg" has both "Merk som solgt" (submit)
and "Lagre som kladd" (`saveNewSale(status)` shared by both). Drafts are
excluded from `salesTotals()` and Oversikt's "5 siste salg" (nothing is
counted as revenue/profit/cardsSold until confirmed), and the Salg list
shows one with a "Kladd" chip, an "Eksporter JSON" button
(`exportDraftJSON`, downloads just that one sale), and a "Merk som
solgt"/"Merk som kladd" toggle.

**Collection removal is tied to "sold", not to saving.** `removeSaleStock(s,
sale)` / `restoreSaleStock(s, sale)` are the only two places stock changes
for a sale — called by: saving with `status === "sold"` (removes),
re-editing a sale that *was* sold (restores the old items first, same
`mutate()` as applying the new ones), `undoSale` (restores, only if
`isSoldSale`), and the toggle button (removes going draft→sold, restores
going sold→draft). Saving or editing a draft never touches `cards[]` — a
packed-but-unconfirmed sale leaves the card right where it is. `restoreSaleStock`
treats missing `fromCollection`/`removeFromCollection` as `true` (pre-existing
sales); `removeSaleStock` requires both explicitly truthy.

## GitHub Gist sync

Same pattern as `pokedex/index.html`: a personal access token (`gist`
scope) and a Gist id, both kept in `localStorage` (`kortbok-gh-token`,
`kortbok-gist-id`), sent directly to `api.github.com`. Push writes the whole
state as one JSON file in the Gist; pull overwrites local state after a
confirm dialog. This is optional — the page works fully offline via
`localStorage` alone.

**Autosave.** The manual push button and autosave both funnel through one
`pushToGist(token, gistId, {silent})` (`app.js`) — `silent` only changes the
status-line wording ("Autolagret" vs. "Lastet opp"), not the request. An
"Autolagre til Gist ved endringer" checkbox (`#autoSyncChk`, persisted as
`kortbok-gist-autosync` = `"1"`/`"0"`) gates `scheduleAutoGistPush()`, called
at the end of every `mutate()`. It debounces (`AUTO_GIST_DELAY_MS`, 2.5s) so
a burst of edits is one PATCH, not one per keystroke, and does nothing
unless both the checkbox is on *and* a Gist id already exists —
**autosave never creates a new Gist**, only a manual "Last opp til Gist"
click does (so turning the checkbox on with no prior push just shows an
inline reminder to push once first, rather than silently minting a Gist).
`replaceState()` (restoring a JSON backup, pulling from Gist) does **not**
trigger autosave — only `mutate()` does, since those are bulk replacements,
not incremental edits, and a Gist pull immediately autosaving back to the
same Gist would be a pointless round-trip.

**Conflict check (last-write-wins guard).** `kortbok-gist-updated-at`
(`localStorage`) stores `{gistId, updatedAt}` from the Gist's `updated_at`
field as of our last successful push or pull — `getStoredGistUpdatedAt`/
`setStoredGistUpdatedAt` in `app.js`. Before a PATCH, `pushToGist` fetches
the Gist and compares its current `updated_at` against that stored value
(only when one exists for this `gistId` — a push to a Gist we've never
synced with from this browser skips the check and just establishes the
baseline). A mismatch means another device/tab pushed since we last synced
here: autosave skips the PATCH and reports it via `setSyncStatus` rather
than overwriting; a manual push asks for confirmation via `confirmDialog`
first. This only protects pushes — it doesn't merge, so the loser of a real
race still has to pull and redo their change.

## Backlog (one at a time, confirm before touching the `kortbok.v1` shape)

1. ~~Manually edit a card's cost/value; add a single card without a CSV.~~ Done
   (manual edit/add dialog, plus TCGdex search-and-add).
2. ~~A sale covering cards outside the collection, with its own search and
   per-card pricing.~~ Done ("Nytt salg").
3. ~~Overview chart of accumulated profit by sale date.~~ Done
   ("Fortjeneste over tid", inline SVG, `buildProfitSeries`/`renderProfitChart`
   in `app.js`).
4. ~~Sell straight from a Samling selection using the full Nytt salg flow.~~
   Done (`openNewSaleDialogWithCards`). The bulk "Sett kostpris" action this
   item originally shipped with was later removed in its entirety — see
   item 10.
5. ~~Store price history on each import and show what changed since the last
   one.~~ Done — see the "Price history" paragraph under Import semantics
   and the `priceHistory` field under Data model.
6. ~~Bulk-move several selected Samling cards to a different portfolio at
   once.~~ Done ("Flytt portefølje", `bulkMoveDialog`/`bulkMoveForm` in
   `app.js`). Since `pf` is part of `id` (`buildId`), moving recomputes each
   card's `id`; if that collides with another card already in the target
   portfolio, the two are merged via `mergeCardInto` (sums `qty`) instead of
   ending up as two rows with the same id.
7. ~~Delete a card from the collection outright, not just via a sale.~~ Done
   — a per-row "Slett" button and a selection-bar "Slett valgte" button, both
   behind `confirmDialog` since there's no undo. This only removes the
   `cards[]` entry; it never touches `sales[]` (a sale's `items[]` is already
   an independent snapshot, so past sales are unaffected either way).
8. ~~Show each card's portfolio in the Samling table; search the Salg log by
   card name.~~ Done — Samling's table gained a plain "Portefølje" column
   (`c.pf`, between name/set and card number). Salg gained a search input
   (`#saleSearchInput`/`filteredSales` in `app.js`) that matches a sale's
   `items[].name`, falling back to `title`/`note` so cardless manual sales
   stay searchable too.
9. ~~A second Oversikt chart for pure sales value (turnover), separate from
   the profit chart.~~ Done ("Omsetning over tid",
   `buildRevenueSeries`/`renderRevenueChart` in `app.js`, same cumulative-
   by-sale-date shape as the profit chart). Unlike the profit chart, this
   sums every sold sale's `price` regardless of whether `cost` is known —
   there's no cost-based filtering to apply to a plain revenue figure, so
   manual no-card sales count here too.
10. ~~Remove cost tracking entirely — only market-price-based fortjeneste
    matters.~~ Done, as a deliberate hard removal (explicitly requested, not
    just hidden behind a flag): the `cost` field is gone from `cards[]` and
    `sales[].items[]`; the manual card dialog, the TCGdex add dialog, and
    "Nytt salg" all lost their cost input; the bulk "Sett kostpris" action
    (button + dialog) and "Velg uten kostpris" are gone; the CSV import
    "Kostpris for alle" override is gone (the Collectr file's "Average Cost
    Paid" column is still parsed since the format requires it, but the
    value is discarded); `mergeCardInto` now only sums `qty`, no more
    weighted cost averaging. Every profit figure (Oversikt's "Fortjeneste"
    stat, "Fortjeneste over tid", a sale's line in the Salg list, a row in
    "Nytt salg") was repointed at `saleOverMarket`/the per-row
    `(soldPrice - price) * qty` equivalent — see Definitions. The old
    cost-based "Tjent så langt"/"Kort igjen: Kost, Ikke realisert"/"Brukt
    vs. tjent" Oversikt stats are gone outright, not merged into anything.
    See the "No cost tracking" note under Data model before ever
    considering adding a cost field back.
11. ~~Autosave to Gist on every change, not just on manual "Last opp".~~
    Done — see the "Autosave" paragraph under GitHub Gist sync. Opt-in via
    a checkbox; off by default, and only ever updates a Gist that already
    exists (never creates one on its own).
12. ~~CSV import: always resync `qty` (and `pf`) for cards already in the
    collection (it previously only ever touched `price`, and never caught a
    portfolio move made in Collectr); and let a rebought copy of a
    fully-sold card back in automatically by comparing dates, instead of
    requiring "Ta også med solgte".~~ Done — see the two new paragraphs
    under Import semantics ("Existing cards" / "Rebuying a card you'd fully
    sold before"), and the shared `movePortfolio` helper under Data model's
    neighboring code (used by both this and "Flytt portefølje").

**Note:** the original single-total "Selg" dialog (`#sellDialog`,
`openSellDialog`/`initSellDialog`) has been removed — Samling's "Selg" and
"Selg valgte" have opened "Nytt salg" instead since that feature shipped,
and nothing referenced the old dialog any more.

Ask before changing the `kortbok.v1` data model — write a migration if it's
needed.
