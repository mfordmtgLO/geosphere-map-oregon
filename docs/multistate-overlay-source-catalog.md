# Multi-State GeoSphere Overlay Source Catalog

## Scope and review-only boundary

This catalog separates data that can be used to screen a public sale listing from borrower, loan, and underwriting criteria that a Rentcast-backed map cannot determine. Every overlay must remain a review aid, preserve the source date and URL, and avoid presenting an automated approval, eligibility, loan amount, or pricing decision.

## Cross-state conventional-limit data

FHFA publishes a 2026 all-counties CSV that provides one-to-four-unit conforming loan-limit values by county and county equivalent. Fannie Mae directs lenders to the applicable county or MSA lookup value rather than applying a generic high-cost ceiling to establish a loan amount. GeoSphere may use the county and unit value only as an owner-configured listing-price review proxy, never as a final loan amount or approval.

| Data family | Official source | GeoSphere use | Refresh expectation |
|---|---|---|---|
| 2026 county conforming loan limits | [FHFA all-counties CSV](https://www.fhfa.gov/document/d/cll/fullcountyloanlimitlist2026_hera-based_final_flat.csv) | County- and unit-specific listing-price review context | Check and replace at each annual FHFA publication. |
| Fannie Mae conventional loan limits | [Fannie Mae Loan Limits](https://singlefamily.fanniemae.com/originating-underwriting/loan-limits) | Disclosure and county-lookup boundary | Review annually with FHFA data. |

## Washington housing-program source findings

Washington State Housing Finance Commission’s current homebuyer site describes Home Advantage, House Key Opportunity, and associated down-payment-assistance programs. Those materials contain requirements that cannot be inferred from property data, including income, owner occupancy, first-time-buyer status, need assessments, education, and program-specific conditions. A property map may only use explicitly published geographic or acquisition-cost criteria after the exact program and current effective date are captured.

| Data family | Official source | Property-screenable data | Non-screenable conditions | Current implementation status |
|---|---|---|---|---|
| House Key Opportunity | [WSHFC acquisition-cost announcement](https://heretohome.org/blog/acquisition-cost-limits-increased-for-house-key-opportunity/) | County group, target/non-target purchase-price cap | Income, occupancy, first-time-buyer/target-area status, loan eligibility, education, underwriting | Conditional: source effective September 15, 2025; recheck against the current manual before implementation. |
| Home Advantage and DPA programs | [WSHFC DPA information](https://heretohome.org/downpayment-assistance/) | No standalone statewide listing-price cap found in reviewed material | Income, occupancy, needs assessment, disability or veteran status, education, borrower/program eligibility | Research-required before a price overlay. |

## Washington Lakeview National review configuration

The Lakeview National review overlay can use the FHFA’s 2026 Washington **county** and **unit** values for a listing-price proxy, subject to the existing for-sale, stick-built, one-to-four-unit policy. The relevant value must come from the county file—not the statutory maximum high-cost ceiling—because Washington counties can have baseline, high-balance, or ceiling values.

## Idaho housing-program source findings

Idaho Housing states that its assistance can be up to 8% of the sales price and that household income must be at or below $170,000, with program-specific variations. It directs partners to a county income-and-sales-price chart. Income, residency, credit and employment history, homebuyer education, borrower funds, and final product eligibility are not screenable from a Rentcast listing. Before adding an Idaho Housing price screen, GeoSphere must obtain and version the current official county sales-price chart rather than infer a cap from assistance percentages or conforming limits.

For the First Loan Tax-Exempt / Mortgage Revenue Bond program, the authorized IHFA Program Bulletin 2026-6 and linked [Income Limits for First Loan — Tax-Exempt Only chart](https://mediaserve.ihfa.org/?q=377) confirm that both income and sales-price limits are county-specific. The chart’s sales-price rows are effective **May 6, 2026**, with a stated revision date of **June 3, 2026**; the bulletin states that new limits apply to reservations on or after May 1, 2026. GeoSphere stores the 44 county sales-price rows and their targeted/non-targeted chart label as a versioned review dataset. Its statutory methodology—90% of the area median purchase price, or 110% in federally designated targeted areas—does not provide a safe substitute for the actual dated county matrix. The map does not determine a borrower’s income, first-time status, targeted-area qualification, property eligibility, occupancy, lender requirements, underwriting, or approval.

| Data family | Official source | Property-screenable data | Non-screenable conditions | Current implementation status |
|---|---|---|---|---|
| Idaho Housing DPA | [Idaho Housing DPA information](https://www.idahohousing.com/homebuyers/down-payment-closing-cost-assistance/) | Listing price only, if paired with an authoritative current cap | Income, funds, education, credit, residency, product approval | Conditional: public page contains no county sales-price data. |
| Idaho Housing First Loan Tax-Exempt/MRB | [IHFA 2026 Tax-Exempt county chart](https://mediaserve.ihfa.org/?q=377) | County listed price at/below the dated chart value, with chart-row targeted/non-targeted context | Income, credit, employment, education, residency, first-time status, targeted-area qualification, property eligibility, occupancy, underwriting and approval | Active as a May 6, 2026 source-versioned review adapter only. |

## California housing-program source findings

CalHFA states that, effective June 1, 2020, it no longer has general sales-price limits for eligible properties. Therefore, GeoSphere must not manufacture a statewide CalHFA price-cap overlay. The same page directs users to county income limits and the applicable first-mortgage program loan limits. Its MyHome materials identify a single-family one-unit residence—including approved condominium/PUDs—and permit manufactured housing; this differs from the owner-defined Lakeview property policy and must not be reused for it. California Dream For All references a voucher, first-generation status, residency, first-time-homebuyer status, county income limits, and its own program process; none are determined by property listing data alone.

| Data family | Official source | Property-screenable data | Non-screenable conditions | Current implementation status |
|---|---|---|---|---|
| CalHFA general programs | [CalHFA Income and Sales Price Limits](https://www.calhfa.ca.gov/homeownership/limits/index.htm) | No general sales-price cap | County income limit, first-mortgage rules, borrower/program eligibility | Ready only for an information/disclosure adapter; no price filter. |
| CalHFA MyHome | [CalHFA MyHome](https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm) | Property type; must use its stated one-unit/approved-condo-PUD rule and not the Lakeview rule | First-time status, occupancy, counseling, income, lender guidelines | Conditional: property-type-only review label, if enabled. |
| California Dream For All | [CalHFA Dream For All](https://www.calhfa.ca.gov/dream/) | None without a program-specific property rule | Voucher, first-generation status, residency, income, first-time status, education and approval | Information-only; do not add a property screen. |

## Reusable geographic overlay source findings

The USDA property-eligibility map can be used as a geographic review source only if GeoSphere captures the official area data or applies an address-level result with an observed source date. USDA expressly states that its map is not a final property-eligibility determination; final determination is made after a complete application. The current static Oregon USDA boundary data must therefore be replaced with a source-versioned, state-specific adapter before Washington, Idaho, or California results are represented.

The FFIEC 2026 Census Tract List covers all U.S. census tracts and includes each tract’s income level. However, FFIEC states that its data supports HMDA and CRA analysis and may be unsuitable for other analytical purposes. GeoSphere may continue to describe this as an **FFIEC LMI context overlay** rather than call a listing or borrower eligible for a lending program. The 2026 tract list is stated to be identical to the 2025 tract list; source version and tract-boundary year must be recorded for every state adapter.

| Data family | Official source | GeoSphere use | Mandatory limitation |
|---|---|---|---|
| USDA Single Family Property Eligibility | [USDA Eligibility Map](https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do?pageAction=sfp) | Geographic context after state data is sourced and versioned | USDA, not GeoSphere, makes the final property determination. |
| FFIEC Census Tract List | [2026 FFIEC Tract List](https://www.ffiec.gov/sites/default/files/data/census/CensusTractList2026.xlsx) | LMI context by tract for all supported states | Use as HMDA/CRA geographic context only; never a program eligibility result. |

## Implementation governance contract

The shared engine must treat a program overlay as a versioned **review adapter**, not a general-purpose eligibility engine. A saved listing may retain the reviewed source identifier, source year or effective date, relevant state/county/tract context, individual property screen outcomes, and a human-readable reason. It must not retain a positive conclusion about a borrower or create a “qualified” label.

| Adapter class | May filter or label | Must not determine | Required provenance and refresh rule |
|---|---|---|---|
| FHFA county conforming-limit review | Property county, verified unit count, listed price compared with the exact annual county/unit source value | Loan amount, DTI, LTV, lender eligibility, program eligibility, pricing or approval | Preserve FHFA year, county FIPS, source URL, and regenerate after annual FHFA publication. |
| FFIEC LMI context | Published tract income level with the exact FFIEC tract dataset year | Borrower income, program eligibility, credit decision, targeted-area qualification | Preserve FFIEC tract-list year and boundary version; refresh when FFIEC issues a new list. |
| USDA geography context | Official source-versioned geographic area result | Final property eligibility, income, household size, loan approval or guarantee | Preserve USDA source date and display its final-determination disclaimer; do not infer results from unversioned polygons. |
| State HFA purchase-price screen | Only a current, program-specific official geographic or purchase-price rule that has been captured and tested | Income, occupancy, first-time-buyer status, education, voucher, needs assessment, underwriting or approval | Record agency, program, effective date, source URL, and state-specific property logic; disable when stale or incomplete. |
| Lakeview National listing review | Owner-authorized state configuration, active sale, confirmed property type/unit policy, and official county/unit price-proxy context | Product availability, borrower or property eligibility, combined financing amount, lender approval or underwriting | Require current approved Lakeview matrix verification for each enabled state and verify each annual FHFA source refresh. |

## State activation status

| State | Lakeview county-cap data | Lakeview state configuration | State HFA price-screen source status | Next safe implementation step |
|---|---|---|---|---|
| Oregon | Complete 2026 FHFA county data; all counties use the baseline shown in the source | Existing owner-authorized review configuration | FirstHome source versioned separately | Preserve current behavior while migrating to shared adapter. |
| Washington | Complete 2026 FHFA county data, including county-specific values | Owner requested review configuration; show source-derived county/unit cap and require product-matrix confirmation | House Key price rules available only in a dated announcement; manual verification required | Enable Lakeview county-cap review and retain the matrix-confirmation disclosure. |
| Idaho | Complete 2026 FHFA county data available for future adapter | Not enabled pending product-matrix confirmation | Authorized IHFA Tax-Exempt/MRB chart versioned, effective May 6, 2026 | Show the county listed-price review with the mandatory non-eligibility disclosure; refresh when IHFA replaces the chart. |
| California | Complete 2026 FHFA county data available for future adapter | Not enabled pending product-matrix confirmation | CalHFA states that it has no general sales-price limit | Add information adapter only; do not manufacture a CalHFA price cap. |

## References

[1] [FHFA Conforming Loan Limit Values](https://www.fhfa.gov/data/conforming-loan-limit), accessed 2026-08-28.

[2] [Fannie Mae Loan Limits](https://singlefamily.fanniemae.com/originating-underwriting/loan-limits), accessed 2026-08-28.

[3] [WSHFC Downpayment Assistance](https://heretohome.org/downpayment-assistance/), accessed 2026-08-28.

[4] [WSHFC House Key Opportunity Acquisition Cost Limits](https://heretohome.org/blog/acquisition-cost-limits-increased-for-house-key-opportunity/), accessed 2026-08-28.

[5] [Idaho Housing Down Payment Assistance](https://www.idahohousing.com/homebuyers/down-payment-closing-cost-assistance/), accessed 2026-08-28.

[6] [Idaho Housing Borrower Income Limits](https://www.idahohousing.com/partners/lenders-realtors/borrower-income-limits/), accessed 2026-08-28.

[7] [CalHFA Income and Sales Price Limits](https://www.calhfa.ca.gov/homeownership/limits/index.htm), accessed 2026-08-28.

[8] [CalHFA MyHome Assistance Program](https://www.calhfa.ca.gov/homebuyer/programs/myhome.htm), accessed 2026-08-28.

[9] [California Dream For All Shared Appreciation Loan](https://www.calhfa.ca.gov/dream/), accessed 2026-08-28.

[10] [USDA Rural Development Property Eligibility](https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do?pageAction=sfp), accessed 2026-08-28.

[11] [FFIEC Census and Demographic Data Overview](https://www.ffiec.gov/data/census/overview), accessed 2026-08-28.

[12] [2026 FFIEC Census Tract List](https://www.ffiec.gov/sites/default/files/data/census/CensusTractList2026.xlsx), accessed 2026-08-28.

[13] [Idaho Housing Tax-Exempt First Loan Income and Sales Price Limits](https://mediaserve.ihfa.org/?q=377), chart effective 2026-05-06 and revised 2026-06-03; accessed 2026-08-28.
