import test from "node:test";
import assert from "node:assert/strict";
import { toIsoDate } from "../client/src/lib/date-utils";

test("toIsoDate transforma YYYY-MM-DD a ISO", () => {
  const result = toIsoDate("2025-10-01");
  assert.ok(result);
  assert.equal(result, "2025-10-01T00:00:00.000Z");
});

test("toIsoDate interpreta DD/MM/YYYY a ISO", () => {
  const result = toIsoDate("15/07/2025");
  assert.equal(result, "2025-07-15T00:00:00.000Z");
});

test("toIsoDate acepta espacios y devuelve null en formato inválido", () => {
  assert.equal(toIsoDate("   "), null);
  assert.equal(toIsoDate("2025-13-01"), null);
  assert.equal(toIsoDate("Texto libre"), null);
});

