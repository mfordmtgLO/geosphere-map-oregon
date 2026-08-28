import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("exposes Lakeview National as an explicit saved-list review selection", () => {
  assert.match(html, /value="lakeviewNational">Lakeview National: Oregon review screen/);
  assert.match(html, /Lakeview National is a listing-review screen only/);
  assert.match(html, /pull\.programReviewSets\?\.lakeviewNational/);
  assert.match(html, /Lakeview National review-screened/);
});

test("renders the required Lakeview review disclosure and full saved Rentcast record", () => {
  assert.match(html, /Lakeview National \$\{lakeviewReviewReady \? 'review screen' : 'review unavailable'\}/);
  assert.match(html, /Review only — borrower and underwriting criteria require separate verification/);
  assert.match(html, /Rentcast property record/);
  assert.match(html, /JSON\.stringify\(listing, null, 2\)/);
});

test("validates external listing-agent contact links before rendering them", () => {
  assert.match(html, /function safeExternalHttpUrl\(value\)/);
  assert.match(html, /function safePhoneHref\(value\)/);
  assert.match(html, /function safeMailHref\(value\)/);
  assert.match(html, /rel="noopener noreferrer"/);
});
