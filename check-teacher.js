const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkTeacher() {
  const email = 'teacher@ieltspractice.com';
  const password = 'TeacherPass123!';

  console.log('Checking teacher account:', email);

  // Find user by email only (don't filter by role yet)
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('User NOT found in database.');
    console.log('Creating teacher now...');
    const hash = await bcrypt.hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        email,
        full_name: 'Demo Teacher',
        password: hash,
        role: 'TEACHER',
        is_verified: true,
        country: 'United Kingdom'
      }
    });
    console.log('Teacher CREATED:', newUser.email);
    console.log('Role:', newUser.role);
    console.log('is_verified:', newUser.is_verified);
    return;
  }

  console.log('User FOUND:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  is_verified:', user.is_verified);
  console.log('  isVerified:', user.isVerified);
  console.log('  Password hash starts with:', user.password ? user.password.substring(0, 30) + '...' : 'NULL');

  // Check if password matches
  const match = await bcrypt.compare(password, user.password);
  console.log('  Password matches "TeacherPass123!":', match);

  // If wrong role, fix it
  if (user.role !== 'TEACHER') {
    console.log('WARNING: Role is', user.role, '- fixing to TEACHER...');
    await prisma.user.update({
      where: { email },
      data: { role: 'TEACHER' }
    });
    console.log('Role updated to TEACHER.');
  }

  // If not verified, fix it
  if (!user.is_verified) {
    console.log('WARNING: is_verified is false - fixing to true...');
    await prisma.user.update({
      where: { email },
      data: { is_verified: true }
    });
    console.log('is_verified updated to true.');
  }

  if (!match) {
    console.log('WARNING: Password does not match. Resetting password...');
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hash }
    });
    console.log('Password reset to: TeacherPass123!');
  }

  console.log('\nFinal credentials:');
  console.log('  Email:', email);
  console.log('  Password: TeacherPass123!');
}

checkTeacher()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
