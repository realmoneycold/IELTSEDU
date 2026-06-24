-- Add comprehensive test statistics tracking system

-- CreateEnum for Test Status
CREATE TYPE "TestStatus" AS ENUM ('COMPLETED', 'ABANDONED', 'IN_PROGRESS');

-- CreateEnum for Skill Areas (for weakness tracking)
CREATE TYPE "SkillArea" AS ENUM (
    'READING_COMPREHENSION',
    'LISTENING_COMPREHENSION',
    'WRITING_TASK_1',
    'WRITING_TASK_2',
    'SPEAKING_PART_1',
    'SPEAKING_PART_2',
    'SPEAKING_PART_3',
    'VOCABULARY',
    'GRAMMAR',
    'PRONUNCIATION',
    'FLUENCY',
    'COHERENCE'
);

-- Table: TestAttempt - Track every test completion
CREATE TABLE "TestAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testType" "TestType" NOT NULL,
    "testId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "skillArea" TEXT,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION DEFAULT 9.0,
    "percentageScore" DOUBLE PRECISION,
    "timeSpentSeconds" INTEGER,
    "status" "TestStatus" NOT NULL DEFAULT 'COMPLETED',
    "answersCorrect" INTEGER,
    "answersTotal" INTEGER,
    "feedback" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- Table: SkillStatistics - Aggregated stats per skill
CREATE TABLE "SkillStatistics" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skill" "TestType" NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "completedAttempts" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION DEFAULT 0,
    "bestScore" DOUBLE PRECISION DEFAULT 0,
    "worstScore" DOUBLE PRECISION DEFAULT 0,
    "totalTimeSpentSeconds" INTEGER DEFAULT 0,
    "averageTimeSpentSeconds" INTEGER DEFAULT 0,
    "improvementRate" DOUBLE PRECISION DEFAULT 0,
    "consistencyScore" DOUBLE PRECISION DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillStatistics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SkillStatistics_userId_skill_key" UNIQUE ("userId", "skill")
);

-- Table: WeaknessAnalysis - Track specific weak areas
CREATE TABLE "WeaknessAnalysis" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillArea" "SkillArea" NOT NULL,
    "testType" "TestType" NOT NULL,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 5,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION DEFAULT 0,
    "averageScore" DOUBLE PRECISION DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeaknessAnalysis_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeaknessAnalysis_userId_skillArea_key" UNIQUE ("userId", "skillArea")
);

-- Table: UserStudyStreak - Track study consistency
CREATE TABLE "UserStudyStreak" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalStudyDays" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" DATE,
    "weeklyGoal" INTEGER DEFAULT 5,
    "weeklyProgress" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStudyStreak_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserStudyStreak_userId_key" UNIQUE ("userId")
);

-- Table: DailyStudyLog - Track daily study activity
CREATE TABLE "DailyStudyLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "studyDate" DATE NOT NULL,
    "testsCompleted" INTEGER DEFAULT 0,
    "timeSpentMinutes" INTEGER DEFAULT 0,
    "skillsPracticed" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStudyLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyStudyLog_userId_studyDate_key" UNIQUE ("userId", "studyDate")
);

-- Create indexes for performance
CREATE INDEX "TestAttempt_userId_idx" ON "TestAttempt"("userId");
CREATE INDEX "TestAttempt_testType_idx" ON "TestAttempt"("testType");
CREATE INDEX "TestAttempt_completedAt_idx" ON "TestAttempt"("completedAt");
CREATE INDEX "TestAttempt_userId_testType_idx" ON "TestAttempt"("userId", "testType");
CREATE INDEX "WeaknessAnalysis_userId_priority_idx" ON "WeaknessAnalysis"("userId", "priority" DESC);
CREATE INDEX "DailyStudyLog_userId_date_idx" ON "DailyStudyLog"("userId", "studyDate" DESC);

-- AddForeignKeys
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkillStatistics" ADD CONSTRAINT "SkillStatistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeaknessAnalysis" ADD CONSTRAINT "WeaknessAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStudyStreak" ADD CONSTRAINT "UserStudyStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyStudyLog" ADD CONSTRAINT "DailyStudyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
