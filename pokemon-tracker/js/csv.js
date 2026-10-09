// KB.csv — RFC 4180 CSV parsing and Collectr export mapping.
// Classic script: attaches to window.KB so it works from file:// with no bundler.
(function () {
	"use strict";

	window.KB = window.KB || {};

	// Required columns in a Collectr export, besides the dynamic "Market Price (As of ...)" one.
	const REQUIRED_HEADERS = [
		"Portfolio Name",
		"Category",
		"Set",
		"Product Name",
		"Card Number",
		"Rarity",
		"Variance",
		"Grade",
		"Card Condition",
		"Average Cost Paid",
		"Quantity",
		"Price Override",
		"Watchlist",
		"Date Added",
		"Notes",
	];

	// Full RFC 4180 state machine: quoted fields, "" escapes, embedded commas/newlines, CRLF or LF.
	function parse(text) {
		if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
		const rows = [];
		let row = [];
		let field = "";
		let inQuotes = false;
		let i = 0;
		const len = text.length;
		while (i < len) {
			const c = text[i];
			if (inQuotes) {
				if (c === '"') {
					if (text[i + 1] === '"') {
						field += '"';
						i += 2;
						continue;
					}
					inQuotes = false;
					i++;
					continue;
				}
				field += c;
				i++;
				continue;
			}
			if (c === '"') {
				inQuotes = true;
				i++;
				continue;
			}
			if (c === ",") {
				row.push(field);
				field = "";
				i++;
				continue;
			}
			if (c === "\r") {
				if (text[i + 1] === "\n") i++;
				row.push(field);
				field = "";
				rows.push(row);
				row = [];
				i++;
				continue;
			}
			if (c === "\n") {
				row.push(field);
				field = "";
				rows.push(row);
				row = [];
				i++;
				continue;
			}
			field += c;
			i++;
		}
		if (field !== "" || row.length) {
			row.push(field);
			rows.push(row);
		}
		return rows.filter((r) => !(r.length === 1 && r[0] === ""));
	}

	// Handles "1,234.56" (thousands comma) and "12,5" (decimal comma).
	function parseNumber(raw) {
		if (raw == null) return null;
		let s = String(raw).trim();
		if (s === "") return null;
		s = s.replace(/\s/g, "");
		if (s.includes(",") && s.includes(".")) {
			if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
				s = s.replace(/\./g, "").replace(",", ".");
			} else {
				s = s.replace(/,/g, "");
			}
		} else if (s.includes(",")) {
			s = s.replace(",", ".");
		}
		const n = parseFloat(s);
		return isNaN(n) ? null : n;
	}

	function buildId(pf, set_, name, no, variant, cond) {
		return [pf, set_, name, no, variant, cond]
			.map((s) => String(s || "").toLowerCase())
			.join("|");
	}

	// Parses a Collectr CSV export into { rows, meta } or { error }.
	function parseCollectrCSV(text) {
		let parsedRows;
		try {
			parsedRows = parse(text).filter((r) => r.some((c) => c.trim() !== ""));
		} catch (err) {
			return { error: "Kunne ikke lese filen som CSV: " + err.message };
		}
		if (parsedRows.length < 1) {
			return { error: "Filen er tom." };
		}

		const header = parsedRows[0].map((h) => h.trim());
		const priceIdx = header.findIndex((h) => h.startsWith("Market Price"));
		if (priceIdx === -1) {
			return {
				error:
					'Fant ingen "Market Price"-kolonne. Dette ser ikke ut som en Collectr-eksport.',
			};
		}

		const idx = {};
		for (const name of REQUIRED_HEADERS) {
			const i = header.indexOf(name);
			if (i === -1) {
				return {
					error: `Mangler kolonnen "${name}". Dette ser ikke ut som en Collectr-eksport.`,
				};
			}
			idx[name] = i;
		}

		const dateMatch = header[priceIdx].match(/\(As of ([\d-]+)\)/);
		const priceDate = dateMatch ? dateMatch[1] : null;

		const merged = new Map();
		for (let r = 1; r < parsedRows.length; r++) {
			const cells = parsedRows[r];
			if (!cells.some((c) => c.trim() !== "")) continue;

			const pf = (cells[idx["Portfolio Name"]] || "").trim();
			const set_ = (cells[idx["Set"]] || "").trim();
			const name = (cells[idx["Product Name"]] || "").trim();
			const no = (cells[idx["Card Number"]] || "").trim();
			const rarity = (cells[idx["Rarity"]] || "").trim();
			const variant = (cells[idx["Variance"]] || "").trim();
			const cond = (cells[idx["Card Condition"]] || "").trim();
			const qty = Math.round(parseNumber(cells[idx["Quantity"]]) || 0);
			const cost = parseNumber(cells[idx["Average Cost Paid"]]);
			const marketPrice = parseNumber(cells[priceIdx]) || 0;
			const override = parseNumber(cells[idx["Price Override"]]) || 0;
			const price = override > 0 ? override : marketPrice;
			const added = (cells[idx["Date Added"]] || "").trim();

			if (!name || qty <= 0) continue;

			const id = buildId(pf, set_, name, no, variant, cond);
			if (merged.has(id)) {
				const existing = merged.get(id);
				const totalQty = existing.qty + qty;
				const existingCost = existing.cost == null ? 0 : existing.cost;
				const newCost = cost == null ? 0 : cost;
				existing.cost =
					existing.cost == null && cost == null
						? null
						: (existingCost * existing.qty + newCost * qty) / totalQty;
				existing.qty = totalQty;
				existing.price = price;
			} else {
				merged.set(id, {
					id,
					pf,
					set: set_,
					name,
					no,
					rarity,
					variant,
					cond,
					qty,
					cost,
					price,
					added,
				});
			}
		}

		return { rows: [...merged.values()], meta: { priceDate } };
	}

	// Builds a Collectr-like CSV from current collection cards, for export.
	function toCollectrCSV(cards, priceDateLabel) {
		function field(v) {
			const s = v == null ? "" : String(v);
			return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
		}
		const header = [
			"Portfolio Name",
			"Category",
			"Set",
			"Product Name",
			"Card Number",
			"Rarity",
			"Variance",
			"Grade",
			"Card Condition",
			"Average Cost Paid",
			"Quantity",
			`Market Price (As of ${priceDateLabel})`,
			"Price Override",
			"Watchlist",
			"Date Added",
			"Notes",
		];
		const lines = [header.map(field).join(",")];
		cards.forEach((c) => {
			lines.push(
				[
					c.pf,
					"Pokemon",
					c.set,
					c.name,
					c.no,
					c.rarity || "",
					c.variant,
					"Ungraded",
					c.cond,
					c.cost == null ? "" : c.cost,
					c.qty,
					c.price,
					0,
					"false",
					c.added || "",
					"",
				]
					.map(field)
					.join(","),
			);
		});
		return lines.join("\r\n") + "\r\n";
	}

	window.KB.csv = { parse, parseNumber, parseCollectrCSV, toCollectrCSV, buildId };
})();
