import assert from "node:assert/strict";
import test from "node:test";
import { buildOverlaySets, getFirstHomeScreening, isUsdaEligibleOutsideIneligibleAreas, parseFirstHomePurchaseLimits, parseLmiTractLookup } from "./overlay-classification.js";

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
