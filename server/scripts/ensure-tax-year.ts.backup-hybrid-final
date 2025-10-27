import { prismaStorage as storage } from "../prisma-storage";

async function main() {
  const argYear = process.argv[2];
  const envYear = process.env.YEAR;
  const year = Number(argYear || envYear || new Date().getFullYear());
  if (!Number.isFinite(year)) {
    console.error("Usage: npm run tax:ensure-year -- [YEAR]  (or set YEAR env)");
    process.exit(1);
  }

  console.log(`➡️  Ensuring fiscal periods and filings for year ${year}...`);
  await storage.createFiscalYear(year).catch(() => {});
  const result = await storage.ensureClientTaxFilingsForYear(year);
  console.log("✅ Done:", result);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

