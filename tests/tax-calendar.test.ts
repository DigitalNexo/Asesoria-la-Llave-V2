import test from "node:test";
import assert from "node:assert/strict";
import { MemStorage } from "../server/storage";
import { calculateDerivedFields } from "../server/services/tax-calendar-service";

const DAY_MS = 24 * 60 * 60 * 1000;

test("listTaxCalendar filtra por año correctamente", async () => {
  const storage = new MemStorage();

  await storage.createTaxCalendar({
    modelCode: "303",
    period: "1T",
    year: 2025,
    startDate: "2025-04-01",
    endDate: "2025-04-20",
    active: true,
  });

  await storage.createTaxCalendar({
    modelCode: "111",
    period: "1T",
    year: 2024,
    startDate: "2024-04-01",
    endDate: "2024-04-20",
    active: true,
  });

  const results = await storage.listTaxCalendar({ year: 2025 });
  assert.equal(results.length, 1);
  assert.equal(results[0].year, 2025);
  assert.equal(results[0].modelCode, "303");
});

test("calculateDerivedFields devuelve estado y contadores coherentes", () => {
  const now = new Date();

  const pendingStart = new Date(now.getTime() + 10 * DAY_MS);
  const pendingEnd = new Date(now.getTime() + 20 * DAY_MS);
  const pending = calculateDerivedFields(pendingStart, pendingEnd);
  assert.equal(pending.status, "PENDIENTE");
  assert.ok(typeof pending.daysToStart === "number" && pending.daysToStart > 0);
  assert.equal(pending.daysToEnd, null);

  const openStart = new Date(now.getTime() - 3 * DAY_MS);
  const openEnd = new Date(now.getTime() + 7 * DAY_MS);
  const open = calculateDerivedFields(openStart, openEnd);
  assert.equal(open.status, "ABIERTO");
  assert.equal(open.daysToStart, null);
  assert.ok(typeof open.daysToEnd === "number" && open.daysToEnd > 0);

  const closedStart = new Date(now.getTime() - 20 * DAY_MS);
  const closedEnd = new Date(now.getTime() - 5 * DAY_MS);
  const closed = calculateDerivedFields(closedStart, closedEnd);
  assert.equal(closed.status, "CERRADO");
  assert.equal(closed.daysToStart, null);
  assert.equal(closed.daysToEnd, null);
});

test("cloneTaxCalendarYear duplica periodos al año siguiente", async () => {
  const storage = new MemStorage();

  await storage.createTaxCalendar({
    modelCode: "390",
    period: "ANUAL",
    year: 2025,
    startDate: "2026-01-01",
    endDate: "2026-01-30",
    active: true,
  });

  const clones = await storage.cloneTaxCalendarYear(2025);
  assert.equal(clones.length, 1);

  const clone = clones[0];
  assert.equal(clone.year, 2026);
  assert.equal(clone.modelCode, "390");
  assert.equal(clone.period, "ANUAL");
  assert.equal(new Date(clone.startDate).getFullYear(), 2027);
  assert.equal(new Date(clone.endDate).getFullYear(), 2027);
});
