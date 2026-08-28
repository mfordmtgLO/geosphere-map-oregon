import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("exposes Lakeview National as an explicit saved-list review selection", () => {
  assert.match(html, /value="lakeviewNational">Lakeview National: Oregon \+ Washington review screen/);
  assert.match(html, /Lakeview National is a listing-review screen only/);
  assert.match(html, /\(pull\.overlaySets\?\.all \|\| \[\]\)\.filter\(lakeviewListingPasses\)/);
  assert.match(html, /Lakeview National review-screened/);
  assert.match(html, /data-lakeview-price-cap="1"/);
  assert.match(html, /data-lakeview-price-cap="2"/);
  assert.match(html, /data-lakeview-price-cap="3"/);
  assert.match(html, /data-lakeview-price-cap="4"/);
  assert.match(html, /The property’s verified unit count selects its cap/);
});

test("renders the required Lakeview review disclosure and full saved Rentcast record", () => {
  assert.match(html, /Lakeview National \$\{lakeviewReviewReady \? 'review screen' : 'review unavailable'\}/);
  assert.match(html, /Review only — a listing sales price does not establish the loan amount, qualification, or approval/);
  assert.match(html, /Selected \$\{escapeHtml\(lakeviewUnitLabel\)\} listing-price review cap/);
  assert.match(html, /Rentcast property record/);
  assert.match(html, /JSON\.stringify\(listing, null, 2\)/);
});

test("validates external listing-agent contact links before rendering them", () => {
  assert.match(html, /function safeExternalHttpUrl\(value\)/);
  assert.match(html, /function safePhoneHref\(value\)/);
  assert.match(html, /function safeMailHref\(value\)/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("stores distinct local annual review caps by property unit count", () => {
  assert.match(html, /LAKEVIEW_DEFAULT_PRICE_CAPS = Object\.freeze\(\{ 1: 832750, 2: 1066250, 3: 1288800, 4: 1601750 \}\)/);
  assert.match(html, /geosphere-lakeview-oregon-unit-review-caps-v2/);
  assert.match(html, /function getLakeviewPriceCap\(unitCount\)/);
  assert.match(html, /function saveLakeviewPriceCap\(unitCount, value\)/);
});

test("uses server-provided Washington county caps instead of Oregon local slider values", () => {
  assert.match(html, /const isWashington = state === 'WA';/);
  assert.match(html, /Washington county and unit values are applied automatically/);
  assert.match(html, /const isOregon = screening\.state === 'OR';/);
  assert.match(html, /Number\(screening\.defaultListingPriceCap\)/);
});
