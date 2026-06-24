// Seed script to create leaderboard users
// Run with: node prisma/seed-leaderboard.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const leaderboardUsers = [
  // Top 3 Podium
  {
    full_name: 'Felix M.',
    email: 'felix.m@ieltsmaster.demo',
    username: 'felixm',
    password: '$2a$10$YourHashedPasswordHere', // Placeholder - should be properly hashed
    country: 'Germany',
    current_band: 9.0,
    target_band: 9.0,
    tasks_done: 156,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Sarah J.',
    email: 'sarah.j@ieltsmaster.demo',
    username: 'sarahj',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Canada',
    current_band: 8.5,
    target_band: 9.0,
    tasks_done: 142,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Mei L.',
    email: 'mei.l@ieltsmaster.demo',
    username: 'meil',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Singapore',
    current_band: 8.5,
    target_band: 9.0,
    tasks_done: 138,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  // Other ranked users
  {
    full_name: 'Jack Reacher',
    email: 'jack.r@ieltsmaster.demo',
    username: 'jackr',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Australia',
    current_band: 8.0,
    target_band: 8.5,
    tasks_done: 128,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Emma Watson',
    email: 'emma.w@ieltsmaster.demo',
    username: 'emmaw',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'UK',
    current_band: 8.0,
    target_band: 8.5,
    tasks_done: 94,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Ali Hassan',
    email: 'ali.h@ieltsmaster.demo',
    username: 'alih',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'UAE',
    current_band: 6.0,
    target_band: 7.5,
    tasks_done: 62,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  // Additional users for "Load More" functionality
  {
    full_name: 'Maria Garcia',
    email: 'maria.g@ieltsmaster.demo',
    username: 'mariag',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Spain',
    current_band: 7.5,
    target_band: 8.0,
    tasks_done: 87,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Chen Wei',
    email: 'chen.w@ieltsmaster.demo',
    username: 'chenw',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'China',
    current_band: 7.5,
    target_band: 8.0,
    tasks_done: 92,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Priya Sharma',
    email: 'priya.s@ieltsmaster.demo',
    username: 'priyas',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'India',
    current_band: 7.0,
    target_band: 8.0,
    tasks_done: 76,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Hans Mueller',
    email: 'hans.m@ieltsmaster.demo',
    username: 'hansm',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Germany',
    current_band: 7.0,
    target_band: 7.5,
    tasks_done: 68,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
  {
    full_name: 'Yuki Tanaka',
    email: 'yuki.t@ieltsmaster.demo',
    username: 'yukit',
    password: '$2a$10$YourHashedPasswordHere',
    country: 'Japan',
    current_band: 6.5,
    target_band: 7.5,
    tasks_done: 54,
    role: 'STUDENT',
    is_verified: true,
    is_onboarded: true,
  },
];

async function seedLeaderboard() {
  console.log('🌱 Starting leaderboard user seeding...');
  
  try {
    for (const userData of leaderboardUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const user = await prisma.user.create({
        data: userData
      });
      
      console.log(`✅ Created user: ${user.full_name} (ID: ${user.id})`);
    }
    
    console.log('✨ Leaderboard seeding completed successfully!');
    console.log(`📝 Total users created: ${leaderboardUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding leaderboard:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedLeaderboard();
