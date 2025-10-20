import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL no está configurada. Este proyecto requiere MariaDB/MySQL externa.");
}

if (!/^mysql:\/\//i.test(dbUrl) && !/^mariadb:\/\//i.test(dbUrl)) {
  throw new Error("DATABASE_URL debe usar el esquema mysql:// o mariadb:// (MariaDB/MySQL)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: dbUrl as string,
  },
});
