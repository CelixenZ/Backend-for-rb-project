import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

// 1. Aggressively force-load the .env file in the current directory
config({ path: "./.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 2. Read straight from the raw Node environment (bypassing Prisma's strict env checker)
    url: process.env.DATABASE_URL as string,
  },
});