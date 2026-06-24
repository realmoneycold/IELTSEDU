const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTeacher() {
  const email = 'teacher@ieltspractice.com';
  const password = 'TeacherPass123!';
  const full_name = 'Demo Teacher';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Teacher already exists. Updating password...');
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hash, role: 'TEACHER', is_verified: true }
    });
    console.log('Teacher updated:', email);
  } else {
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        full_name,
        password: hash,
        role: 'TEACHER',
        is_verified: true,
        country: 'United Kingdom'
      }
    });
    console.log('Teacher created:', user.email);
  }

  console.log('Login credentials:');
  console.log('  Email:', email);
  console.log('  Password:', password);
}

createTeacher()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
