# Lakeview National Listing-Screening Basis

## Purpose and boundary

This GeoSphere feature may identify **for-sale listings in Oregon and owner-configured Washington review areas for Lakeview National review**. It is not an automated eligibility, pricing, underwriting, credit, income, debt-to-income, loan-to-value, or approval decision. The official Lakeview materials state that program references are offered to qualified residential lending institutions and are not applicable to the general public or individual consumers.[1]

## Official program facts captured for UI context

Lakeview describes The National as a down-payment-assistance Community Second program paired with a 30-year fixed-rate first-lien conventional mortgage. The published highlights state an interest-only second lien of up to 4%, a maximum income limit of 140% of AMI, maximum LTV/CLTV of 97%/105%, DTI at the lesser of 50% or AUS, and a minimum 660 FICO score.[1] [2]

The official quick-reference material directs users to the product matrix for eligible-state confirmation. The map therefore labels Oregon and the owner-configured Washington screen as **“available for Lakeview National review,”** never as approved or guaranteed eligible. Current Lakeview product-matrix confirmation remains required before operational use in each state.[2]

## Rentcast-screenable data contract

Rentcast sale-listing data can identify a listed property and preserve its available address, status, price, property facts, latitude/longitude, and listing-agent fields. It cannot determine borrower income relative to AMI, FICO, AUS findings, DTI, occupancy, complete LTV/CLTV, lender overlays, or the final program matrix result. Therefore, the Lakeview National saved-list filter is limited to an active/for-sale Oregon or owner-configured Washington listing with usable address and map coordinates. It deliberately applies **no invented purchase-price, income, credit, or borrower threshold**.

## Annual conventional-limit review cap

For the Oregon Lakeview screen, GeoSphere offers adjustable one-to-four-unit local listing-price review caps using the 2026 Fannie Mae/FHFA baseline amounts. For Washington, GeoSphere reads the exact 2026 FHFA county and unit value from the source’s all-counties file; it does not apply a generic state or statutory high-cost ceiling. For example, the official 2026 source lists King, Pierce, and Snohomish counties at $1,063,750 for one unit, not the contiguous-states ceiling of $1,249,125. FHFA identifies $832,750 as the 2026 one-unit baseline conforming loan limit for most U.S. counties, while Fannie Mae publishes the same contiguous-states baseline and describes its values as annual conventional loan limits.[3] [4]

The controls are intentionally not labeled “maximum loan amount.” A sales price does not establish the loan amount, and Fannie Mae specifically says high-cost ceilings should not be used to determine a loan amount. The shared Rentcast sale cache preserves values through the 2026 four-unit high-cost ceiling so the Lakeview review overlay can apply a separate one-, two-, three-, or four-unit cap after the property type and unit screen. Oregon’s local controls can be adjusted at the next annual FHFA update; Washington’s saved listings show their source-derived county cap. Neither mode modifies the source Rentcast snapshot or the protected dashboard export.

## Requested property review policy

The public Lakeview product summary reviewed for this implementation does not list property-type requirements. The GeoSphere Lakeview overlay nevertheless applies the owner-requested review policy of **for-sale, stick-built one-to-four-unit residential listings only**, excluding manufactured, mobile, modular, and land-lease homes. This is a map-screening configuration, not a verified Lakeview property guideline; it must be rechecked against the current approved product matrix before operational use.

## Required visible disclosure

> Lakeview National review screen only. Listing data does not verify borrower income, credit, AUS, DTI, LTV/CLTV, occupancy, program availability, property eligibility, or final underwriting. Confirm current product matrices and lender requirements before discussing eligibility or issuing a preapproval.

## References

[1] [Lakeview National product page](https://www.lakeviewcorrespondent.com/lakeview-national-2/), accessed 2026-08-28.

[2] [Lakeview National quick reference guide, February 2025](https://www.lakeviewcorrespondent.com/wp-content/uploads/2025/02/Updated-QRG-2025-2.5.25.pdf), accessed 2026-08-28.

[3] [FHFA 2026 conforming loan-limit values](https://www.fhfa.gov/data/conforming-loan-limit), accessed 2026-08-28.

[4] [Fannie Mae 2026 loan limits](https://singlefamily.fanniemae.com/originating-underwriting/loan-limits), accessed 2026-08-28.
