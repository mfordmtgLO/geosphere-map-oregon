# FirstHome Purchase-Price Screening Source Notes

The bundled `oregon_firsthome_purchase_price_limits.json` was supplied by the project owner on 2026-08-20. Its metadata identifies the source as Oregon Housing and Community Services, **FirstHome Purchase Price Limits**, retrieved on 2026-08-19. The source URL is:

https://www.oregon.gov/ohcs/homeownership/lenders-real-estate-professionals/Pages/firsthome-purchase-price-limits.aspx?wp3617=l:100

The source covers 36 Oregon counties and distinguishes targeted and non-targeted maximum purchase prices. A null price limit means the official source lists that area type as **Not applicable**.

## GeoSphere Implementation Boundary

The GeoSphere saved-listing export consumed by the first-time-homebuyer dashboard retains the existing `overlaySets.all`, `overlaySets.lmi`, `overlaySets.usda`, and `overlaySets.lmiUsda` names and membership rules. FirstHome data is attached only as additive `overlayEligibility.firstHome` metadata. The map’s FirstHome view is a local LMI-plus-price screening tool and does not represent underwriting approval, listing availability, or a modification of the protected dashboard sync contract.
