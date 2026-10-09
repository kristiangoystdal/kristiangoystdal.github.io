# Kortbok — architecture notes

Static page, no build step. Classic `<script>` tags (not ES modules) sharing
`window.KB`, so it also works from `file://`.

- `index.html` — all CSS inline in `<head><style>`, markup for the four tabs
  (Oversikt, Samling, Salg, Import og data) and three `<dialog>` elements.
- `js/csv.js` → `KB.csv` — RFC 4180 parser (`parse`), locale-ish number
  parsing (`parseNumber`), Collectr export → card rows (`parseCollectrCSV`),
  and the reverse mapping for CSV export (`toCollectrCSV`).
- `js/app.js` → `KB.app` — state load/save/mutate, all rendering, tab
  switching, the sell dialog, sales log, import flow, backup/restore, and
  GitHub Gist sync. No separate store module — `mutate(fn)` /
  `replaceState(obj)` in `app.js` are the only two ways state changes, so the
  persistence backend can still be swapped later without touching rendering
  code.

## Data model

Stored as one JSON document in `localStorage["kortbok.v1"]`:

```
{
  cards: [{ id, pf, set, name, no, rarity, variant, cond, qty, cost, price, added }],
  sales: [{ id, date, title, platform, note, price, cost, items: [...] }],
  meta: { lastImport, lastBackup, priceDate }
}
```

- `id` = `[pf, set, name, no, variant, cond]` lower-cased, joined by `|`.
  Rarity and grade are intentionally excluded from the id.
- `cost`/`price` are per-card unit values; `cost` can be `null` (unknown).
- A sale's `items[]` is a full snapshot of each sold card at sale time (not a
  reference), so the sales log survives later re-imports or deletions of the
  current collection.
- Duplicate ids within one imported CSV are merged by summing `qty` and
  taking a quantity-weighted average of `cost`.

## Definitions

- Card profit = `(price - cost) * qty`, treating a `null` cost as 0.
- "Tjent så langt" (profit so far) = sum of `(price - cost)` over sales where
  `cost != null`. Sales with unknown cost count toward revenue but not
  profit; the UI reports how many were excluded.
- "Ikke realisert" (unrealized) = collection value − collection cost.

## Import semantics

Default import only adds cards whose `id` isn't already in `cards[]`.
Two checkboxes change that:
- "Oppdater pris" — also updates `price` on cards that already exist.
- "Ta også med solgte" — cards whose `id` appears in any `sales[].items` are
  normally skipped (so re-importing a stale export doesn't resurrect sold
  cards); this checkbox includes them as new again.

## GitHub Gist sync

Same pattern as `pokedex/index.html`: a personal access token (`gist`
scope) and a Gist id, both kept in `localStorage` (`kortbok-gh-token`,
`kortbok-gist-id`), sent directly to `api.github.com`. Push writes the whole
state as one JSON file in the Gist; pull overwrites local state after a
confirm dialog. This is optional — the page works fully offline via
`localStorage` alone.

## Backlog (one at a time, confirm before touching the `kortbok.v1` shape)

1. Manually edit a card's cost/value; add a single card without a CSV.
2. Overview chart of accumulated profit by sale date.
3. Store price history on each import and show what changed since the last
   one.

Ask before changing the `kortbok.v1` data model — write a migration if it's
needed.
