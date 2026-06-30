import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

// Force-load the .env file in the current directory
config({ path: "./.env" });

export default defineConfig({
  // Prisma 7 schema path as a clean string
  schema: "prisma/schema.prisma",
  
  migrations: {
    path: "prisma/migrations",
  },
  
  datasource: {
    // This tells the Prisma CLI where to point during migrations/pulls
    url: process.env.DATABASE_URL as string,
  },
});