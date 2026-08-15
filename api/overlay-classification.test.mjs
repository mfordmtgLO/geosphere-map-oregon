import assert from "node:assert/strict";
import test from "node:test";
import { isUsdaEligibleOutsideIneligibleAreas, parseLmiTractLookup } from "./overlay-classification.js";

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
