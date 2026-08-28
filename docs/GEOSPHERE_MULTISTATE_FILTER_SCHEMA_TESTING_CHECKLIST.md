# GeoSphere Multi-State Filter Schema Testing Checklist

**Purpose.** This checklist provides the release, regression, data-refresh, and manual-review test cases for the GeoSphere saved-listing filter schema. It covers the current review overlays for Oregon, Washington, Idaho, and California: geographic LMI and USDA context; OHCS FirstHome; FHFA 2026 county-and-unit listed-price context; Lakeview National review; Idaho Housing Tax-Exempt/MRB price context; and CalHFA MyHome property context.

> **Control principle:** Every GeoSphere result is a **property-record review signal**. No automated test or UI state may imply borrower qualification, income eligibility, credit eligibility, loan amount, rate, lender acceptance, underwriting, program reservation, or approval.

## 1. Release Gate and Test Evidence

Run the current automated regression suite before every deployment and after every dataset refresh. The current suite begins with the classifier contract and the saved-list UI contract. Expand the suite whenever a data source, state adapter, field normalization rule, or overlay label changes.

| Gate | Required action | Acceptance criterion | Evidence to retain |
|---|---|---|---|
| Source integrity | Validate source URL, effective date, retrieval date, and row count before importing a data file. | Each source-backed dataset has a versioned local copy and metadata that identifies its authoritative source. | Source PDF/CSV/JSON, checksum or commit, data dictionary, and import log. |
| Automated regression | Run `node --test api/overlay-classification.test.mjs test/lakeview-ui.test.mjs`. | All tests pass with no skipped required case. | CI or terminal output attached to the release record. |
| Manual saved-list test | Perform a Live Pull with a known property in each supported state, then select every applicable saved-list review option. | Each option filters the existing snapshot only and shows its non-decision disclosure. | Test date, property IDs, screenshots, and selected overlay. |
| Export contract | Export the same saved snapshot after each relevant overlay selection. | Exported records preserve the source-backed review metadata and do not use eligibility/approval wording. | Export sample and schema comparison. |
| Compliance copy | Review map labels, pins, popups, exports, and source guide. | No wording states or implies that a listing is approved, eligible, guaranteed, qualified, fundable, or a loan offer. | Reviewer initials and release checklist. |

## 2. Test Fixtures and Baseline Controls

Construct deterministic fixtures rather than testing against changing live listings alone. Every fixture should contain a stable synthetic `id`, state, county, normalized property type, unit count when available, listed price, and known coordinate status. A fixture must never contain a real borrower’s data.

| Fixture family | Minimum records | Required variation | Expected use |
|---|---:|---|---|
| Geographic | 8 | Valid point inside LMI polygon; valid point outside; point on boundary; no coordinates; invalid coordinates; wrong state FIPS. | LMI and USDA spatial matching. |
| County limits | 16 | Baseline, high-cost, intermediate/high-balance, unknown county, normalized county suffix, each unit count 1–4, at-cap, and one-dollar-over-cap. | FHFA and state-chart rules. |
| Property taxonomy | 18 | Single family; condo; PUD; duplex; triplex; fourplex; 5+ unit; manufactured; mobile; modular; land lease; unknown type. | Lakeview and CalHFA property review. |
| FirstHome | 12 | Entire-county targeted; city targeted; tract targeted; non-targeted; unavailable chart field; missing price; missing county; no LMI context. | Oregon targeted-area and two-check logic. |
| Saved/export | 8 | Matching/nonmatching record, no provider refresh, overlay toggle, stale source metadata, malicious listing-agent link, incomplete agent contact. | UI, safety, and export behavior. |

## 3. Data Provenance and Normalization

The county-cap engine must operate only on a source-versioned data file and must never fill a missing official county value with a statewide baseline or national ceiling. For OHCS and IHFA charts, a chart’s explicit **not applicable** or unavailable value must remain unavailable after import.

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| DATA-01 | Parse the bundled FHFA 2026 Pacific-state file. | The parser returns Oregon, Washington, Idaho, and California entries; each retained county has a FIPS code and 1–4 unit caps. | Add integration fixture if file schema changes. |
| DATA-02 | Parse a record with `King County`, `KING`, and mixed casing. | All normalize to the same Washington county key and preserve FIPS `53033`. | Covered for Washington county context. |
| DATA-03 | Parse a valid county whose cap is absent or non-numeric. | The result is unavailable; it does not substitute a national or state number. | Add explicit negative test. |
| DATA-04 | Import a FirstHome row where the targeted or non-targeted value is null. | The null is preserved as unavailable and blocks the corresponding price screen. | Covered for null preservation. |
| DATA-05 | Import IHFA’s authorized 2026-6 county chart. | The parser retains all 44 county rows, targeted status, sales-price limit, effective date, and revision date. | Covered for 44 rows, Ada, and Lincoln. |
| DATA-06 | Attempt to derive Idaho values using the statutory 90%/110% description rather than a supplied chart. | Import is rejected or no Idaho MRB screen is enabled; no derived value is displayed. | Manual governance test. |
| DATA-07 | Replace a source file with a newer authoritative version. | The changed effective/revision date is surfaced in the source guide, saved metadata, and release note. | Manual refresh test. |
| DATA-08 | Replace a file with malformed JSON, duplicate county keys, or an unsupported state. | The relevant review adapter fails closed and existing unrelated overlays still load. | Add resilience test. |

## 4. LMI Tract and Geographic Context

GeoSphere’s LMI layer is geographic context. It is not a household-income calculation. FirstHome review requires the documented LMI spatial context **and** the applicable OHCS listed-price comparison; a pass on only one condition must not enter the FirstHome review set.[1] [2]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| LMI-01 | Parse a valid single-quoted Oregon LMI tract lookup containing Low and Moderate values. | Both tract IDs and income categories are retained exactly. | Covered. |
| LMI-02 | Test a coordinate strictly inside a Low LMI tract polygon. | Listing receives Low LMI geographic context. | Add polygon integration test. |
| LMI-03 | Test a coordinate strictly inside a Moderate LMI tract polygon. | Listing receives Moderate LMI geographic context. | Add polygon integration test. |
| LMI-04 | Test a coordinate outside every LMI polygon. | LMI context is false/unavailable; FirstHome cannot pass. | Add explicit negative test. |
| LMI-05 | Test a point directly on a tract boundary. | Boundary treatment is deterministic and documented; use the selected geometry library’s result consistently. | Add boundary fixture. |
| LMI-06 | Test missing, null, nonnumeric, or latitude/longitude-swapped coordinates. | No spatial claim is made; the record remains out of LMI-dependent review sets. | Add validation test. |
| LMI-07 | Test an Oregon tract code with leading zeros and a normalized API representation. | The same documented tract entry is resolved. | Add normalization test. |
| LMI-08 | Test a Washington, Idaho, or California listing against the Oregon-only LMI source. | The UI/source guide identifies that LMI context remains Oregon-only unless separately versioned state data is loaded; no cross-state LMI result is claimed. | Manual/UI source-guide test. |
| LMI-09 | Verify UI and export language for an LMI match. | It says **LMI geographic context**; it never states that a household meets an income limit. | Manual copy review. |

## 5. USDA Geographic Context

USDA context must be treated independently from LMI and state-program review screens. The existing implementation represents an area outside configured shaded ineligible polygons as a geographic review signal; the official USDA property eligibility tool remains the final source for program determinations.[3]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| USDA-01 | Test a saved coordinate inside a configured USDA ineligible polygon. | USDA geographic context is false. | Covered. |
| USDA-02 | Test a point outside the configured ineligible polygon within the intended state. | The existing review signal is true, subject to current data scope. | Covered. |
| USDA-03 | Test a coordinate with a state FIPS mismatch. | No out-of-state polygon result is applied. | Add state-isolation test. |
| USDA-04 | Test a point on a USDA polygon boundary. | Result is deterministic and documented; manual official-tool comparison is required for release. | Add boundary fixture. |
| USDA-05 | Change the USDA geometry source version. | The data date, scope, retrieval source, and map/export disclosure are updated before the new geometry is enabled. | Manual refresh test. |
| USDA-06 | Review map and export wording. | The wording uses geographic context/review and never asserts USDA loan eligibility, income eligibility, or approval. | Manual copy review. |

## 6. Property Type and Unit-Count Classification

The Lakeview National review policy currently limits the local review screen to for-sale, map-ready, stick-built residential categories with an explicitly supported one-to-four-unit count. Manufactured, mobile, modular, land-lease, condominium, and unsupported/unknown types must remain out of that screen. This is an owner-directed GeoSphere review policy, not a property rule established from the public Lakeview page.[4]

| ID | Fixture | Expected Lakeview result | Current coverage |
|---|---|---|---|
| PROP-01 | `Single Family` with no conflicting field. | Stick-built, one unit, eligible for further review. | Covered. |
| PROP-02 | `Duplex`. | Stick-built, two units, uses the two-unit cap. | Covered. |
| PROP-03 | `Triplex`. | Stick-built, three units, uses the three-unit cap. | Add explicit cap test. |
| PROP-04 | `Fourplex` or multifamily with `units: 4`. | Stick-built, four units, uses the four-unit cap. | Covered at-cap export case. |
| PROP-05 | Multifamily with `units: 5`. | Excluded; not a one-to-four-unit review record. | Covered. |
| PROP-06 | `Manufactured`, `Mobile`, or `Modular`. | Excluded regardless of listed price. | Covered for manufactured; add mobile/modular variants. |
| PROP-07 | Single-family record with `landLease: true`. | Excluded. | Covered. |
| PROP-08 | `Condo`. | Excluded from Lakeview policy screen. | Covered. |
| PROP-09 | Unknown or null property type. | Excluded and emits the explicit unsupported-category reason. | Covered for null type. |
| PROP-10 | Mixed/conflicting fields, such as `Duplex` and `units: 1`. | Fail closed or use a documented precedence rule; never silently select a more favorable cap. | Add conflict test. |
| PROP-11 | Negative, decimal, string, or zero unit count. | Reject/normalize only through documented rules; otherwise exclude. | Add validation test. |
| PROP-12 | California one-unit single family, condominium, PUD, and manufactured cases. | CalHFA MyHome property-context screen includes supported one-unit categories without a price cap. | Condo covered; add PUD, manufactured, and unit-count cases. |
| PROP-13 | California duplex or any two-plus-unit record. | CalHFA MyHome property-context screen excludes it with a one-unit reason. | Covered for duplex. |

## 7. FHFA 2026 County-and-Unit Listed-Price Review

The FHFA review overlay compares **listing price** to the applicable 2026 county-and-unit conforming-loan-limit value. It is intentionally not a loan amount calculation or eligibility result. The 2026 national one-unit baseline is $832,750, but county values must come from the official county file rather than a statewide or national assumption.[5] [6]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| FHFA-01 | Oregon one-unit listing priced exactly at its applicable county cap. | Review passes and displays the exact county/unit source value. | Add Oregon exact-cap integration test. |
| FHFA-02 | Washington King County one-unit listing priced at $1,063,750. | Review passes, records FIPS `53033`, and does not use the national ceiling. | Covered. |
| FHFA-03 | Washington Spokane County duplex at $1,066,251. | Review fails; the two-unit $1,066,250 cap is preserved. | Covered. |
| FHFA-04 | Idaho Teton County duplex at $1,599,375. | Review passes using the exact high-cost county/unit value. | Covered. |
| FHFA-05 | California Los Angeles one-unit listing at $1,249,126. | Review fails as one dollar above the exact county cap. | Covered. |
| FHFA-06 | County name with suffix, punctuation, whitespace, and mixed case. | Normalizes to the correct FIPS row. | Add normalization matrix. |
| FHFA-07 | Unknown county or a county outside the four-state dataset. | Review is unavailable; no cap is guessed. | Add explicit negative test. |
| FHFA-08 | Listing price equal to zero, negative, missing, nonnumeric, or currency string. | Review fails closed with an observable-data reason. | Add validation matrix. |
| FHFA-09 | A four-unit property at $1,601,750 in a baseline county. | Review passes with the four-unit baseline; one unit must not be used. | Covered in Lakeview baseline fixture; add generic FHFA test. |
| FHFA-10 | Annual source replacement from 2026 to a future year. | UI, source guide, saved metadata, tests, and release notes reference the new year before enabling it. | Manual annual-refresh test. |

## 8. Lakeview National Review Screen

Lakeview combines active-sale/map-ready data, the user-directed stick-built one-to-four-unit property rule, state scope, and a unit-specific price proxy. Oregon supports local annual review-cap controls; Washington displays the bundled official county-and-unit FHFA value. In both states, the screen must state that listing price does not establish a loan amount, qualification, or approval.[4] [5]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| LKV-01 | Oregon single-family listing at exactly $832,750. | Default one-unit Oregon review passes. | Covered. |
| LKV-02 | Oregon single-family listing at $832,751. | Default review cap is exceeded; record stays out of Lakeview program set. | Covered. |
| LKV-03 | Change only Oregon’s two-unit local slider, then refresh the saved-list view. | Two-unit screen recalculates locally; the source snapshot and provider data remain unchanged. | UI source contract covered; add browser test. |
| LKV-04 | Alter the one-unit slider and inspect a duplex. | Duplex continues to use its own two-unit local cap. | Add browser test. |
| LKV-05 | Washington King County listing with a local Oregon slider value stored in the browser. | Washington ignores Oregon local sliders and uses its server-provided county/unit cap. | Covered. |
| LKV-06 | Washington listing with no usable county or no FIPS match. | Review remains unavailable/false rather than applying a statewide default. | Add negative test. |
| LKV-07 | Select Lakeview screen, then switch to `all`, `lmi`, `usda`, or `lmiUsda`. | Distinct marker styling and local price controls do not leak into other saved-list views. | Manual/UI test. |
| LKV-08 | Use a listing with a valid agent URL, phone, and email. | Popup uses safe external link functions, `noopener noreferrer`, telephone, and mail links only when valid. | UI contract covered. |
| LKV-09 | Use `javascript:`, data URL, malformed URL, malformed phone, and malformed email values in agent fields. | Popup renders no executable/untrusted link. | Add security UI test. |
| LKV-10 | Export Lakeview review results. | The export includes review metadata and a non-approval label; no unfiltered records appear. | Add export integration test. |

## 9. OHCS Flex Lending FirstHome Review Screen

The FirstHome screen is a two-check Oregon saved-list review: LMI geographic context plus an applicable OHCS county targeted/non-targeted price field. The targeted resolver must respect documented entire-county, city, and Census-tract detail. The OHCS county chart may list an area type as not applicable; that condition must remain unavailable rather than substituted.[1] [2]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| FHM-01 | Entire-county targeted fixture (for example, a documented fully targeted county). | Area type is targeted and targeted field is selected. | Covered for Coos metadata. |
| FHM-02 | Named city fixture matching the documented target-city name after case/whitespace normalization. | Area type is targeted and targeted price field is selected. | Add city-resolution test. |
| FHM-03 | Named tract fixture matching a documented code with leading zeros/separators. | Area type is targeted and targeted field is selected. | Covered for Benton tract scenario; add formatting variants. |
| FHM-04 | Same county, city/tract does not match target detail. | Area type is non-targeted; non-targeted field is selected. | Covered. |
| FHM-05 | Listing price exactly equals applicable targeted limit. | Price check passes. | Add exact-boundary case. |
| FHM-06 | Listing price one dollar above applicable non-targeted limit. | Price check fails. | Covered conceptually; add exact one-dollar boundary. |
| FHM-07 | Targeted field is explicitly not applicable/null. | Result is unavailable/false for that area type; other field is not substituted. | Covered for parsing; add resolver integration. |
| FHM-08 | LMI context passes but price is above cap. | Listing stays out of FirstHome program review set. | Add program-set test. |
| FHM-09 | Price passes but LMI context is false/unavailable. | Listing stays out of FirstHome program review set. | Add program-set test. |
| FHM-10 | Missing county, price, coordinates, or chart row. | Listing fails closed with a concise review reason. | Add validation matrix. |
| FHM-11 | Inspect saved metadata and export for an included record. | County, area type, price limit, targeted details, LMI context, and reason are traceable. | Add export integration test. |
| FHM-12 | Review label in popup/export. | Describes a narrow FirstHome review match only; never asserts property, borrower, lender, DPA, loan, or approval eligibility. | Manual copy review. |

## 10. Idaho Housing Tax-Exempt/MRB Review

The Idaho MRB screen uses the owner-supplied authorized 2026 IHFA county chart and evaluates listed price and county context only. Its targeted/non-targeted status is retained as source context; it is not a determination that the buyer receives a targeted-area exception or meets the program’s first-time-buyer, income, occupancy, property, or underwriting requirements.[7]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| IDMRB-01 | Ada County listing at $613,662. | Review passes; record exposes the authorized county value. | Covered. |
| IDMRB-02 | Ada County listing at $613,663. | Review fails for price only. | Covered. |
| IDMRB-03 | Lincoln County fixture. | Source targeted status is retained correctly in metadata. | Covered at parser level. |
| IDMRB-04 | Unknown Idaho county. | Review unavailable; no default state cap is used. | Add negative test. |
| IDMRB-05 | State other than Idaho with an Idaho county name. | Idaho MRB review is unavailable. | Add state-isolation test. |
| IDMRB-06 | Missing or invalid listed price. | Review fails closed; no price result is invented. | Add validation matrix. |
| IDMRB-07 | Replace chart with a newer authorized IHFA bulletin. | Effective/revision date, county row count, metadata, tests, source guide, and release note are updated together. | Manual refresh test. |
| IDMRB-08 | Read the popup and export for an included record. | Copy says “authorized county listed-price chart only” and explicitly excludes income, first-time status, targeted-area qualification, property eligibility, and approval. | UI contract covered; add exported-copy test. |

## 11. CalHFA MyHome Property Context

CalHFA MyHome is intentionally a California property-context review, not a price-cap filter. The current public material supplies property scope but no general sales-price limit; tests must prevent any future code or UI change from creating an invented price ceiling or borrower screen.[8]

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| CA-01 | California one-unit condominium with price above any FHFA value. | CalHFA MyHome property context remains review-ready and `priceScreenApplied` remains false. | Covered. |
| CA-02 | California one-unit PUD. | Included as published property context. | Add explicit test. |
| CA-03 | California one-unit manufactured home. | Included in current property-context screen only if supported by current source policy. | Add explicit source-backed test. |
| CA-04 | California duplex. | Excluded with one-unit reason. | Covered. |
| CA-05 | Oregon or Washington otherwise matching fixture. | CalHFA MyHome adapter is unavailable outside California. | Covered for Oregon; add Washington/Idaho. |
| CA-06 | UI and export review. | No price slider, no price-cap value, no income/borrower decision, and no approval language. | UI contract covered; add export check. |

## 12. Saved-List, Map, Popup, and Export Contracts

Each review screen must work against the current saved snapshot. Selecting an overlay must not issue a new Rentcast request, mutate the source listing, rewrite legacy overlay sets, or alter the protected dashboard integration. Program review sets are additive to the legacy `all`, `lmi`, `usda`, and `lmiUsda` sets.

| ID | Test procedure | Expected result | Current coverage |
|---|---|---|---|
| UI-01 | Load an existing snapshot and switch between every saved-list option. | No network call to Rentcast occurs after the snapshot loads. | Manual network inspection. |
| UI-02 | Compare legacy overlay-set keys before and after FirstHome/Lakeview/Idaho/CalHFA enrichment. | Legacy keys remain exactly `all`, `lmi`, `usda`, and `lmiUsda`. | Covered for FirstHome and Lakeview. |
| UI-03 | Build program review sets from a mixed-state snapshot. | Each program set contains only records whose corresponding review screen is `reviewReady`. | Covered for Lakeview and Idaho; add mixed-state integration test. |
| UI-04 | Select an overlay without any matching records. | Empty state names the review context without claiming an unavailable program result. | Add UI test. |
| UI-05 | Open map popups for matching and nonmatching listings. | Popup shows correct selected-screen context; no stale badge, cap, or reason survives from a prior overlay. | Manual UI test. |
| UI-06 | Render a listing with an unexpected object/array in a text field. | Escaping is preserved; no HTML/script content executes in popup, label, or export preview. | Add XSS regression test. |
| UI-07 | Inspect the expandable full Rentcast record. | It shows saved source data only, labels it as provider data, and does not alter classification. | UI contract covered; manual visual test. |
| UI-08 | Export each program review set. | Export contains the selected program’s source version, review reason, and narrow review metadata; excluded records are absent. | Add export schema tests. |
| UI-09 | Export the full saved list. | Program metadata remains additive; no field renaming breaks dashboard consumption. | Add compatibility schema test. |
| UI-10 | Verify the dashboard synchronization payload after adding program metadata. | Existing dashboard field names/legacy overlay sets remain unchanged; new data is additive only. | Add contract fixture. |

## 13. Negative, Security, and Disclosure Regression Tests

These tests protect the human-review boundary as well as the software boundary. Run them after every UI copy edit, source-data import, or changes to map/pop-up rendering.

| ID | Test procedure | Expected result |
|---|---|---|
| SAFE-01 | Search all UI strings, exported headers, and popup templates for `approved`, `eligible`, `qualified`, `guaranteed`, `fundable`, and `pre-approved`. | Any occurrence must be reviewed; prohibited conclusion language is absent from review-result states. |
| SAFE-02 | Submit a listing with no coordinates, no price, no county, or an unknown type. | Program review sets fail closed; UI explains the missing observable input without inventing a result. |
| SAFE-03 | Provide a county-like string designed to collide with another county. | Normalization never selects an unintended county/FIPS row. |
| SAFE-04 | Provide malformed external listing-agent website, email, or telephone values. | Only safe HTTP(S), `mailto:`, and `tel:` links are rendered; script/data URLs are not linked. |
| SAFE-05 | Corrupt or remove a source data file at runtime. | Relevant adapter reports unavailable; unrelated overlays and saved listings remain functional. |
| SAFE-06 | Introduce a future source date with an older underlying chart. | Source guide and metadata must not represent it as a current source; release is blocked pending reviewer correction. |
| SAFE-07 | Set a local Oregon Lakeview slider below/above the default. | The UI identifies it as a local review setting only; it does not alter stored source data, future snapshots, Washington caps, or exports as an official limit. |
| SAFE-08 | Compare a high listing price to a high FHFA county cap. | UI says the listed-price review passed or failed; it never calls the value the buyer’s maximum loan amount. |
| SAFE-09 | Attempt to use FirstHome, Idaho MRB, or CalHFA property context to decide borrower treatment. | The source guide, popup, and export disclose the missing borrower/program facts and require human/approved-lender review. |
| SAFE-10 | Test a stale cache after source refresh. | The UI distinguishes saved-snapshot date from source effective date and requires a fresh Live Pull/review when appropriate. |

## 14. Manual Acceptance Scenarios

The following scenarios should be completed by an owner or compliance reviewer using a non-borrower test listing set before a material release. Record the tester, date, GeoSphere commit, dataset version, browser, and overlay selected.

| Scenario | Steps | Acceptance criterion |
|---|---|---|
| Oregon FirstHome | Load Oregon snapshot, select FirstHome, inspect a targeted, non-targeted, over-cap, no-LMI, and missing-data listing. | Area context, applicable county field, LMI context, and review reason are correct; no qualification language appears. |
| Washington Lakeview | Load Washington snapshot containing a high-cost and baseline county, select Lakeview, and compare one-unit/two-unit listings. | Exact county-and-unit FHFA cap is used; Oregon sliders are hidden/ignored for Washington. |
| Oregon Lakeview | Load Oregon snapshot, adjust one unit-specific local slider, then inspect 1–4 unit fixtures. | Only the matching unit-class local screen changes; saved source data is unchanged. |
| Idaho MRB | Load Idaho snapshot and compare at-cap, one-dollar-over, known-targeted-context, unknown-county, and missing-price listings. | IHFA county chart value and targeted status are visible as review context only; negative cases fail closed. |
| California MyHome | Load California snapshot and inspect condo/PUD/single-family, manufactured, and duplex fixtures. | Published property-context categories behave as documented; no price cap appears. |
| Export verification | Export each selected review set and full saved list. | Selected records, metadata, narrow labels, and source dates match the map; unsupported conclusions do not appear. |
| Source refresh drill | Replace a test copy of FHFA, OHCS, or IHFA data with an approved newer fixture. | Parser, counts, UI guide, source date, regression suite, and release note all update together. |

## 15. Coverage Backlog and Definition of Done

The existing automated suite verifies core parser behavior, key at-cap/over-cap cases, Lakeview property exclusions, county-specific Washington values, Idaho chart membership, and required saved-list UI copy. Before declaring the schema fully regression-complete, add the following automated cases: LMI polygon/boundary behavior; county normalization matrix; generic FHFA one-to-four-unit boundaries; FirstHome city and null-field resolver integration; malformed local input; safe-link/XSS tests; selected-overlay export schema; full saved-list/dashboard compatibility; and stale-source refresh behavior.

The checklist is complete for a release only when the release gates in Section 1 pass, every applicable test row has recorded evidence, all failures are triaged, and a designated reviewer signs off on the review-only language. Any source update reopens the applicable data, county-limit, adapter, UI, export, and governance rows.

## References

[1]: https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/firsthome-purchase-price-limits.aspx "OHCS FirstHome Purchase Price Limits"
[2]: https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/firsthome-targeted-areas.aspx "OHCS FirstHome Household Targeted Areas"
[3]: https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do?pageAction=sfp "USDA Property and Income Eligibility"
[4]: https://www.lakeviewcorrespondent.com/lakeview-national-2/ "Lakeview National"
[5]: https://www.fhfa.gov/data/conforming-loan-limit "FHFA Conforming Loan Limit Values"
[6]: https://singlefamily.fanniemae.com/originating-underwriting/loan-limits "Fannie Mae Loan Limits"
[7]: https://mediaserve.ihfa.org/?q=377 "Idaho Housing Tax-Exempt Program Bulletin and Limits"
[8]: https://www.calhfa.ca.gov/homeownership/limits/index.htm "CalHFA Homeownership Program Limits"
