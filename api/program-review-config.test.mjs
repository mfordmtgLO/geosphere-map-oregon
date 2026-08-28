import assert from "node:assert/strict";
import test from "node:test";
import { getProgramReviewConfiguration, getProgramReviewDefinition } from "./program-review-config.js";

test("publishes CalHFA MyHome and Idaho MRB review definitions to the live configuration engine", () => {
  const configuration = getProgramReviewConfiguration();
  const firstHome = getProgramReviewDefinition("firstHome");
  const calhfa = getProgramReviewDefinition("calhfaMyHome");
  const idaho = getProgramReviewDefinition("idahoMrbTaxExempt");

  assert.equal(configuration.version, "program-review-config-v1");
  assert.deepEqual(firstHome.states, ["OR"]);
  assert.equal(firstHome.localReviewOverrideSupported, true);
  assert.match(firstHome.disclosure, /FFIEC LMI tract context/i);
  assert.deepEqual(calhfa.states, ["CA"]);
  assert.match(calhfa.disclosure, /no general sales-price cap/i);
  assert.deepEqual(idaho.states, ["ID"]);
  assert.match(idaho.disclosure, /authorized 2026 county listed-price chart/i);
  assert.deepEqual(configuration.programs.map((program) => program.id), [
    "firstHome",
    "fhfaCountyLimit",
    "calhfaMyHome",
    "idahoMrbTaxExempt",
    "lakeviewNational",
  ]);
});
