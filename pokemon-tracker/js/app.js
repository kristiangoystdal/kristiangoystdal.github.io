// KB.app — Kortbok application logic. Classic script, depends on KB.csv (js/csv.js).
// All persistence goes through mutate()/replaceState() so storage can be swapped later.
(function () {
	"use strict";

	window.KB = window.KB || {};

	const STORAGE_KEY = "kortbok.v1";
	const TOKEN_KEY = "kortbok-gh-token";
	const GIST_ID_KEY = "kortbok-gist-id";
	const GIST_FILENAME = "kortbok-data.json";
	const PLATFORMS = ["Finn", "Vipps / lokalt", "Cardmarket", "Annet"];

	let storageOk = true;
	let state = loadState();
	let selectedIds = new Set();
	let collectionPageSize = 100;
	let lastParsed = null; // { rows, meta } from the last CSV picked for import
	let sellContext = null; // array of card ids currently in the sell dialog
	let editingCardId = null; // card id being edited in the card dialog, or null when adding

	// TCGdex "Legg til kort" search dialog state.
	let findResults = []; // brief search results for the current query
	let findShowCount = 30;
	let findLoadedDetailIds = new Set(); // tcgIds whose detail (set/rarity) is loaded or loading
	let findSearchController = null; // AbortController for the in-flight search
	let findDebounceTimer = null;
	let findSelectedDetail = null; // full TCGdex detail for the chosen card
	let findLastQuery = null; // { name, no } of the last search, for retry

	// ---------- storage ----------

	function defaultState() {
		return {
			cards: [],
			sales: [],
			meta: { lastImport: null, lastBackup: null, priceDate: null },
		};
	}

	function isValidState(obj) {
		return (
			obj &&
			typeof obj === "object" &&
			Array.isArray(obj.cards) &&
			Array.isArray(obj.sales)
		);
	}

	function loadState() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return defaultState();
			const parsed = JSON.parse(raw);
			if (!isValidState(parsed)) return defaultState();
			parsed.meta = parsed.meta || {};
			parsed.meta.lastImport = parsed.meta.lastImport || null;
			parsed.meta.lastBackup = parsed.meta.lastBackup || null;
			parsed.meta.priceDate = parsed.meta.priceDate || null;
			return parsed;
		} catch (err) {
			console.error("Kortbok: could not load state", err);
			return defaultState();
		}
	}

	function saveState() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			storageOk = true;
		} catch (err) {
			console.error("Kortbok: could not save state", err);
			storageOk = false;
			showWarning(
				"Kunne ikke lagre i denne nettleseren. Endringene dine kan gå tapt ved reload.",
			);
		}
	}

	function mutate(fn) {
		fn(state);
		saveState();
		renderAll();
	}

	function replaceState(obj) {
		state = obj;
		saveState();
		selectedIds = new Set();
		renderAll();
	}

	function uid() {
		return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	}

	// ---------- helpers ----------

	// Identifies "the same physical card" regardless of set naming or portfolio —
	// used for TCGdex duplicate detection and for import matching cards that were
	// added manually (whose set name may not match the CSV's spelling of it).
	function cardSoftKey(c) {
		return `${c.name}|${c.no}|${c.variant}`.toLowerCase();
	}

	function escapeHTML(str) {
		return String(str).replace(
			/[&<>"']/g,
			(c) =>
				({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
					c
				],
		);
	}

	const fmtInt = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
	const fmt2 = new Intl.NumberFormat("nb-NO", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	const dateFmt = new Intl.DateTimeFormat("nb-NO", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	function fmtMoney0(n) {
		return `${fmtInt.format(Math.round(n || 0))} kr`;
	}
	function fmtMoney2(n) {
		return `${fmt2.format(n || 0)} kr`;
	}
	function fmtDate(d) {
		if (!d) return "–";
		const dt = new Date(d);
		if (isNaN(dt.getTime())) return "–";
		return dateFmt.format(dt);
	}
	function todayLocalISO() {
		const d = new Date();
		const tz = d.getTimezoneOffset() * 60000;
		return new Date(d.getTime() - tz).toISOString().slice(0, 10);
	}
	function gainClass(n) {
		return n > 0 ? "gain" : n < 0 ? "loss" : "";
	}

	function showWarning(msg) {
		const el = document.getElementById("warningBanner");
		el.textContent = msg;
		el.classList.remove("hidden");
	}
	function clearWarning() {
		document.getElementById("warningBanner").classList.add("hidden");
	}

	// ---------- derived data ----------

	function cardValue(c) {
		return (c.price || 0) * c.qty;
	}
	function cardCost(c) {
		return (c.cost || 0) * c.qty;
	}
	function cardProfit(c) {
		return cardValue(c) - cardCost(c);
	}

	function collectionTotals() {
		let value = 0,
			cost = 0,
			qty = 0;
		state.cards.forEach((c) => {
			value += cardValue(c);
			cost += cardCost(c);
			qty += c.qty;
		});
		return { value, cost, unrealized: value - cost, qty };
	}

	function salesTotals() {
		let revenue = 0,
			profit = 0,
			excluded = 0;
		state.sales.forEach((s) => {
			revenue += s.price || 0;
			if (s.cost != null) profit += s.price - s.cost;
			else excluded++;
		});
		return { revenue, profit, excluded, count: state.sales.length };
	}

	function portfolioBreakdown() {
		const map = new Map();
		state.cards.forEach((c) => {
			map.set(c.pf, (map.get(c.pf) || 0) + cardValue(c));
		});
		return [...map.entries()].sort((a, b) => b[1] - a[1]);
	}

	// ---------- tabs ----------

	function initTabs() {
		document.querySelectorAll(".tab-btn").forEach((btn) => {
			btn.addEventListener("click", () => switchTab(btn.dataset.tab));
		});
	}
	function switchTab(tab) {
		document
			.querySelectorAll(".tab-btn")
			.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
		document
			.querySelectorAll(".view")
			.forEach((v) => v.classList.toggle("active", v.id === `view-${tab}`));
	}

	// ---------- render: Oversikt ----------

	function renderOversikt() {
		const hasData = state.cards.length > 0 || state.sales.length > 0;
		document.getElementById("emptyState").classList.toggle("hidden", hasData);
		document
			.getElementById("oversiktContent")
			.classList.toggle("hidden", !hasData);
		if (!hasData) return;

		const st = salesTotals();
		const ct = collectionTotals();

		const profitEl = document.getElementById("statProfit");
		profitEl.textContent = fmtMoney0(st.profit);
		profitEl.className = `stat-value ${gainClass(st.profit)}`;
		document.getElementById("statProfitNote").textContent = st.excluded
			? `${st.excluded} salg uten kjent kost er ikke med i fortjenesten.`
			: "Alle salg har kjent kost.";

		document.getElementById("statRevenue").textContent = fmtMoney0(st.revenue);
		document.getElementById("statSalesCount").textContent = String(st.count);
		document.getElementById("statCardsLeft").textContent = String(ct.qty);

		document.getElementById("statValue").textContent = fmtMoney0(ct.value);
		document.getElementById("statCost").textContent = fmtMoney0(ct.cost);
		const unrealEl = document.getElementById("statUnrealized");
		unrealEl.textContent = fmtMoney0(ct.unrealized);
		unrealEl.className = `stat-value-sm ${gainClass(ct.unrealized)}`;
		document.getElementById("statPriceDate").textContent = state.meta.priceDate
			? fmtDate(state.meta.priceDate)
			: "–";

		const breakdown = portfolioBreakdown();
		const maxVal = Math.max(1, ...breakdown.map((b) => b[1]));
		document.getElementById("portfolioBars").innerHTML = breakdown
			.map(
				([pf, val]) => `
			<div class="pf-bar-row">
				<span class="pf-bar-label">${escapeHTML(pf || "Uten navn")}</span>
				<div class="pf-bar-track"><div class="pf-bar-fill" style="width:${(val / maxVal) * 100}%"></div></div>
				<span class="pf-bar-value">${fmtMoney0(val)}</span>
			</div>`,
			)
			.join("");

		const top = [...state.cards]
			.sort((a, b) => cardValue(b) - cardValue(a))
			.slice(0, 8);
		document.getElementById("topCards").innerHTML = top
			.map(
				(c) => `
			<div class="mini-card">
				<div class="mini-card-name">${escapeHTML(c.name)}</div>
				<div class="mini-card-sub">${escapeHTML(c.set)} · #${escapeHTML(c.no)}</div>
				<div class="mini-card-value">${fmtMoney0(cardValue(c))}</div>
			</div>`,
			)
			.join("");

		const recent = [...state.sales]
			.sort((a, b) => new Date(b.date) - new Date(a.date))
			.slice(0, 5);
		document.getElementById("recentSales").innerHTML = recent.length
			? recent
					.map(
						(s) => `
			<div class="mini-sale">
				<span class="mini-sale-title">${escapeHTML(s.title)}</span>
				<span class="mini-sale-date">${fmtDate(s.date)}</span>
				<span class="mini-sale-price">${fmtMoney0(s.price)}</span>
			</div>`,
					)
					.join("")
			: `<p class="muted">Ingen salg registrert.</p>`;
	}

	// ---------- render: Samling ----------

	function populateFilterOptions() {
		const pfSel = document.getElementById("filterPortfolio");
		const varSel = document.getElementById("filterVariant");
		const pfs = [...new Set(state.cards.map((c) => c.pf))].sort();
		const vars = [...new Set(state.cards.map((c) => c.variant))].sort();
		const keepPf = pfSel.value;
		const keepVar = varSel.value;
		pfSel.innerHTML =
			`<option value="">Alle porteføljer</option>` +
			pfs.map((pf) => `<option value="${escapeHTML(pf)}">${escapeHTML(pf)}</option>`).join("");
		varSel.innerHTML =
			`<option value="">Alle varianter</option>` +
			vars.map((v) => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
		if (pfs.includes(keepPf)) pfSel.value = keepPf;
		if (vars.includes(keepVar)) varSel.value = keepVar;
	}

	function filteredSortedCards() {
		const q = document.getElementById("searchInput").value.trim().toLowerCase();
		const pf = document.getElementById("filterPortfolio").value;
		const variant = document.getElementById("filterVariant").value;
		const sort = document.getElementById("sortSelect").value;

		let list = state.cards.filter((c) => {
			if (pf && c.pf !== pf) return false;
			if (variant && c.variant !== variant) return false;
			if (
				q &&
				!(
					c.name.toLowerCase().includes(q) ||
					c.set.toLowerCase().includes(q) ||
					c.no.toLowerCase().includes(q) ||
					(c.rarity || "").toLowerCase().includes(q)
				)
			)
				return false;
			return true;
		});

		const sorters = {
			nyeste: (a, b) => new Date(b.added) - new Date(a.added),
			eldste: (a, b) => new Date(a.added) - new Date(b.added),
			verdi: (a, b) => cardValue(b) - cardValue(a),
			profitt: (a, b) => cardProfit(b) - cardProfit(a),
			tap: (a, b) => cardProfit(a) - cardProfit(b),
			navn: (a, b) => a.name.localeCompare(b.name, "nb"),
		};
		list.sort(sorters[sort] || sorters.nyeste);
		return list;
	}

	function variantChipHTML(variant) {
		const isHolo = /holo/i.test(variant || "");
		return `<span class="chip ${isHolo ? "chip-holo" : ""}">${escapeHTML(variant || "–")}</span>`;
	}

	function renderSamling() {
		populateFilterOptions();
		const list = filteredSortedCards();
		const visible = list.slice(0, collectionPageSize);

		document.getElementById("collectionSummary").textContent = list.length
			? `${list.length} kort · verdi ${fmtMoney0(list.reduce((s, c) => s + cardValue(c), 0))}`
			: "Ingen kort matcher filtrene.";

		const body = document.getElementById("collectionBody");
		body.innerHTML = visible
			.map((c) => {
				const profit = cardProfit(c);
				return `
			<tr data-id="${escapeHTML(c.id)}">
				<td><input type="checkbox" class="row-chk" data-id="${escapeHTML(c.id)}" ${selectedIds.has(c.id) ? "checked" : ""}></td>
				<td>
					<div class="cell-name">${escapeHTML(c.name)}</div>
					<div class="cell-sub">${escapeHTML(c.set)}</div>
				</td>
				<td class="mono">${escapeHTML(c.no)}</td>
				<td>${variantChipHTML(c.variant)}</td>
				<td class="mono num">${c.qty}</td>
				<td class="mono num">${c.cost == null ? "–" : fmtMoney2(c.cost)}</td>
				<td class="mono num">${fmtMoney2(cardValue(c))}</td>
				<td class="mono num ${gainClass(profit)}">${fmtMoney2(profit)}</td>
				<td class="mono">${fmtDate(c.added)}</td>
				<td><button type="button" class="btn-sm edit-row-btn" data-id="${escapeHTML(c.id)}">Rediger</button></td>
				<td><button type="button" class="btn-sm sell-row-btn" data-id="${escapeHTML(c.id)}">Selg</button></td>
			</tr>`;
			})
			.join("");

		document.getElementById("showMoreBtn").classList.toggle(
			"hidden",
			list.length <= visible.length,
		);

		const headChk = document.getElementById("selectAllChk");
		const visibleIds = visible.map((c) => c.id);
		headChk.checked =
			visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

		updateSelectionBar();
	}

	function updateSelectionBar() {
		const bar = document.getElementById("selectionBar");
		if (selectedIds.size === 0) {
			bar.classList.add("hidden");
			return;
		}
		bar.classList.remove("hidden");
		const cards = state.cards.filter((c) => selectedIds.has(c.id));
		const value = cards.reduce((s, c) => s + cardValue(c), 0);
		document.getElementById("selectionSummary").textContent =
			`${cards.length} valgt · ${fmtMoney0(value)}`;
	}

	function initSamlingEvents() {
		["searchInput", "filterPortfolio", "filterVariant", "sortSelect"].forEach(
			(id) => {
				const el = document.getElementById(id);
				el.addEventListener("input", () => {
					collectionPageSize = 100;
					renderSamling();
				});
				el.addEventListener("change", () => {
					collectionPageSize = 100;
					renderSamling();
				});
			},
		);

		document.getElementById("showMoreBtn").addEventListener("click", () => {
			collectionPageSize += 100;
			renderSamling();
		});

		document.getElementById("selectAllChk").addEventListener("change", (e) => {
			const visible = filteredSortedCards().slice(0, collectionPageSize);
			visible.forEach((c) => {
				if (e.target.checked) selectedIds.add(c.id);
				else selectedIds.delete(c.id);
			});
			renderSamling();
		});

		document.getElementById("collectionBody").addEventListener("click", (e) => {
			const sellBtn = e.target.closest(".sell-row-btn");
			if (sellBtn) {
				openSellDialog([sellBtn.dataset.id]);
				return;
			}
			const editBtn = e.target.closest(".edit-row-btn");
			if (editBtn) {
				openCardDialog(editBtn.dataset.id);
				return;
			}
			const chk = e.target.closest(".row-chk");
			if (chk) {
				if (chk.checked) selectedIds.add(chk.dataset.id);
				else selectedIds.delete(chk.dataset.id);
				updateSelectionBar();
				const headChk = document.getElementById("selectAllChk");
				const visibleIds = filteredSortedCards()
					.slice(0, collectionPageSize)
					.map((c) => c.id);
				headChk.checked =
					visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
			}
		});

		document.getElementById("sellSelectedBtn").addEventListener("click", () => {
			openSellDialog([...selectedIds]);
		});
	}

	// ---------- Selg-dialog ----------

	function openSellDialog(ids) {
		const cards = state.cards.filter((c) => ids.includes(c.id));
		if (!cards.length) return;
		sellContext = cards.map((c) => c.id);

		const list = document.getElementById("sellItemsList");
		list.innerHTML = cards
			.map(
				(c) => `
			<div class="sell-item" data-id="${escapeHTML(c.id)}">
				<div class="sell-item-name">${escapeHTML(c.name)} <span class="muted">${escapeHTML(c.set)} · #${escapeHTML(c.no)}</span></div>
				<label class="sell-item-qty">
					Antall
					<input type="number" class="sell-qty-input" min="1" max="${c.qty}" value="${c.qty}" data-id="${escapeHTML(c.id)}">
					<span class="muted">av ${c.qty}</span>
				</label>
			</div>`,
			)
			.join("");

		document.getElementById("sellDate").value = todayLocalISO();
		document.getElementById("sellPlatform").value = PLATFORMS[0];
		document.getElementById("sellNote").value = "";
		document.getElementById("sellError").textContent = "";
		recalcSellTotal(cards);

		list.querySelectorAll(".sell-qty-input").forEach((inp) => {
			inp.addEventListener("input", () => recalcSellDialog());
		});
		document.getElementById("sellTotalPrice").addEventListener(
			"input",
			updateSellComputed,
			{ once: false },
		);

		document.getElementById("sellDialog").showModal();
	}

	function currentSellQtys() {
		const qtys = {};
		document.querySelectorAll(".sell-qty-input").forEach((inp) => {
			qtys[inp.dataset.id] = Math.max(
				1,
				Math.min(parseInt(inp.value, 10) || 1, parseInt(inp.max, 10)),
			);
		});
		return qtys;
	}

	function recalcSellTotal(cards) {
		const total = cards.reduce((s, c) => s + c.price * c.qty, 0);
		document.getElementById("sellTotalPrice").value = total.toFixed(2);
		updateSellComputed();
	}

	function recalcSellDialog() {
		updateSellComputed();
	}

	function updateSellComputed() {
		if (!sellContext) return;
		const cards = state.cards.filter((c) => sellContext.includes(c.id));
		const qtys = currentSellQtys();
		let cost = 0;
		let value = 0;
		let anyUnknownCost = false;
		cards.forEach((c) => {
			const qty = qtys[c.id] || 0;
			value += c.price * qty;
			if (c.cost == null) anyUnknownCost = true;
			else cost += c.cost * qty;
		});
		const totalInput = parseFloat(
			document.getElementById("sellTotalPrice").value.replace(",", "."),
		);
		const total = isNaN(totalInput) ? 0 : totalInput;
		document.getElementById("sellComputedCost").textContent = anyUnknownCost
			? "ukjent"
			: fmtMoney2(cost);
		document.getElementById("sellComputedValue").textContent = fmtMoney2(value);
		const profitEl = document.getElementById("sellComputedProfit");
		if (anyUnknownCost) {
			profitEl.textContent = "kost ukjent";
			profitEl.className = "";
		} else {
			const profit = total - cost;
			profitEl.textContent = fmtMoney2(profit);
			profitEl.className = gainClass(profit);
		}
	}

	function saleTitle(items) {
		if (items.length === 1) return items[0].name;
		const totalQty = items.reduce((s, i) => s + i.qty, 0);
		const names = items.map((i) => i.name);
		const shown = names.slice(0, 3).join(", ");
		return `${totalQty} kort: ${shown}${names.length > 3 ? " …" : ""}`;
	}

	function initSellDialog() {
		document.getElementById("sellCancelBtn").addEventListener("click", () => {
			document.getElementById("sellDialog").close();
		});

		document
			.getElementById("sellDialogForm")
			.addEventListener("submit", (e) => {
				e.preventDefault();
				const cards = state.cards.filter((c) => sellContext.includes(c.id));
				const qtys = currentSellQtys();
				const totalInput = parseFloat(
					document.getElementById("sellTotalPrice").value.replace(",", "."),
				);
				if (isNaN(totalInput) || totalInput < 0) {
					document.getElementById("sellError").textContent =
						"Oppgi en gyldig totalpris.";
					return;
				}
				const date = document.getElementById("sellDate").value || todayLocalISO();
				const platform = document.getElementById("sellPlatform").value;
				const note = document.getElementById("sellNote").value.trim();

				const items = cards.map((c) => ({
					id: c.id,
					pf: c.pf,
					set: c.set,
					name: c.name,
					no: c.no,
					rarity: c.rarity,
					variant: c.variant,
					cond: c.cond,
					added: c.added,
					qty: qtys[c.id],
					cost: c.cost,
					price: c.price,
				}));
				const anyUnknown = items.some((i) => i.cost == null);
				const cost = anyUnknown
					? null
					: items.reduce((s, i) => s + i.cost * i.qty, 0);

				const sale = {
					id: uid(),
					date,
					title: saleTitle(items),
					platform,
					note,
					price: totalInput,
					cost,
					items,
				};

				mutate((s) => {
					items.forEach((item) => {
						const card = s.cards.find((c) => c.id === item.id);
						if (!card) return;
						card.qty -= item.qty;
						if (card.qty <= 0) {
							s.cards = s.cards.filter((c) => c.id !== item.id);
						}
					});
					s.sales.push(sale);
				});

				selectedIds.clear();
				document.getElementById("sellDialog").close();
			});
	}

	// ---------- Legg til / rediger kort ----------

	function openCardDialog(cardId) {
		editingCardId = cardId || null;
		const card = editingCardId
			? state.cards.find((c) => c.id === editingCardId)
			: null;

		document.getElementById("cardDialogTitle").textContent = card
			? "Rediger kort"
			: "Legg til kort";
		document.getElementById("cardName").value = card ? card.name : "";
		document.getElementById("cardSet").value = card ? card.set : "";
		document.getElementById("cardNo").value = card ? card.no : "";
		document.getElementById("cardRarity").value = card ? card.rarity || "" : "";
		document.getElementById("cardVariant").value = card ? card.variant : "";
		document.getElementById("cardCond").value = card ? card.cond : "";
		document.getElementById("cardPf").value = card ? card.pf : "Main";
		document.getElementById("cardQty").value = card ? card.qty : 1;
		document.getElementById("cardCost").value =
			card && card.cost != null ? card.cost : "";
		document.getElementById("cardPrice").value = card ? card.price : "";
		document.getElementById("cardAdded").value = card ? card.added : todayLocalISO();
		document.getElementById("cardError").textContent = "";
		document.getElementById("cardDialog").showModal();
	}

	// Sums qty and takes a quantity-weighted average of cost, same rule as CSV import merges.
	function mergeCardInto(target, extra) {
		const totalQty = target.qty + extra.qty;
		const targetCost = target.cost == null ? 0 : target.cost;
		const extraCost = extra.cost == null ? 0 : extra.cost;
		target.cost =
			target.cost == null && extra.cost == null
				? null
				: (targetCost * target.qty + extraCost * extra.qty) / totalQty;
		target.qty = totalQty;
		target.price = extra.price;
	}

	function initCardDialog() {
		document.getElementById("cardCancelBtn").addEventListener("click", () => {
			document.getElementById("cardDialog").close();
		});

		document.getElementById("cardDialogForm").addEventListener("submit", (e) => {
			e.preventDefault();
			const name = document.getElementById("cardName").value.trim();
			const set_ = document.getElementById("cardSet").value.trim();
			const no = document.getElementById("cardNo").value.trim();
			const rarity = document.getElementById("cardRarity").value.trim();
			const variant = document.getElementById("cardVariant").value.trim();
			const cond = document.getElementById("cardCond").value.trim();
			const pf = document.getElementById("cardPf").value.trim();
			const qty = parseInt(document.getElementById("cardQty").value, 10);
			const costRaw = document.getElementById("cardCost").value.trim();
			const cost = costRaw === "" ? null : parseFloat(costRaw.replace(",", "."));
			const priceRaw = document.getElementById("cardPrice").value.trim();
			const price = parseFloat(priceRaw.replace(",", "."));
			const added = document.getElementById("cardAdded").value || todayLocalISO();

			if (!name || isNaN(qty) || qty < 1 || isNaN(price) || price < 0) {
				document.getElementById("cardError").textContent =
					"Oppgi navn, et gyldig antall og en gyldig verdi.";
				return;
			}

			const id = window.KB.csv.buildId(pf, set_, name, no, variant, cond);
			const newData = { id, pf, set: set_, name, no, rarity, variant, cond, qty, cost, price, added };

			mutate((s) => {
				if (editingCardId) {
					const idx = s.cards.findIndex((c) => c.id === editingCardId);
					if (idx === -1) return;
					if (id !== editingCardId) {
						const other = s.cards.find((c) => c.id === id);
						if (other) {
							mergeCardInto(other, newData);
							s.cards.splice(idx, 1);
						} else {
							s.cards[idx] = newData;
						}
					} else {
						s.cards[idx] = newData;
					}
				} else {
					const existing = s.cards.find((c) => c.id === id);
					if (existing) mergeCardInto(existing, newData);
					else s.cards.push(newData);
				}
			});

			editingCardId = null;
			document.getElementById("cardDialog").close();
		});
	}

	// ---------- Legg til kort via TCGdex-søk ----------

	function openFindCardDialog() {
		findResults = [];
		findShowCount = 30;
		findLoadedDetailIds = new Set();
		findSelectedDetail = null;
		findLastQuery = null;
		document.getElementById("findNameInput").value = "";
		document.getElementById("findNoInput").value = "";
		document.getElementById("findStatus").textContent = "";
		document.getElementById("findStatus").className = "import-status";
		document.getElementById("findRetryBtn").classList.add("hidden");
		document.getElementById("findResultsList").innerHTML = "";
		document.getElementById("findShowMoreBtn").classList.add("hidden");
		document.getElementById("findSearchStep").classList.remove("hidden");
		document.getElementById("findDetailStep").classList.add("hidden");
		document.getElementById("findCardDialog").showModal();
		document.getElementById("findNameInput").focus();
	}

	function scheduleFindSearch() {
		clearTimeout(findDebounceTimer);
		findDebounceTimer = setTimeout(runFindSearch, 300);
	}

	function runFindSearch() {
		const name = document.getElementById("findNameInput").value.trim();
		const noQuery = document.getElementById("findNoInput").value.trim();
		const statusEl = document.getElementById("findStatus");
		const listEl = document.getElementById("findResultsList");

		if (findSearchController) findSearchController.abort();
		findShowCount = 30;
		findLoadedDetailIds = new Set();
		findResults = [];
		document.getElementById("findShowMoreBtn").classList.add("hidden");
		document.getElementById("findRetryBtn").classList.add("hidden");

		if (!name) {
			statusEl.textContent = "";
			statusEl.className = "import-status";
			listEl.innerHTML = "";
			return;
		}

		findLastQuery = { name, no: noQuery };
		statusEl.textContent = "Søker…";
		statusEl.className = "import-status";
		listEl.innerHTML = "";

		findSearchController = new AbortController();
		window.KB.tcgdex
			.searchCards(name, { signal: findSearchController.signal })
			.then((rows) => {
				let filtered = rows;
				if (noQuery) {
					const num = parseInt(noQuery, 10);
					if (!isNaN(num)) {
						filtered = rows.filter((r) => parseInt(r.localId, 10) === num);
					}
				}
				findResults = filtered;
				if (!filtered.length) {
					statusEl.textContent = `Fant ingen treff for «${name}».`;
					statusEl.className = "import-status";
				} else {
					statusEl.textContent = "";
				}
				renderFindResults();
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				if (err.status === 429) {
					statusEl.textContent =
						"For mange forespørsler mot TCGdex akkurat nå. Prøv igjen om litt.";
				} else {
					statusEl.textContent =
						"Kunne ikke nå TCGdex. Sjekk nettforbindelsen og prøv igjen, eller legg til kortet manuelt.";
				}
				statusEl.className = "import-status err";
				document.getElementById("findRetryBtn").classList.remove("hidden");
				listEl.innerHTML = "";
			});
	}

	function renderFindResults() {
		const listEl = document.getElementById("findResultsList");
		const visible = findResults.slice(0, findShowCount);
		listEl.innerHTML = visible
			.map((r) => {
				const img = r.image
					? `<img src="${escapeHTML(r.image + "/low.webp")}" alt="${escapeHTML(r.name)}" loading="lazy">`
					: `<span class="find-result-noimg" aria-hidden="true"></span>`;
				return `
				<button type="button" class="find-result" data-id="${escapeHTML(r.id)}">
					${img}
					<span class="find-result-info">
						<span class="find-result-name">${escapeHTML(r.name)}</span>
						<span class="find-result-sub mono" data-detail-for="${escapeHTML(r.id)}">#${escapeHTML(r.localId)} · henter sett …</span>
					</span>
				</button>`;
			})
			.join("");
		document
			.getElementById("findShowMoreBtn")
			.classList.toggle("hidden", findResults.length <= visible.length);
		loadDetailsForVisible(visible);
	}

	function loadDetailsForVisible(visible) {
		const toLoad = visible.filter((r) => !findLoadedDetailIds.has(r.id));
		toLoad.forEach((r) => findLoadedDetailIds.add(r.id));
		if (!toLoad.length) return;
		window.KB.tcgdex
			.mapWithConcurrency(toLoad, 4, (r) =>
				window.KB.tcgdex
					.getCardDetail(r.id)
					.then((detail) => ({ id: r.id, detail }))
					.catch((error) => ({ id: r.id, error })),
			)
			.then((results) => {
				results.forEach((res) => {
					if (!res) return;
					const sub = document.querySelector(`[data-detail-for="${res.id}"]`);
					if (!sub) return;
					if (res.detail) {
						const d = res.detail;
						const official = d.set && d.set.cardCount && d.set.cardCount.official;
						const no = official ? `${d.localId}/${official}` : d.localId;
						const setName = d.set ? d.set.name : "Ukjent sett";
						sub.textContent = `${setName} · #${no}${d.rarity ? " · " + d.rarity : ""}`;
					} else {
						sub.textContent = `#${visible.find((v) => v.id === res.id)?.localId ?? ""} · sett utilgjengelig`;
					}
				});
			});
	}

	function priceLineText(v, usdRate, eurRate) {
		if (v.usd != null && usdRate) return `${v.label}: $${v.usd.toFixed(2)} → ${fmtMoney2(v.usd * usdRate)}`;
		if (v.usd != null) return `${v.label}: $${v.usd.toFixed(2)} (valutakurs ikke tilgjengig)`;
		if (v.eur != null && eurRate) return `${v.label}: €${v.eur.toFixed(2)} → ${fmtMoney2(v.eur * eurRate)}`;
		if (v.eur != null) return `${v.label}: €${v.eur.toFixed(2)} (valutakurs ikke tilgjengig)`;
		return `${v.label}: pris ikke tilgjengig fra TCGdex`;
	}

	function priceForVariantLabel(label) {
		const variants = (findSelectedDetail && findSelectedDetail._variants) || [];
		const v = variants.find((x) => x.label === label);
		if (!v) return null;
		const { _usdRate: usdRate, _eurRate: eurRate } = findSelectedDetail;
		if (v.usd != null && usdRate) return v.usd * usdRate;
		if (v.eur != null && eurRate) return v.eur * eurRate;
		return null;
	}

	function currentFindSoftKey() {
		const variant = document.getElementById("findVariant").value;
		return `${findSelectedDetail.name}|${findSelectedDetail._no}|${variant}`.toLowerCase();
	}

	function refreshFindDupUI() {
		const key = currentFindSoftKey();
		const dups = state.cards.filter((c) => cardSoftKey(c) === key);
		const notice = document.getElementById("findDupNotice");
		const addBtn = document.getElementById("findAddBtn");
		const incBtn = document.getElementById("findIncreaseBtn");
		const newBtn = document.getElementById("findAddAsNewBtn");
		if (dups.length) {
			const totalQty = dups.reduce((s, c) => s + c.qty, 0);
			notice.textContent = `Du har allerede ${totalQty} av dette.`;
			notice.classList.remove("hidden");
			addBtn.classList.add("hidden");
			incBtn.classList.remove("hidden");
			newBtn.classList.remove("hidden");
		} else {
			notice.classList.add("hidden");
			addBtn.classList.remove("hidden");
			incBtn.classList.add("hidden");
			newBtn.classList.add("hidden");
		}
	}

	function populateFindPfSelect() {
		const pfs = [...new Set(state.cards.map((c) => c.pf))].filter(
			(p) => p && p !== "Manuelt",
		).sort();
		const options = ["Manuelt", ...pfs];
		const selectEl = document.getElementById("findPf");
		selectEl.innerHTML =
			options.map((p) => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join("") +
			`<option value="__new__">Ny …</option>`;
		selectEl.value = "Manuelt";
		document.getElementById("findPfNew").classList.add("hidden");
		document.getElementById("findPfNew").value = "";
	}

	function selectFindCard(tcgId) {
		const statusEl = document.getElementById("findStatus");
		statusEl.textContent = "Henter kortdetaljer…";
		statusEl.className = "import-status";
		Promise.all([
			window.KB.tcgdex.getCardDetail(tcgId),
			window.KB.tcgdex.getUsdNokRate(),
			window.KB.tcgdex.getEurNokRate(),
		])
			.then(([detail, usdRate, eurRate]) => {
				const official = detail.set && detail.set.cardCount && detail.set.cardCount.official;
				const no = official ? `${detail.localId}/${official}` : detail.localId;
				const variants = window.KB.tcgdex.priceByVariant(detail);
				findSelectedDetail = {
					...detail,
					_no: no,
					_variants: variants,
					_usdRate: usdRate,
					_eurRate: eurRate,
				};

				const imgEl = document.getElementById("findDetailImage");
				if (detail.image) {
					imgEl.src = detail.image + "/low.webp";
					imgEl.alt = detail.name;
					imgEl.style.display = "";
				} else {
					imgEl.style.display = "none";
				}
				document.getElementById("findDetailName").textContent = detail.name;
				document.getElementById("findDetailMeta").textContent =
					`${detail.set ? detail.set.name : "Ukjent sett"} · #${no}${detail.rarity ? " · " + detail.rarity : ""}`;

				const selectEl = document.getElementById("findVariant");
				const infoEl = document.getElementById("findPriceInfo");
				if (!variants.length) {
					selectEl.innerHTML = `<option value="Normal">Normal</option>`;
					infoEl.textContent = "Ingen variant- eller prisinformasjon fra TCGdex for dette kortet.";
				} else {
					selectEl.innerHTML = variants
						.map((v) => `<option value="${escapeHTML(v.label)}">${escapeHTML(v.label)}</option>`)
						.join("");
					infoEl.innerHTML = variants
						.map((v) => `<div>${escapeHTML(priceLineText(v, usdRate, eurRate))}</div>`)
						.join("");
				}

				document.getElementById("findCond").value = "Near Mint";
				document.getElementById("findQty").value = 1;
				document.getElementById("findCost").value = "";
				document.getElementById("findAdded").value = todayLocalISO();
				document.getElementById("findDetailError").textContent = "";
				const initialPrice = priceForVariantLabel(selectEl.value);
				document.getElementById("findPrice").value = initialPrice != null ? initialPrice.toFixed(2) : "";
				populateFindPfSelect();
				refreshFindDupUI();

				statusEl.textContent = "";
				document.getElementById("findSearchStep").classList.add("hidden");
				document.getElementById("findDetailStep").classList.remove("hidden");
			})
			.catch(() => {
				statusEl.textContent =
					"Kunne ikke hente kortdetaljer. Prøv igjen, eller legg til kortet manuelt.";
				statusEl.className = "import-status err";
				document.getElementById("findRetryBtn").classList.add("hidden");
			});
	}

	function readFindForm() {
		const pfSelect = document.getElementById("findPf").value;
		const pf =
			pfSelect === "__new__"
				? document.getElementById("findPfNew").value.trim() || "Manuelt"
				: pfSelect;
		return {
			variant: document.getElementById("findVariant").value,
			cond: document.getElementById("findCond").value.trim() || "Near Mint",
			qty: parseInt(document.getElementById("findQty").value, 10),
			price: parseFloat(document.getElementById("findPrice").value.replace(",", ".")),
			costRaw: document.getElementById("findCost").value.trim(),
			pf,
			added: document.getElementById("findAdded").value || todayLocalISO(),
		};
	}

	function validateFindForm(f) {
		if (isNaN(f.qty) || f.qty < 1) return "Oppgi et gyldig antall.";
		if (isNaN(f.price) || f.price < 0) return "Oppgi en gyldig pris i NOK.";
		if (
			document.getElementById("findPf").value === "__new__" &&
			!document.getElementById("findPfNew").value.trim()
		)
			return "Oppgi navn på den nye porteføljen.";
		return null;
	}

	function buildFindCard(f) {
		const cost = f.costRaw === "" ? null : parseFloat(f.costRaw.replace(",", "."));
		const name = findSelectedDetail.name;
		const no = findSelectedDetail._no;
		const set_ = findSelectedDetail.set ? findSelectedDetail.set.name : "";
		const rarity = findSelectedDetail.rarity || "";
		const id = window.KB.csv.buildId(f.pf, set_, name, no, f.variant, f.cond);
		return {
			id,
			pf: f.pf,
			set: set_,
			name,
			no,
			rarity,
			variant: f.variant,
			cond: f.cond,
			qty: f.qty,
			cost: cost == null || isNaN(cost) ? null : cost,
			price: f.price,
			added: f.added,
		};
	}

	function addFindCardToCollection() {
		const card = buildFindCard(readFindForm());
		mutate((s) => {
			const existing = s.cards.find((c) => c.id === card.id);
			if (existing) mergeCardInto(existing, card);
			else s.cards.push(card);
		});
	}

	function initFindCardDialog() {
		document.getElementById("findCardBtn").addEventListener("click", openFindCardDialog);
		document.getElementById("findCancelBtn").addEventListener("click", () => {
			document.getElementById("findCardDialog").close();
		});
		document.getElementById("findDetailCancelBtn").addEventListener("click", () => {
			document.getElementById("findCardDialog").close();
		});
		document.getElementById("findRetryBtn").addEventListener("click", runFindSearch);
		document.getElementById("findBackBtn").addEventListener("click", () => {
			document.getElementById("findDetailStep").classList.add("hidden");
			document.getElementById("findSearchStep").classList.remove("hidden");
		});
		document.getElementById("findManualLink").addEventListener("click", () => {
			const typedName = document.getElementById("findNameInput").value.trim();
			document.getElementById("findCardDialog").close();
			openCardDialog(null);
			if (typedName) document.getElementById("cardName").value = typedName;
		});

		["findNameInput", "findNoInput"].forEach((id) => {
			document.getElementById(id).addEventListener("input", scheduleFindSearch);
		});

		document.getElementById("findResultsList").addEventListener("click", (e) => {
			const btn = e.target.closest(".find-result");
			if (btn) selectFindCard(btn.dataset.id);
		});

		document.getElementById("findShowMoreBtn").addEventListener("click", () => {
			findShowCount += 30;
			renderFindResults();
		});

		document.getElementById("findVariant").addEventListener("change", () => {
			const price = priceForVariantLabel(document.getElementById("findVariant").value);
			document.getElementById("findPrice").value = price != null ? price.toFixed(2) : "";
			refreshFindDupUI();
		});

		document.getElementById("findPf").addEventListener("change", (e) => {
			document.getElementById("findPfNew").classList.toggle("hidden", e.target.value !== "__new__");
		});

		document.getElementById("findDetailForm").addEventListener("submit", (e) => {
			e.preventDefault();
			const f = readFindForm();
			const err = validateFindForm(f);
			if (err) {
				document.getElementById("findDetailError").textContent = err;
				return;
			}
			addFindCardToCollection();
			document.getElementById("findCardDialog").close();
		});

		document.getElementById("findIncreaseBtn").addEventListener("click", () => {
			const f = readFindForm();
			const err = validateFindForm(f);
			if (err) {
				document.getElementById("findDetailError").textContent = err;
				return;
			}
			const key = currentFindSoftKey();
			mutate((s) => {
				const target = s.cards.find((c) => cardSoftKey(c) === key);
				if (target) target.qty += f.qty;
			});
			document.getElementById("findCardDialog").close();
		});

		document.getElementById("findAddAsNewBtn").addEventListener("click", () => {
			const f = readFindForm();
			const err = validateFindForm(f);
			if (err) {
				document.getElementById("findDetailError").textContent = err;
				return;
			}
			addFindCardToCollection();
			document.getElementById("findCardDialog").close();
		});
	}

	// ---------- render: Salg ----------

	function renderSalg() {
		const sorted = [...state.sales].sort(
			(a, b) => new Date(b.date) - new Date(a.date),
		);
		const list = document.getElementById("salesList");
		if (!sorted.length) {
			list.innerHTML = `<p class="muted">Ingen salg registrert.</p>`;
			return;
		}
		list.innerHTML = sorted
			.map((s) => {
				const profit = s.cost == null ? null : s.price - s.cost;
				const itemsLine = s.items.length
					? s.items.map((i) => `${escapeHTML(i.name)} ×${i.qty}`).join(", ")
					: "(salg uten kort)";
				const metaBits = [fmtDate(s.date), s.platform];
				if (s.note) metaBits.push(s.note);
				return `
				<div class="sale-card" data-sale-id="${escapeHTML(s.id)}">
					<div class="sale-head">
						<span class="sale-title">${escapeHTML(s.title)}</span>
						<span class="sale-price mono">${fmtMoney0(s.price)}</span>
					</div>
					<div class="sale-meta">${metaBits.map(escapeHTML).join(" · ")}</div>
					<div class="sale-items">${itemsLine}</div>
					<div class="sale-foot">
						<span class="${profit == null ? "muted" : gainClass(profit)}">
							${profit == null ? "kost ukjent" : "Fortjeneste: " + fmtMoney2(profit)}
						</span>
						<div class="sale-actions">
							<button type="button" class="btn-sm undo-sale-btn" data-id="${escapeHTML(s.id)}">Angre salg</button>
							<button type="button" class="btn-sm danger delete-sale-btn" data-id="${escapeHTML(s.id)}">Slett fra loggen</button>
						</div>
					</div>
				</div>`;
			})
			.join("");
	}

	function undoSale(saleId) {
		mutate((s) => {
			const sale = s.sales.find((x) => x.id === saleId);
			if (!sale) return;
			sale.items.forEach((item) => {
				const card = s.cards.find((c) => c.id === item.id);
				if (card) {
					card.qty += item.qty;
				} else {
					s.cards.push({
						id: item.id,
						pf: item.pf,
						set: item.set,
						name: item.name,
						no: item.no,
						rarity: item.rarity,
						variant: item.variant,
						cond: item.cond,
						qty: item.qty,
						cost: item.cost,
						price: item.price,
						added: item.added,
					});
				}
			});
			s.sales = s.sales.filter((x) => x.id !== saleId);
		});
	}

	function deleteSaleFromLog(saleId) {
		mutate((s) => {
			s.sales = s.sales.filter((x) => x.id !== saleId);
		});
	}

	function initSalgEvents() {
		document.getElementById("salesList").addEventListener("click", async (e) => {
			const undoBtn = e.target.closest(".undo-sale-btn");
			const delBtn = e.target.closest(".delete-sale-btn");
			if (undoBtn) {
				const ok = await confirmDialog(
					"Angre dette salget? Kortene legges tilbake i samlingen.",
				);
				if (ok) undoSale(undoBtn.dataset.id);
			} else if (delBtn) {
				const ok = await confirmDialog(
					"Slette dette salget fra loggen? Kortene legges ikke tilbake.",
				);
				if (ok) deleteSaleFromLog(delBtn.dataset.id);
			}
		});

		document
			.getElementById("addManualSaleBtn")
			.addEventListener("click", () => {
				document.getElementById("manualSaleForm").reset();
				document.getElementById("manualSaleDate").value = todayLocalISO();
				document.getElementById("manualSalePlatform").value = PLATFORMS[0];
				document.getElementById("manualSaleDialog").showModal();
			});

		document
			.getElementById("manualSaleCancelBtn")
			.addEventListener("click", () => {
				document.getElementById("manualSaleDialog").close();
			});

		document
			.getElementById("manualSaleForm")
			.addEventListener("submit", (e) => {
				e.preventDefault();
				const desc = document.getElementById("manualSaleDesc").value.trim();
				const price = parseFloat(
					document.getElementById("manualSalePrice").value.replace(",", "."),
				);
				const costRaw = document
					.getElementById("manualSaleCost")
					.value.trim();
				const cost = costRaw === "" ? null : parseFloat(costRaw.replace(",", "."));
				const date =
					document.getElementById("manualSaleDate").value || todayLocalISO();
				const platform = document.getElementById("manualSalePlatform").value;

				if (!desc || isNaN(price)) {
					document.getElementById("manualSaleError").textContent =
						"Oppgi beskrivelse og en gyldig pris.";
					return;
				}

				mutate((s) => {
					s.sales.push({
						id: uid(),
						date,
						title: desc,
						platform,
						note: "",
						price,
						cost: cost == null || isNaN(cost) ? null : cost,
						items: [],
					});
				});
				document.getElementById("manualSaleDialog").close();
			});
	}

	// ---------- render: Import og data ----------

	function computeImportPreview(parsed) {
		const updatePrices = document.getElementById("updatePricesChk").checked;
		const includeSold = document.getElementById("includeSoldChk").checked;
		const existingIds = new Set(state.cards.map((c) => c.id));
		// A card already in the collection under a different set spelling (e.g.
		// added by hand via TCGdex search) still counts as "already have it".
		const existingSoftKeys = new Set(state.cards.map(cardSoftKey));
		const soldIds = new Set(
			state.sales.flatMap((s) => s.items.map((i) => i.id)),
		);

		const toAdd = [];
		const toUpdatePrice = [];
		let existingCount = 0;
		let skippedSold = 0;

		parsed.rows.forEach((r) => {
			if (existingIds.has(r.id) || existingSoftKeys.has(cardSoftKey(r))) {
				existingCount++;
				if (updatePrices) toUpdatePrice.push(r);
			} else if (soldIds.has(r.id) && !includeSold) {
				skippedSold++;
			} else {
				toAdd.push(r);
			}
		});

		return {
			fileCount: parsed.rows.length,
			toAdd,
			toUpdatePrice,
			existingCount,
			skippedSold,
		};
	}

	function renderImportPreview() {
		const box = document.getElementById("csvPreview");
		if (!lastParsed) {
			box.classList.add("hidden");
			document.getElementById("importBtn").classList.add("hidden");
			return;
		}
		box.classList.remove("hidden");
		const preview = computeImportPreview(lastParsed);
		document.getElementById("csvPreviewText").innerHTML = `
			<p>${preview.fileCount} kort i filen.</p>
			<p>${preview.toAdd.length} nye kort legges til.</p>
			<p>${preview.existingCount} kort finnes allerede${preview.toUpdatePrice.length ? ` (${preview.toUpdatePrice.length} får ny pris)` : ""}.</p>
			<p>${preview.skippedSold} kort hoppet over (solgt tidligere).</p>
		`;
		document.getElementById("importBtn").classList.toggle(
			"hidden",
			preview.toAdd.length === 0 && preview.toUpdatePrice.length === 0,
		);
	}

	function handleCsvFile(file) {
		const reader = new FileReader();
		reader.onload = () => {
			const result = window.KB.csv.parseCollectrCSV(reader.result);
			const resultBox = document.getElementById("importResult");
			if (result.error) {
				lastParsed = null;
				resultBox.textContent = result.error;
				resultBox.className = "import-status err";
				renderImportPreview();
				return;
			}
			lastParsed = result;
			resultBox.textContent = "";
			resultBox.className = "import-status";
			renderImportPreview();
		};
		reader.onerror = () => {
			document.getElementById("importResult").textContent =
				"Kunne ikke lese filen.";
			document.getElementById("importResult").className = "import-status err";
		};
		reader.readAsText(file);
	}

	function initImportEvents() {
		const dropZone = document.getElementById("dropZone");
		const fileInput = document.getElementById("csvFileInput");

		dropZone.addEventListener("click", () => fileInput.click());
		dropZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			dropZone.classList.add("drag-over");
		});
		dropZone.addEventListener("dragleave", () =>
			dropZone.classList.remove("drag-over"),
		);
		dropZone.addEventListener("drop", (e) => {
			e.preventDefault();
			dropZone.classList.remove("drag-over");
			const file = e.dataTransfer.files[0];
			if (file) handleCsvFile(file);
		});
		fileInput.addEventListener("change", () => {
			if (fileInput.files[0]) handleCsvFile(fileInput.files[0]);
			fileInput.value = "";
		});

		document.getElementById("updatePricesChk").addEventListener("change", renderImportPreview);
		document.getElementById("includeSoldChk").addEventListener("change", renderImportPreview);

		document.getElementById("importBtn").addEventListener("click", () => {
			if (!lastParsed) return;
			const preview = computeImportPreview(lastParsed);
			mutate((s) => {
				preview.toAdd.forEach((r) => s.cards.push({ ...r }));
				preview.toUpdatePrice.forEach((r) => {
					const card =
						s.cards.find((c) => c.id === r.id) ||
						s.cards.find((c) => cardSoftKey(c) === cardSoftKey(r));
					if (card) card.price = r.price;
				});
				s.meta.lastImport = new Date().toISOString();
				if (lastParsed.meta.priceDate) s.meta.priceDate = lastParsed.meta.priceDate;
			});
			const resultBox = document.getElementById("importResult");
			resultBox.textContent = `Importert: ${preview.toAdd.length} nye, ${preview.toUpdatePrice.length} priser oppdatert.`;
			resultBox.className = "import-status ok";
			lastParsed = null;
			renderImportPreview();
		});

		document.getElementById("downloadBackupBtn").addEventListener("click", () => {
			downloadFile(
				`kortbok-${todayLocalISO()}.json`,
				JSON.stringify(state, null, 2),
				"application/json",
			);
			mutate((s) => {
				s.meta.lastBackup = new Date().toISOString();
			});
		});

		document.getElementById("restoreFileInput").addEventListener("change", async (e) => {
			const file = e.target.files[0];
			e.target.value = "";
			if (!file) return;
			let parsed;
			try {
				parsed = JSON.parse(await file.text());
			} catch (err) {
				showImportDataStatus("Filen er ikke gyldig JSON.", "err");
				return;
			}
			if (!isValidState(parsed)) {
				showImportDataStatus("Filen ser ikke ut som en Kortbok-sikkerhetskopi.", "err");
				return;
			}
			const ok = await confirmDialog(
				"Dette overskriver alle data i Kortbok med innholdet i filen. Fortsette?",
			);
			if (!ok) return;
			replaceState(parsed);
			showImportDataStatus("Gjenopprettet fra sikkerhetskopi.", "ok");
		});
		document.getElementById("restoreBackupBtn").addEventListener("click", () => {
			document.getElementById("restoreFileInput").click();
		});

		document.getElementById("exportCsvBtn").addEventListener("click", () => {
			const csv = window.KB.csv.toCollectrCSV(state.cards, todayLocalISO());
			downloadFile(`kortbok-samling-${todayLocalISO()}.csv`, csv, "text/csv");
		});

		document.getElementById("deleteAllBtn").addEventListener("click", async () => {
			const ok = await confirmDialog(
				"Slette ALLE data i Kortbok? Dette kan ikke angres (last ned en sikkerhetskopi først om du er usikker).",
			);
			if (!ok) return;
			replaceState(defaultState());
			showImportDataStatus("Alle data er slettet.", "ok");
		});

		initGistSync();
	}

	function showImportDataStatus(msg, type) {
		const el = document.getElementById("dataStatus");
		el.textContent = msg;
		el.className = `import-status ${type || ""}`;
	}

	function downloadFile(filename, content, mime) {
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function renderBackupReminder() {
		const el = document.getElementById("backupReminder");
		const last = state.meta.lastBackup;
		const stale =
			!last || Date.now() - new Date(last).getTime() > 14 * 24 * 60 * 60 * 1000;
		el.classList.toggle("hidden", !stale);
		if (stale) {
			el.textContent = last
				? `Siste sikkerhetskopi er fra ${fmtDate(last)} — over 14 dager siden.`
				: "Du har ingen sikkerhetskopi ennå.";
		}
	}

	// ---------- GitHub Gist sync ----------

	function ghHeaders(token) {
		return {
			Authorization: `token ${token}`,
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
		};
	}

	function setSyncStatus(msg, type) {
		const el = document.getElementById("syncStatus");
		el.textContent = msg;
		el.className = `import-status ${type || ""}`;
	}

	function initGistSync() {
		const tokenInput = document.getElementById("tokenInput");
		const gistIdInput = document.getElementById("gistIdInput");
		tokenInput.value = localStorage.getItem(TOKEN_KEY) || "";
		gistIdInput.value = localStorage.getItem(GIST_ID_KEY) || "";

		document.getElementById("saveTokenBtn").addEventListener("click", () => {
			localStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
			localStorage.setItem(GIST_ID_KEY, gistIdInput.value.trim());
			setSyncStatus("Innstillinger lagret i denne nettleseren.", "ok");
		});

		document.getElementById("forgetTokenBtn").addEventListener("click", () => {
			localStorage.removeItem(TOKEN_KEY);
			localStorage.removeItem(GIST_ID_KEY);
			tokenInput.value = "";
			gistIdInput.value = "";
			setSyncStatus("Token og Gist-ID glemt.", "");
		});

		document.getElementById("pushGistBtn").addEventListener("click", async () => {
			const token = tokenInput.value.trim();
			if (!token) {
				setSyncStatus("Lim inn en GitHub-token først.", "err");
				return;
			}
			let gistId = gistIdInput.value.trim();
			const body = {
				description: "Kortbok data",
				files: {
					[GIST_FILENAME]: { content: JSON.stringify(state, null, 2) },
				},
			};
			setSyncStatus("Sender…", "");
			try {
				let res;
				if (gistId) {
					res = await fetch(`https://api.github.com/gists/${gistId}`, {
						method: "PATCH",
						headers: ghHeaders(token),
						body: JSON.stringify(body),
					});
				} else {
					body.public = false;
					res = await fetch("https://api.github.com/gists", {
						method: "POST",
						headers: ghHeaders(token),
						body: JSON.stringify(body),
					});
				}
				if (!res.ok) throw new Error(`GitHub API-feil (${res.status})`);
				const data = await res.json();
				gistId = data.id;
				gistIdInput.value = gistId;
				localStorage.setItem(TOKEN_KEY, token);
				localStorage.setItem(GIST_ID_KEY, gistId);
				setSyncStatus(`Lastet opp til Gist ${gistId}.`, "ok");
			} catch (err) {
				console.error(err);
				setSyncStatus(`Opplasting feilet: ${err.message}`, "err");
			}
		});

		document.getElementById("pullGistBtn").addEventListener("click", async () => {
			const token = tokenInput.value.trim();
			const gistId = gistIdInput.value.trim();
			if (!token || !gistId) {
				setSyncStatus("Fyll inn både token og Gist-ID.", "err");
				return;
			}
			setSyncStatus("Henter…", "");
			try {
				const res = await fetch(`https://api.github.com/gists/${gistId}`, {
					headers: ghHeaders(token),
				});
				if (!res.ok) throw new Error(`GitHub API-feil (${res.status})`);
				const data = await res.json();
				const file = data.files[GIST_FILENAME];
				if (!file) throw new Error(`Fant ingen ${GIST_FILENAME} i denne Gisten.`);
				const parsed = JSON.parse(file.content);
				if (!isValidState(parsed)) throw new Error("Innholdet er ikke gyldig Kortbok-data.");
				const ok = await confirmDialog(
					"Dette overskriver dataene dine i denne nettleseren med innholdet fra Gisten. Fortsette?",
				);
				if (!ok) {
					setSyncStatus("Avbrutt.", "");
					return;
				}
				localStorage.setItem(TOKEN_KEY, token);
				localStorage.setItem(GIST_ID_KEY, gistId);
				replaceState(parsed);
				setSyncStatus("Hentet fra Gist.", "ok");
			} catch (err) {
				console.error(err);
				setSyncStatus(`Henting feilet: ${err.message}`, "err");
			}
		});
	}

	// ---------- confirm dialog ----------

	function confirmDialog(message) {
		return new Promise((resolve) => {
			const dialog = document.getElementById("confirmDialog");
			document.getElementById("confirmMessage").textContent = message;
			const okBtn = document.getElementById("confirmOkBtn");
			const cancelBtn = document.getElementById("confirmCancelBtn");
			function cleanup(result) {
				okBtn.removeEventListener("click", onOk);
				cancelBtn.removeEventListener("click", onCancel);
				dialog.removeEventListener("cancel", onCancel);
				dialog.close();
				resolve(result);
			}
			function onOk() {
				cleanup(true);
			}
			function onCancel() {
				cleanup(false);
			}
			okBtn.addEventListener("click", onOk);
			cancelBtn.addEventListener("click", onCancel);
			dialog.addEventListener("cancel", onCancel);
			dialog.showModal();
		});
	}

	// ---------- init ----------

	function renderAll() {
		renderOversikt();
		renderSamling();
		renderSalg();
		renderBackupReminder();
		if (storageOk) clearWarning();
	}

	document.getElementById("goImportBtn")?.addEventListener("click", () =>
		switchTab("import"),
	);

	initTabs();
	initSamlingEvents();
	initCardDialog();
	initFindCardDialog();
	initSellDialog();
	initSalgEvents();
	initImportEvents();
	renderAll();

	window.KB.app = { mutate, replaceState, uid };
})();
