/**
 * Create production test accounts for investor demo
 * Run with: node scripts/create-demo-accounts.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use the main prisma client to avoid connection issues
const prisma = new PrismaClient();

const accounts = [
  { email: 'admin@ieltspractice.com', password: 'AdminDemo123!', role: 'ADMIN', name: 'Admin User' },
  { email: 'ceo@ieltspractice.com', password: 'CeoDemo123!', role: 'CEO', name: 'CEO User' },
  { email: 'teacher@ieltspractice.com', password: 'TeacherDemo123!', role: 'TEACHER', name: 'Teacher User' },
  { email: 'centre@ieltspractice.com', password: 'CentreDemo123!', role: 'CENTRE', name: 'Centre Manager' },
  { email: 'student1@ieltspractice.com', password: 'StudentDemo123!', role: 'STUDENT', name: 'John Doe' },
  { email: 'student2@ieltspractice.com', password: 'StudentDemo123!', role: 'STUDENT', name: 'Jane Smith' },
];

async function createAccounts() {
  console.log('🚀 Starting demo account creation...');
  
  for (const acc of accounts) {
    try {
      const hashedPwd = await bcrypt.hash(acc.password, 12);
      const user = await prisma.user.upsert({
        where: { email: acc.email },
        update: {
          password: hashedPwd,
          role: acc.role,
          full_name: acc.name,
          is_verified: true,
          onboardingComplete: true,
          is_onboarded: true
        },
        create: {
          email: acc.email,
          password: hashedPwd,
          full_name: acc.name,
          username: acc.email === 'ceo@ieltspractice.com' ? 'ceo_demo' : acc.email.split('@')[0],
          role: acc.role,
          is_verified: true,
          is_onboarded: true,
          onboardingComplete: true,
          current_band: 7.0,
          target_band: 8.5,
          country: 'Uzbekistan',
          tasks_done: 12,
          study_hours: 45
        }
      });
      console.log(`✅ ${acc.role.padEnd(8)}: ${acc.email}`);
    } catch (error) {
      console.error(`❌ Failed to create ${acc.role} (${acc.email}):`, error.message);
    }
  }
  
  console.log('\n✨ Demo accounts ready for testing!');
  await prisma.$disconnect();
}

createAccounts().catch(err => {
  console.error('💥 Fatal error during account creation:', err);
  process.exit(1);
});
