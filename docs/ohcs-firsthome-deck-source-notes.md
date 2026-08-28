# OHCS Flex Lending FirstHome Deck Source Notes

## Official sources reviewed on 2026-08-28

The OHCS FirstHome Purchase Price Limits page explains that OHCS establishes targeted and non-targeted maximum purchase-price limits for qualified Flex Lending FirstHome households, consistent with IRS Code Section 143. The owner-supplied project dataset was retrieved from this official chart on 2026-08-19 and records 36 Oregon county rows.

The OHCS targeted-area page directs a reviewer to use the FFIEC geocoding tool, note the property county and Census tract, and check the applicable targeted-area chart. It states that target-area treatment may provide higher income limits, higher purchase-price caps, and expanded access for prior homeowners, but those borrower and program conditions are outside a Rentcast listing screen.

The OHCS FirstHome Property Eligibility Manual was updated August 15, 2026. It limits the product to residential real estate in Oregon; identifies eligible one-unit single-family residences, condominiums, townhomes, PUDs, manufactured homes on real property, community land trusts, and leaseholds; and identifies multiplexes, properties with ADUs, and manufactured homes classified as personal property as ineligible. It describes targeted areas as Qualified Census Tracts and notes that the program publishes targeted and non-targeted lists by county.

The OHCS Flex Lending homebuyer page describes FirstHome and NextStep as first-mortgage loans that may be paired with OHCS DPA. It also states that program participation occurs through approved mortgage lenders and may include homebuyer education requirements.

## GeoSphere filter behavior shown in the deck

GeoSphere’s existing FirstHome screen is an Oregon-only local cache review. It reads the saved listing’s location and county, then uses the current Oregon LMI spatial boundary and FirstHome county chart. It determines a targeted context by the documented entire-county, city, or Census-tract detail; selects the corresponding targeted or non-targeted price-limit field; then compares the listed price. The visible FirstHome set requires both LMI context and a listed price at or below a usable applicable FirstHome limit.

This is a map review aid only. It does not determine borrower income, first-time status, previous-homeowner exception, targeted-area program qualification, property eligibility, DPA availability, lender participation, loan amount, credit, underwriting, or approval.

## Key project dataset examples

| County | Non-targeted price limit | Targeted price limit | Targeted-area details |
|---|---:|---:|---|
| Coos | $566,354 | $692,211 | Entire county is targeted. |
| Benton | $643,743 | $786,797 | Census tract 0011.01. |
| Multnomah | $733,987 | $897,096 | Listed Census tracts. |
| Crook | $752,036 | $919,155 | Census tract 9503.02. |
| Clackamas | $733,987 | Not applicable | No targeted areas. |

## References

1. https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/firsthome-purchase-price-limits.aspx
2. https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/firsthome-targeted-areas.aspx
3. https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/pages/first-home-program-manual-property-eligibility.aspx
4. https://www.oregon.gov/ohcs/homeownership/homebuyers/pages/flex-lending.aspx
5. https://www.ffiec.gov/geocode/default.aspx
