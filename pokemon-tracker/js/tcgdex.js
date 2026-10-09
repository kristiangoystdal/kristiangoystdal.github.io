// KB.tcgdex — thin client for the TCGdex API (https://tcgdex.dev), plus a free
// USD/EUR -> NOK rate lookup. Classic script, no deps. Pure in-memory caching
// only (a page-session Map) — nothing here touches localStorage.
(function () {
	"use strict";

	window.KB = window.KB || {};

	const API_BASE = "https://api.tcgdex.net/v2/en";
	const FX_URL = "https://api.frankfurter.dev/v1/latest";

	const searchCache = new Map(); // query -> brief card[]
	const detailCache = new Map(); // tcgId -> card detail object
	let usdNokRate; // undefined = not fetched yet, null = fetch failed
	let eurNokRate;

	// Combines the caller's AbortSignal (debounce/cancel) with an internal timeout.
	function fetchJSON(url, { signal, timeoutMs = 10000 } = {}) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		if (signal) {
			if (signal.aborted) controller.abort();
			else signal.addEventListener("abort", () => controller.abort());
		}
		return fetch(url, { signal: controller.signal }).then(
			(res) => {
				clearTimeout(timer);
				if (!res.ok) {
					const err = new Error(`HTTP ${res.status}`);
					err.status = res.status;
					throw err;
				}
				return res.json();
			},
			(err) => {
				clearTimeout(timer);
				throw err;
			},
		);
	}

	// GET /cards?name=<query>&category=Pokemon — returns a brief list (id, localId,
	// name, image?). No set/rarity/pricing — see getCardDetail for that.
	function searchCards(name, opts) {
		const key = name.trim().toLowerCase();
		if (searchCache.has(key)) return Promise.resolve(searchCache.get(key));
		const url = `${API_BASE}/cards?name=${encodeURIComponent(name)}&category=Pokemon`;
		return fetchJSON(url, opts).then((rows) => {
			searchCache.set(key, rows);
			return rows;
		});
	}

	// GET /cards/<id> — full detail: set, rarity, variants, pricing.
	function getCardDetail(id, opts) {
		if (detailCache.has(id)) return Promise.resolve(detailCache.get(id));
		return fetchJSON(`${API_BASE}/cards/${encodeURIComponent(id)}`, opts).then(
			(card) => {
				detailCache.set(id, card);
				return card;
			},
		);
	}

	function getUsdNokRate(opts) {
		if (usdNokRate !== undefined) return Promise.resolve(usdNokRate);
		return fetchJSON(`${FX_URL}?base=USD&symbols=NOK`, opts)
			.then((data) => {
				usdNokRate = (data && data.rates && data.rates.NOK) || null;
				return usdNokRate;
			})
			.catch(() => {
				usdNokRate = null;
				return null;
			});
	}
	function getEurNokRate(opts) {
		if (eurNokRate !== undefined) return Promise.resolve(eurNokRate);
		return fetchJSON(`${FX_URL}?base=EUR&symbols=NOK`, opts)
			.then((data) => {
				eurNokRate = (data && data.rates && data.rates.NOK) || null;
				return eurNokRate;
			})
			.catch(() => {
				eurNokRate = null;
				return null;
			});
	}

	// TCGdex's boolean variant flags <-> our Collectr-style variant labels <-> the
	// key used inside pricing.tcgplayer for that variant. Confirmed against real
	// API responses; "firstEdition"/"wPromo" are intentionally not mapped (rare,
	// and not part of our data model's variant vocabulary).
	const VARIANT_LABELS = { normal: "Normal", holo: "Holofoil", reverse: "Reverse Holofoil" };
	const TCGPLAYER_KEYS = { normal: "normal", holo: "holofoil", reverse: "reverse-holofoil" };

	// Returns [{ key, label, usd, eur }] for each variant that actually exists on
	// this card. usd/eur are null when that price source has nothing for it —
	// callers decide the NOK fallback chain (tcgplayer USD, then cardmarket EUR).
	function priceByVariant(card) {
		const variants = card.variants || {};
		const tcgplayer = card.pricing && card.pricing.tcgplayer;
		const cardmarket = card.pricing && card.pricing.cardmarket;
		const out = [];
		Object.keys(VARIANT_LABELS).forEach((flag) => {
			if (!variants[flag]) return;
			let usd = null;
			if (tcgplayer && tcgplayer[TCGPLAYER_KEYS[flag]]) {
				usd = tcgplayer[TCGPLAYER_KEYS[flag]].marketPrice ?? null;
			}
			let eur = null;
			if (cardmarket) {
				eur =
					flag === "holo"
						? cardmarket["trend-holo"] ?? cardmarket["avg-holo"] ?? null
						: cardmarket.trend ?? cardmarket.avg ?? null;
			}
			out.push({ key: flag, label: VARIANT_LABELS[flag], usd, eur });
		});
		return out;
	}

	// Runs fn(item, index) over items with at most `limit` in flight at once.
	// A single item's rejection becomes { error } in its slot, not a throw.
	function mapWithConcurrency(items, limit, fn) {
		const results = new Array(items.length);
		let next = 0;
		let active = 0;
		return new Promise((resolve) => {
			function pump() {
				if (next >= items.length && active === 0) {
					resolve(results);
					return;
				}
				while (active < limit && next < items.length) {
					const idx = next++;
					active++;
					fn(items[idx], idx)
						.then((r) => {
							results[idx] = r;
						})
						.catch((err) => {
							results[idx] = { error: err };
						})
						.then(() => {
							active--;
							pump();
						});
				}
			}
			pump();
		});
	}

	window.KB.tcgdex = {
		searchCards,
		getCardDetail,
		getUsdNokRate,
		getEurNokRate,
		priceByVariant,
		mapWithConcurrency,
		VARIANT_LABELS,
	};
})();
