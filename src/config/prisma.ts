import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.config";

// 1. Initialize a standard Postgres Connection Pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// 2. Wrap it in the Prisma Driver Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to your Prisma Client
const prisma = new PrismaClient({ adapter });

export default prisma;
