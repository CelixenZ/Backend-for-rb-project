const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// 1. Initialize a standard Postgres Connection Pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Wrap it in the Prisma Driver Adapter
const adapter = new PrismaPg(pool);

// 3. Pass the adapter to your Prisma Client
const prisma = new PrismaClient({ adapter });

module.exports = prisma;