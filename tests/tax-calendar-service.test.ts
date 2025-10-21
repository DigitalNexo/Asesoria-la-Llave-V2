import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTaxPeriodStatus,
  calculateDerivedFields,
  withDerivedFields,
} from "../server/services/tax-calendar-service";

const DAY = 24 * 60 * 60 * 1000;

test("calculateTaxPeriodStatus devuelve PENDIENTE antes del inicio", () => {
  const now = new Date();
  const start = new Date(now.getTime() + DAY);
  const end = new Date(now.getTime() + 2 * DAY);
  assert.equal(calculateTaxPeriodStatus(start, end), "PENDIENTE");
});

test("calculateTaxPeriodStatus devuelve ABIERTO entre fechas inclusive", () => {
  const now = new Date();
  const start = new Date(now.getTime() - DAY);
  const end = new Date(now.getTime() + DAY);
  assert.equal(calculateTaxPeriodStatus(start, end), "ABIERTO");
  assert.equal(calculateTaxPeriodStatus(start, now), "ABIERTO");
});

test("calculateTaxPeriodStatus devuelve CERRADO después del fin", () => {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * DAY);
  const end = new Date(now.getTime() - DAY);
  assert.equal(calculateTaxPeriodStatus(start, end), "CERRADO");
});

test("calculateDerivedFields calcula daysToStart y daysToEnd redondeados", () => {
  const now = new Date();
  const start = new Date(now.getTime() + 1.4 * DAY);
  const end = new Date(now.getTime() + 3.2 * DAY);
  const derived = calculateDerivedFields(start, end);
  assert.equal(derived.status, "PENDIENTE");
  assert.equal(derived.daysToStart, 2);
  assert.equal(derived.daysToEnd, null);
});

test("withDerivedFields adjunta estado y cuenta atrás", () => {
  const now = new Date();
  const entry = {
    id: "test",
    startDate: new Date(now.getTime() - DAY),
    endDate: new Date(now.getTime() + DAY),
  };
  const enriched = withDerivedFields(entry);
  assert.equal(enriched.status, "ABIERTO");
  assert.equal(enriched.daysToStart, null);
  assert.ok(typeof enriched.daysToEnd === "number");
});

