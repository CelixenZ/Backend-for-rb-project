// 1. Force load the environment variables right at the top
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL is undefined inside seed.js!");
  process.exit(1);
}

// 2. Set up a secure, cloud-friendly connection configuration
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for cloud providers like Neon/AWS
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding default administrator...');

  const adminEmail = 'admin@icms.local';
  const adminUsername = 'admin';
  const password = 'SuperAdminPassword2026'; 

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: adminEmail,
      username: adminUsername,
      password: hashedPassword,
      role: 'ADMIN',
      status: true,
      tokenVersion: 0
    }
  });

  console.log(`\n✅ Admin seeded successfully!\nUsername: ${admin.username}\nPassword: ${password}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Clean up the connection pool pool
  });