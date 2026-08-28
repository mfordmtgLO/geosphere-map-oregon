import { readFile, writeFile } from "node:fs/promises";

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((entry) => entry.length)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value.length || row.length) rows.push([...row, value]);
  return rows;
}

function moneyToNumber(value) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) throw new Error(`Invalid limit value: ${value}`);
  return numeric;
}

const rows = parseCsv(await readFile(new URL("../data/fhfa_2026_county_limits.csv", import.meta.url), "utf8"));
const supportedStates = new Map([
  ["OR", 36],
  ["WA", 39],
  ["ID", 44],
  ["CA", 58],
]);
const states = Object.fromEntries([...supportedStates].map(([state, expectedCount]) => {
  const counties = rows
    .slice(1)
    .filter((row) => row[3] === state)
    .map((row) => ({
      fips: `${String(row[0]).padStart(2, "0")}${String(row[1]).padStart(3, "0")}`,
      county: String(row[2]).replace(/\s+COUNTY$/i, "").trim(),
      caps: { 1: moneyToNumber(row[5]), 2: moneyToNumber(row[6]), 3: moneyToNumber(row[7]), 4: moneyToNumber(row[8]) },
    }))
    .sort((left, right) => left.county.localeCompare(right.county));
  if (counties.length !== expectedCount) throw new Error(`Expected ${expectedCount} ${state} counties, found ${counties.length}.`);
  return [state, { counties }];
}));

await writeFile(new URL("../data/fhfa_2026_pacific_county_limits.json", import.meta.url), `${JSON.stringify({
  metadata: {
    source: "FHFA Conforming Loan Limit Values for Calendar Year 2026 — All Counties",
    sourceUrl: "https://www.fhfa.gov/document/d/cll/fullcountyloanlimitlist2026_hera-based_final_flat.csv",
    year: 2026,
    states: [...supportedStates.keys()],
    purpose: "Lakeview National review-overlay listing-price proxy only; not a loan amount, qualification, or approval.",
  },
  states,
}, null, 2)}\n`, "utf8");

console.log(`Wrote ${[...supportedStates.keys()].join(", ")} county limits.`);
