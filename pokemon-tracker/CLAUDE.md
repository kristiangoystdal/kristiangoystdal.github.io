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
  cards: [{ id, pf, set, name, no, rarity, variant, cond, qty, cost, price, added }],
  sales: [{ id, date, title, platform, note, price, cost, shipping, items: [...] }],
  meta: { lastImport, lastBackup, priceDate }
}
```

`sale.shipping` (NOK, optional) and each sale item's `soldPrice`/`fromCollection`/
`removeFromCollection` (see below) are additive fields from the "Nytt salg"
feature — absent on sales created before it, which still render and undo
correctly (see Import semantics / Nytt salg sections).

- `id` = `[pf, set, name, no, variant, cond]` lower-cased, joined by `|`.
  Rarity and grade are intentionally excluded from the id.
- `cost`/`price` are per-card unit values; `cost` can be `null` (unknown).
- A sale's `items[]` is a full snapshot of each sold card at sale time (not a
  reference), so the sales log survives later re-imports or deletions of the
  current collection.
- Duplicate ids within one imported CSV are merged by summing `qty` and
  taking a quantity-weighted average of `cost`. The same merge rule
  (`mergeCardInto` in `app.js`) applies when editing a card into an id that
  already exists, or adding a card (manually or via TCGdex) whose id matches
  one already in `cards[]`.
- `cardSoftKey(c)` = `name|no|variant` lower-cased — "the same physical card"
  regardless of set spelling or portfolio. Used for TCGdex duplicate
  detection (so a card added by hand isn't re-added under a different set
  name) and for CSV import matching (a CSV row is "already have it" if it
  matches an existing card by `id` *or* by this soft key).

## Definitions

- Card profit = `(price - cost) * qty`, treating a `null` cost as 0.
- "Tjent så langt" (profit so far) = sum of `(price - cost - (shipping||0))`
  over sales where `cost != null`. Sales with unknown cost count toward
  revenue but not profit; the UI reports how many were excluded.
- "Ikke realisert" (unrealized) = collection value − collection cost.
- "Brukt vs. tjent" (Oversikt) = sum of `cost` over sales with known cost,
  vs. sum of `price` (revenue) over *all* sales — a coarser, always-available
  comparison than the shipping-aware profit above.
- Per sale item (Nytt salg): line sum = `soldPrice * qty`; line profit =
  `(soldPrice - cost) * qty` (null if `cost` is null); multiplier = `soldPrice
  / price` (null if `price` is 0 or null) — "price" here means the one-time
  market-price snapshot, same field CSV import and TCGdex add already use,
  not a separate field.

## Import semantics

Default import only adds cards whose `id` isn't already in `cards[]`.
Two checkboxes change that:
- "Oppdater pris" — also updates `price` on cards that already exist.
- "Ta også med solgte" — cards whose `id` appears in any `sales[].items` are
  normally skipped (so re-importing a stale export doesn't resurrect sold
  cards); this checkbox includes them as new again.

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
persisted until submit) with independently editable `qty`, `cost`,
`price` (the market-price snapshot — fetched once from TCGdex for
API-sourced rows, copied from the card for collection-sourced rows) and
`soldPrice` (always blank until typed or distributed). A collection-sourced
row also carries `fromCollection: true` and a `removeFromCollection`
checkbox (default off); an API-sourced row is `fromCollection: false` and is
never written into `cards[]`, regardless of that checkbox.

"Fordel total" (`distributeSaleTotal`) splits one entered target number
across every row's `soldPrice` proportionally to `price * qty` (falling back
to an even split per unit if no row has a market price), then nudges the
last row by the rounding remainder so the allocated sum ties out to the
cent. The diff line (`updateNewSaleSummary`) compares the live sum of
`soldPrice * qty` against that same target number on every edit, so manual
tweaks after distributing stay visible until they match again.

On submit, `sale.price`/`sale.cost` are *computed* from the rows (sum of
`soldPrice*qty`, and sum of `cost*qty` unless any row's cost is unknown) —
unlike the older "Selg" dialog, where the total is what the user types.
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
and "Lagre som kladd" (`saveNewSale(status)` shared by both) — either one
still applies `removeFromCollection` the same way, since packing a card
physically sets it aside regardless of whether payment is confirmed yet. A
draft only differs in that `salesTotals()` and Oversikt's "5 siste salg"
skip it entirely (revenue/profit/cardsSold aren't counted until confirmed),
and the Salg list shows it with a "Kladd" chip and a "Merk som
solgt"/"Merk som kladd" toggle button (flips `status` only, no stock
change — the stock effect already happened, or didn't, at save time).
`undoSale`/`deleteSaleFromLog` work the same on drafts as on sold sales.

## GitHub Gist sync

Same pattern as `pokedex/index.html`: a personal access token (`gist`
scope) and a Gist id, both kept in `localStorage` (`kortbok-gh-token`,
`kortbok-gist-id`), sent directly to `api.github.com`. Push writes the whole
state as one JSON file in the Gist; pull overwrites local state after a
confirm dialog. This is optional — the page works fully offline via
`localStorage` alone.

## Backlog (one at a time, confirm before touching the `kortbok.v1` shape)

1. ~~Manually edit a card's cost/value; add a single card without a CSV.~~ Done
   (manual edit/add dialog, plus TCGdex search-and-add).
2. ~~A sale covering cards outside the collection, with its own search and
   per-card pricing.~~ Done ("Nytt salg").
3. Overview chart of accumulated profit by sale date.
4. Store price history on each import and show what changed since the last
   one.

Ask before changing the `kortbok.v1` data model — write a migration if it's
needed.
