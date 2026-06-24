# 🔴 GEMINI FIX PROMPT - CRITICAL #12 & #13 DATA INTEGRITY ISSUES

## Problem Summary
The migration for CRITICAL #13 (Live Hub) was applied using `npx prisma db push --accept-data-loss`, which DROPPED and RECREATED the User table. This is destructive and may have caused data loss.

**Status Unknown:**
- ❓ Are the 6 demo accounts (CRITICAL #12) still in database?
- ❓ Are the original 22 student accounts still in database?
- ❓ Are LiveSession tables actually present in PostgreSQL?

---

## TASK: Fix CRITICAL #12 & #13 - Verify Data & Rebuild if Needed

### STEP 1: VERIFY DATABASE STATE
```bash
# Check if users still exist
psql -h localhost -U postgres -d ieltspractice -c "SELECT COUNT(*) as user_count FROM \"User\";"

# Check if demo accounts exist
psql -h localhost -U postgres -d ieltspractice -c "SELECT email, role FROM \"User\" WHERE email LIKE '%ieltspractice.com' ORDER BY role;"

# Check if LiveSession tables exist
psql -h localhost -U postgres -d ieltspractice -c "\d live_sessions"
psql -h localhost -U postgres -d ieltspractice -c "\d live_session_participants"
```

### STEP 2: IF DATA WAS LOST - ROLLBACK MIGRATION

If the User table is empty or demo accounts are missing:

```bash
# Option A: Rollback the destructive migration
cd /home/ahror/Documents/IELTSPRACTICE2

# Remove the bad migration from database history
npx prisma migrate resolve --rolled-back 20260412154017_add_live_sessions

# Delete the destructive migration file
rm -rf prisma/migrations/20260412154017_add_live_sessions/
```

### STEP 3: RECREATE MIGRATION - PROPERLY (NON-DESTRUCTIVE)

The migration should ONLY add the LiveSession tables, NOT recreate User table.

**File:** Create new file `prisma/migrations/20260412_add_live_sessions_safe/migration.sql`

**Content:** (Only adds new tables and relationships, doesn't touch existing User table)

```sql
-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" INTEGER NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'speaking',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "maxParticipants" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_sessions_teacherId_idx" ON "live_sessions"("teacherId");
CREATE INDEX "live_sessions_startTime_idx" ON "live_sessions"("startTime");
CREATE INDEX "live_session_participants_sessionId_idx" ON "live_session_participants"("sessionId");
CREATE INDEX "live_session_participants_userId_idx" ON "live_session_participants"("userId");
CREATE UNIQUE INDEX "live_session_participants_sessionId_userId_key" ON "live_session_participants"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_teacherId_fkey" 
  FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_sessionId_fkey" 
  FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Then apply it:**
```bash
npx prisma migrate deploy
```

### STEP 4: UPDATE PRISMA SCHEMA - ADD USER RELATIONS

**File:** `/home/ahror/Documents/IELTSPRACTICE2/ielts-practice/prisma/schema.prisma`

**Find** the User model and add these fields:

```prisma
model User {
  // ... existing fields ...
  
  // NEW: Add these relation fields
  createdLiveSessions LiveSession[]        @relation("TeacherSessions")
  joinedLiveSessions  SessionParticipant[] @relation("SessionParticipants")
  
  // ... rest of existing fields ...
}
```

### STEP 5: REGENERATE PRISMA CLIENT

```bash
npx prisma generate
```

### STEP 6: VERIFY LIVESESSION TABLES EXIST

```bash
# Test that tables exist and are queryable
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const count = await prisma.liveSession.count();
    console.log('✅ Live Sessions table exists. Count:', count);
  } catch (e) {
    console.log('❌ Error accessing liveSession:', e.message);
  }
  await prisma.\$disconnect();
})();
"
```

### STEP 7: RECREATE DEMO ACCOUNTS (IF LOST)

If demo accounts are gone, recreate them:

```bash
cd /home/ahror/Documents/IELTSPRACTICE2
node scripts/create-demo-accounts.js
```

**Verify:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const demos = await prisma.user.findMany({
    where: { email: { in: [
      'admin@ieltspractice.com',
      'ceo@ieltspractice.com',
      'teacher@ieltspractice.com',
      'centre@ieltspractice.com'
    ]}},
    select: { email, role }
  });
  console.log('Demo accounts:');
  demos.forEach(d => console.log('  ✅', d.role, ':', d.email));
  if (demos.length === 4) console.log('\n✅ All demo accounts present!');
  else console.log('\n❌ Missing demo accounts. Count:', demos.length);
  await prisma.\$disconnect();
})();
"
```

### STEP 8: CREATE SAMPLE LIVE SESSION (FOR TESTING)

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  // Get teacher account
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher@ieltspractice.com' }
  });
  
  if (!teacher) {
    console.log('❌ Teacher account not found');
    await prisma.\$disconnect();
    return;
  }
  
  // Create sample session
  const session = await prisma.liveSession.create({
    data: {
      title: 'IELTS Speaking Practice - Advanced',
      description: 'Join our live speaking session for advanced learners',
      teacherId: teacher.id,
      sessionType: 'speaking',
      startTime: new Date(Date.now() + 24*60*60*1000), // Tomorrow
      endTime: new Date(Date.now() + 24*60*60*1000 + 60*60*1000), // 1 hour
      maxParticipants: 20,
      isFeatured: true,
      status: 'scheduled'
    }
  });
  
  console.log('✅ Sample session created:');
  console.log('  ID:', session.id);
  console.log('  Title:', session.title);
  console.log('  Teacher:', teacher.full_name);
  console.log('  Featured: Yes');
  
  await prisma.\$disconnect();
})();
"
```

---

## FINAL VERIFICATION CHECKLIST

Run this to confirm everything is working:

```bash
#!/bin/bash
set -e

echo "========================================"
echo "CRITICAL #12 & #13 VERIFICATION"
echo "========================================"
echo ""

echo "1️⃣  Checking User table..."
psql -h localhost -U postgres -d ieltspractice -c "SELECT COUNT(*) as total_users FROM \"User\";" || echo "❌ Failed"

echo ""
echo "2️⃣  Checking demo accounts..."
psql -h localhost -U postgres -d ieltspractice -c "SELECT role, COUNT(*) FROM \"User\" WHERE email LIKE '%@ieltspractice.com' GROUP BY role;" || echo "❌ Failed"

echo ""
echo "3️⃣  Checking LiveSession tables..."
psql -h localhost -U postgres -d ieltspractice -c "SELECT COUNT(*) as live_sessions FROM live_sessions;" || echo "❌ Failed"

echo ""
echo "4️⃣  Testing Prisma connections..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const userCount = await prisma.user.count();
    const demoCount = await prisma.user.count({
      where: { email: { startsWith: 'admin@' } }
    });
    const sessionCount = await prisma.liveSession.count();
    
    console.log('✅ Prisma working:');
    console.log('   Users:', userCount);
    console.log('   Demo accounts:', demoCount);
    console.log('   Live sessions:', sessionCount);
  } catch (e) {
    console.log('❌ Prisma error:', e.message);
  }
  await prisma.\$disconnect();
})();
" || echo "❌ Prisma test failed"

echo ""
echo "========================================"
echo "✅ VERIFICATION COMPLETE"
echo "========================================"
```

---

## BEST PRACTICES - GOING FORWARD

**NEVER use:**
```bash
npx prisma db push --accept-data-loss  ❌ DESTRUCTIVE
```

**ALWAYS use:**
```bash
npx prisma migrate dev --name add_feature_name  ✅ SAFE, REPRODUCIBLE
```

This ensures:
- Migrations are tracked in git
- Schema changes are documented
- Can roll back if needed
- Other developers can apply same changes
- Production deployments are predictable

---

## IF EVERYTHING IS WORKING

Once verified that:
1. ✅ All user data is intact
2. ✅ 6 demo accounts exist (admin, ceo, teacher, centre, 2 students)
3. ✅ LiveSession and SessionParticipant tables exist
4. ✅ Foreign keys are correct
5. ✅ Prisma Client can query tables

Then mark **CRITICAL #12 and #13 as APPROVED** and proceed to **HIGH PRIORITY #1-31**.

---

## Questions to Answer

Before Gemini proceeds, please verify:

1. **Did `db push` actually execute?** 
   - Check git log: `git log --oneline | head -5`
   - Check migration folder: `ls -la prisma/migrations/ | tail -3`

2. **Are original 22 students still in database?**
   - Count: `psql -h localhost -U postgres -d ieltspractice -c "SELECT COUNT(*) FROM \"User\" WHERE role = 'STUDENT';"`

3. **Do demo accounts exist?**
   - Count: `psql -h localhost -U postgres -d ieltspractice -c "SELECT COUNT(*) FROM \"User\" WHERE email LIKE '%ieltspractice.com';"`

4. **Are LiveSession tables in PostgreSQL?**
   - Tables: `psql -h localhost -U postgres -d ieltspractice -c "\dt live_*"`

Once Gemini answers these 4 questions with output, we can proceed with the fix if needed.
