#!/usr/bin/env node

/**
 * DEMO SETUP SCRIPT
 * Creates all test accounts needed for presentation demo
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TEST_ACCOUNTS = [
  {
    full_name: 'Student Demo',
    email: 'student@demo.com',
    password: 'StudentDemo123!',
    role: 'STUDENT',
  },
  {
    full_name: 'Admin Demo',
    email: 'admin@demo.com',
    password: 'AdminDemo123!',
    role: 'ADMIN',
  },
  {
    full_name: 'CEO Demo',
    email: 'ceo@demo.com',
    password: 'CeoDemo123!',
    role: 'CEO',
  },
  {
    full_name: 'Teacher Demo',
    email: 'teacher@demo.com',
    password: 'TeacherDemo123!',
    role: 'TEACHER',
  },
  {
    full_name: 'Centre Demo',
    email: 'centre@demo.com',
    password: 'CentreDemo123!',
    role: 'CENTRE',
  },
];

async function main() {
  console.log('🚀 DEMO SETUP: Creating test accounts...\n');

  for (const account of TEST_ACCOUNTS) {
    try {
      // Check if account exists
      const existing = await prisma.user.findUnique({
        where: { email: account.email },
      });

      if (existing) {
        console.log(`✅ ${account.role}: ${account.email} (already exists)`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 12);

      // Create account
      const user = await prisma.user.create({
        data: {
          full_name: account.full_name,
          username: account.email.split('@')[0],
          email: account.email,
          password: hashedPassword,
          role: account.role,
          is_verified: true, // Skip email verification for demo
          is_onboarded: false,
          current_band: 6.5,
          target_band: 8.0,
          country: 'Demo Country',
        },
      });

      console.log(`✅ CREATED: ${account.role}`);
      console.log(`   📧 Email: ${account.email}`);
      console.log(`   🔑 Password: ${account.password}\n`);
    } catch (error) {
      console.error(`❌ Failed to create ${account.role}:`, error.message);
    }
  }

  console.log('\n📊 DEMO CREDENTIALS READY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  TEST_ACCOUNTS.forEach((acc) => {
    console.log(`${acc.role.padEnd(12)} | ${acc.email.padEnd(20)} | ${acc.password}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const total = await prisma.user.count();
  console.log(`✨ Total users in database: ${total}`);
  console.log('✨ All users are pre-verified (no email needed for demo)\n');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
