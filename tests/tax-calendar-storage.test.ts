import test from "node:test";
import assert from "node:assert/strict";
import { MemStorage } from "../server/storage";

test("MemStorage.listTaxCalendar filtra por año, modelo y activo", async () => {
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
    modelCode: "303",
    period: "2T",
    year: 2024,
    startDate: "2024-07-01",
    endDate: "2024-07-20",
    active: false,
  });

  const yearFiltered = await storage.listTaxCalendar({ year: 2025 });
  assert.equal(yearFiltered.length, 1);
  assert.equal(yearFiltered[0].period, "1T");

  const modelFiltered = await storage.listTaxCalendar({ modelCode: "303" });
  assert.equal(modelFiltered.length, 2);

  const activeFiltered = await storage.listTaxCalendar({ active: true });
  assert.equal(activeFiltered.length, 1);
});

test("MemStorage.updateTaxCalendar recalcula estado y clone genera nuevo año", async () => {
  const storage = new MemStorage();
  const entry = await storage.createTaxCalendar({
    modelCode: "111",
    period: "1T",
    year: 2023,
    startDate: "2023-01-01",
    endDate: "2023-01-20",
    active: true,
  });

  const updated = await storage.updateTaxCalendar(entry.id, {
    startDate: "2030-01-01",
    endDate: "2030-01-20",
  });
  assert.equal(updated.status, "PENDIENTE");
  assert.equal(updated.year, 2023);

  const clones = await storage.cloneTaxCalendarYear(2023);
  assert.equal(clones.length, 1);
  assert.equal(clones[0].year, 2024);
  assert.equal(clones[0].modelCode, "111");
});

test("MemStorage.deleteTaxCalendar elimina registros", async () => {
  const storage = new MemStorage();
  const entry = await storage.createTaxCalendar({
    modelCode: "130",
    period: "3T",
    year: 2022,
    startDate: "2022-10-01",
    endDate: "2022-10-20",
    active: true,
  });

  const before = await storage.listTaxCalendar();
  assert.equal(before.length >= 1, true);

  await storage.deleteTaxCalendar(entry.id);
  const after = await storage.listTaxCalendar();
  assert.equal(after.find((item) => item.id === entry.id), undefined);
});

