import assert from "node:assert/strict";
import test from "node:test";
import { buildOverlaySets, buildProgramReviewSets, getFhfaCountyLimitReview, getFirstHomeScreening, getLakeviewNationalPropertyScreening, getLakeviewNationalReviewScreening, isUsdaEligibleOutsideIneligibleAreas, LAKEVIEW_NATIONAL_OREGON_2026_ONE_UNIT_REVIEW_CAP, parseFhfaPacificCountyLimits, parseFirstHomePurchaseLimits, parseLmiTractLookup } from "./overlay-classification.js";

test("parses the project's single-quoted LMI tract lookup", () => {
  const lookup = parseLmiTractLookup(`
    const oregonLMITracts = {
      // Low income tract
      '41039003900': 'Low',
      '41005021601': 'Moderate'
    };
  `);

  assert.deepEqual(lookup, {
    "41039003900": "Low",
    "41005021601": "Moderate",
  });
});

test("treats locations outside USDA shaded ineligible areas as eligible", () => {
  const entry = {
    stateFips: "41",
    displayStateFips: [],
    bounds: { minLng: -124, maxLng: -123, minLat: 43, maxLat: 44 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-124, 43], [-123, 43], [-123, 44], [-124, 44], [-124, 43]]],
    },
  };

  assert.equal(isUsdaEligibleOutsideIneligibleAreas([-123.5, 43.5], [entry], "41"), false);
  assert.equal(isUsdaEligibleOutsideIneligibleAreas([-124.5, 43.5], [entry], "41"), true);
});

test("parses official FirstHome county limits and preserves not-applicable values", () => {
  const limits = parseFirstHomePurchaseLimits(JSON.stringify({
    metadata: { program: "Oregon FirstHome" },
    county_price_limits: [{
      county: "Coos",
      non_targeted_price_limit_usd: 566354,
      targeted_price_limit_usd: null,
      targeted_area_details: "No targeted areas",
    }],
  }));
  assert.equal(limits.counties.get("coos").nonTargetedPriceLimit, 566354);
  assert.equal(limits.counties.get("coos").targetedPriceLimit, null);
});

test("screens LMI listings against the correct targeted or non-targeted FirstHome limit", () => {
  const limits = parseFirstHomePurchaseLimits(JSON.stringify({
    county_price_limits: [{
      county: "Benton",
      non_targeted_price_limit_usd: 643743,
      targeted_price_limit_usd: 786797,
      targeted_area_details: "Census tract 0011.01",
    }],
  }));
  const targeted = getFirstHomeScreening({ county: "Benton", city: "Corvallis", price: 700000 }, { tractCode: "001101" }, limits, "41");
  const nonTargeted = getFirstHomeScreening({ county: "Benton", city: "Corvallis", price: 700000 }, { tractCode: "002000" }, limits, "41");
  assert.deepEqual(targeted, {
    available: true,
    priceEligible: true,
    lmiEligible: true,
    areaType: "targeted",
    priceLimit: 786797,
    county: "Benton",
    targetedAreaDetails: "Census tract 0011.01",
  });
  assert.equal(nonTargeted.areaType, "non_targeted");
  assert.equal(nonTargeted.priceLimit, 643743);
  assert.equal(nonTargeted.priceEligible, false);
  assert.equal(nonTargeted.lmiEligible, false);
});

test("adds FirstHome metadata without changing the existing dashboard sync overlay-set names", async () => {
  const overlaySets = await buildOverlaySets([{
    id: "coos-snapshot",
    county: "Coos",
    city: "Coos Bay",
    state: "OR",
    price: 600000,
  }], "OR");
  assert.deepEqual(Object.keys(overlaySets).sort(), ["all", "lmi", "lmiUsda", "usda"]);
  assert.equal(overlaySets.all.length, 1);
  assert.equal(overlaySets.all[0].overlayEligibility.firstHome.county, "Coos");
  assert.equal(overlaySets.all[0].overlayEligibility.firstHome.areaType, "targeted");
  assert.equal(overlaySets.all[0].overlayEligibility.firstHome.priceLimit, 692211);
  assert.equal(overlaySets.all[0].overlayEligibility.firstHome.priceEligible, true);
});

test("marks only map-ready Oregon sale listings for Lakeview National review without implying qualification", () => {
  assert.deepEqual(getLakeviewNationalReviewScreening({ state: "OR", formattedAddress: "123 Main St", latitude: 44.1, longitude: -123.1 }, "OR"), {
    available: true,
    reviewReady: false,
    screenVersion: "rentcast-active-sale-county-cap-stick-built-one-to-four-v4",
    state: "OR",
    county: null,
    countyFips: null,
    countyLimitSourceYear: null,
    usesCountySpecificCap: false,
    defaultListingPriceCap: 832750,
    priceWithinDefaultCap: false,
    property: { propertyType: null, unitCount: null, manufactured: false, stickBuiltOneToFour: false, reason: "Property type is not an explicitly supported stick-built one-to-four-unit residential category." },
    reason: "Oregon listing needs a usable listed price for the review cap.",
  });
  assert.equal(LAKEVIEW_NATIONAL_OREGON_2026_ONE_UNIT_REVIEW_CAP, 832750);
  assert.equal(getLakeviewNationalReviewScreening({ state: "OR", propertyType: "Single Family", formattedAddress: "123 Main St", latitude: 44.1, longitude: -123.1, price: 832750 }, "OR").reviewReady, true);
  assert.equal(getLakeviewNationalReviewScreening({ state: "OR", propertyType: "Single Family", formattedAddress: "123 Main St", latitude: 44.1, longitude: -123.1, price: 832751 }, "OR").priceWithinDefaultCap, false);
  assert.equal(getLakeviewNationalReviewScreening({ state: "WA", propertyType: "Single Family", formattedAddress: "123 Main St", latitude: 47.6, longitude: -122.3, price: 600000 }, "WA").reviewReady, false);
  assert.equal(getLakeviewNationalReviewScreening({ state: "OR", formattedAddress: "123 Main St" }, "OR").reviewReady, false);
});

test("parses official county data and applies the exact Washington 2026 county value by unit count", () => {
  const limits = parseFhfaPacificCountyLimits(JSON.stringify({
    metadata: { year: 2026 },
    states: {
      WA: { counties: [
        { county: "KING", fips: "53033", caps: { 1: 1063750, 2: 1361800, 3: 1646100, 4: 2045700 } },
        { county: "SPOKANE", fips: "53063", caps: { 1: 832750, 2: 1066250, 3: 1288800, 4: 1601750 } },
      ] },
    },
  }));
  const king = getLakeviewNationalReviewScreening({ state: "WA", county: "King County", propertyType: "Single Family", formattedAddress: "1 Pine St", latitude: 47.6, longitude: -122.3, price: 1063750 }, "WA", limits);
  assert.equal(king.reviewReady, true);
  assert.equal(king.defaultListingPriceCap, 1063750);
  assert.equal(king.countyFips, "53033");
  assert.equal(king.usesCountySpecificCap, true);
  const spokaneOverCap = getLakeviewNationalReviewScreening({ state: "WA", county: "Spokane", propertyType: "Duplex", formattedAddress: "1 Main St", latitude: 47.65, longitude: -117.4, price: 1066251 }, "WA", limits);
  assert.equal(spokaneOverCap.reviewReady, false);
  assert.equal(spokaneOverCap.priceWithinDefaultCap, false);
});

test("applies the bundled FHFA Washington county cap in the saved-list pipeline", async () => {
  const overlaySets = await buildOverlaySets([{
    id: "king-exact-cap",
    state: "WA",
    county: "King County",
    propertyType: "Single Family",
    formattedAddress: "1 Pine St",
    latitude: 47.6,
    longitude: -122.3,
    price: 1063750,
  }], "WA");
  const screening = overlaySets.all[0].overlayEligibility.lakeviewNational;
  assert.equal(screening.reviewReady, true);
  assert.equal(screening.county, "KING");
  assert.equal(screening.countyFips, "53033");
  assert.equal(screening.defaultListingPriceCap, 1063750);
  assert.equal(buildProgramReviewSets(overlaySets.all).lakeviewNational[0].id, "king-exact-cap");
});

test("provides a multi-state FHFA county price review context without implying a loan decision", () => {
  const limits = parseFhfaPacificCountyLimits(JSON.stringify({
    states: {
      ID: { counties: [{ county: "TETON", fips: "16081", caps: { 1: 1249125, 2: 1599375, 3: 1933200, 4: 2402625 } }] },
      CA: { counties: [{ county: "LOS ANGELES", fips: "06037", caps: { 1: 1249125, 2: 1599375, 3: 1933200, 4: 2402625 } }] },
    },
  }));
  const idaho = getFhfaCountyLimitReview({ state: "ID", county: "Teton County", propertyType: "Duplex", price: 1599375 }, "ID", limits);
  const california = getFhfaCountyLimitReview({ state: "CA", county: "Los Angeles", propertyType: "Single Family", price: 1249126 }, "CA", limits);
  assert.equal(idaho.reviewReady, true);
  assert.equal(idaho.priceCap, 1599375);
  assert.equal(california.reviewReady, false);
  assert.equal(california.priceWithinCap, false);
  assert.match(california.reason, /Listed price is above/);
});

test("includes only explicitly supported one-to-four-unit stick-built categories and excludes manufactured homes", () => {
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Single Family" }).stickBuiltOneToFour, true);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Duplex" }).unitCount, 2);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Multi-Family", units: 4 }).stickBuiltOneToFour, true);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Multi-Family", units: 5 }).stickBuiltOneToFour, false);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Manufactured", landLease: false }).manufactured, true);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Single Family", landLease: true }).stickBuiltOneToFour, false);
  assert.equal(getLakeviewNationalPropertyScreening({ propertyType: "Condo" }).stickBuiltOneToFour, false);
});

test("derives a separate Lakeview National exportable review set while preserving the legacy overlay-set names", async () => {
  const overlaySets = await buildOverlaySets([
    { id: "map-ready", state: "OR", county: "Coos", city: "Coos Bay", propertyType: "Single Family", formattedAddress: "1 Bay Ave", price: 400000, latitude: 43.36, longitude: -124.21 },
    { id: "four-unit-at-cap", state: "OR", county: "Coos", city: "Coos Bay", propertyType: "Fourplex", formattedAddress: "4 Bay Ave", price: 1601750, latitude: 43.37, longitude: -124.22 },
    { id: "four-unit-over-cap", state: "OR", county: "Coos", city: "Coos Bay", propertyType: "Fourplex", formattedAddress: "5 Bay Ave", price: 1601751, latitude: 43.38, longitude: -124.23 },
    { id: "manufactured", state: "OR", county: "Coos", city: "Coos Bay", propertyType: "Manufactured", formattedAddress: "6 Bay Ave", price: 300000, latitude: 43.39, longitude: -124.24 },
    { id: "missing-coordinates", state: "OR", county: "Coos", city: "Coos Bay", propertyType: "Single Family", formattedAddress: "2 Bay Ave", price: 400000 },
  ], "OR");
  assert.deepEqual(Object.keys(overlaySets).sort(), ["all", "lmi", "lmiUsda", "usda"]);
  const programReviewSets = buildProgramReviewSets(overlaySets.all);
  assert.deepEqual(programReviewSets.lakeviewNational.map((listing) => listing.id), ["map-ready", "four-unit-at-cap"]);
  assert.equal(programReviewSets.lakeviewNational[0].overlayEligibility.lakeviewNational.reviewReady, true);
});
