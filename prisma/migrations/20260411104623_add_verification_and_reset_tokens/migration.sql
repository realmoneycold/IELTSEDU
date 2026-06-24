/*
  Warnings:

  - You are about to drop the column `adminId` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `EducationCentre` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_background` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `band_trend` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `band_trend_class` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `best_streak` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `completedModules` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `country_flag` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `wpm_score` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CentreUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EducationalCentre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExamDate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserProgress` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `EducationCentre` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GroupLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "PartnerStatus" ADD VALUE 'REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'GRADER';
ALTER TYPE "Role" ADD VALUE 'SUPPORT';
ALTER TYPE "Role" ADD VALUE 'CONTENT';
ALTER TYPE "Role" ADD VALUE 'ANALYST';
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- DropForeignKey
ALTER TABLE "AdminTask" DROP CONSTRAINT "AdminTask_adminId_fkey";

-- DropForeignKey
ALTER TABLE "CentreUser" DROP CONSTRAINT "CentreUser_centreId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_adminId_fkey";

-- DropForeignKey
ALTER TABLE "PracticeTest" DROP CONSTRAINT "PracticeTest_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_userId_fkey";

-- DropIndex
DROP INDEX "AdminTask_assignedDate_idx";

-- DropIndex
DROP INDEX "Device_adminId_idx";

-- DropIndex
DROP INDEX "Device_isActive_idx";

-- DropIndex
DROP INDEX "Follow_studentId_idx";

-- DropIndex
DROP INDEX "Follow_teacherId_idx";

-- DropIndex
DROP INDEX "Lesson_startTime_idx";

-- DropIndex
DROP INDEX "Lesson_status_idx";

-- DropIndex
DROP INDEX "Lesson_teacherId_idx";

-- DropIndex
DROP INDEX "Material_fileType_idx";

-- DropIndex
DROP INDEX "Material_lessonId_idx";

-- DropIndex
DROP INDEX "Material_teacherId_idx";

-- DropIndex
DROP INDEX "PracticeTest_createdById_idx";

-- DropIndex
DROP INDEX "PracticeTest_isPublished_idx";

-- DropIndex
DROP INDEX "PracticeTest_practiceMode_idx";

-- DropIndex
DROP INDEX "Question_testId_idx";

-- DropIndex
DROP INDEX "Question_type_idx";

-- DropIndex
DROP INDEX "Report_status_idx";

-- DropIndex
DROP INDEX "Report_studentId_idx";

-- DropIndex
DROP INDEX "Report_testId_idx";

-- DropIndex
DROP INDEX "Report_type_idx";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "adminId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EducationCentre" DROP COLUMN "location",
ADD COLUMN     "activeStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "totalStudents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar_background",
DROP COLUMN "avatar_url",
DROP COLUMN "band_trend",
DROP COLUMN "band_trend_class",
DROP COLUMN "best_streak",
DROP COLUMN "completedModules",
DROP COLUMN "country_flag",
DROP COLUMN "wpm_score",
ADD COLUMN     "centreId" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT;

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "CentreUser";

-- DropTable
DROP TABLE "EducationalCentre";

-- DropTable
DROP TABLE "ExamDate";

-- DropTable
DROP TABLE "UserProgress";

-- DropEnum
DROP TYPE "AdminRole";

-- DropEnum
DROP TYPE "CentreRole";

-- CreateTable
CREATE TABLE "MockSession" (
    "id" SERIAL NOT NULL,
    "centreId" INTEGER NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Academic',
    "format" TEXT NOT NULL DEFAULT 'Paper-Based',
    "location" TEXT NOT NULL DEFAULT 'TBD',
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockResult" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "listening" DOUBLE PRECISION,
    "reading" DOUBLE PRECISION,
    "writing" DOUBLE PRECISION,
    "speaking" DOUBLE PRECISION,
    "overall" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGroup" (
    "id" SERIAL NOT NULL,
    "centreId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'All levels',
    "schedule" TEXT NOT NULL DEFAULT 'TBD',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER NOT NULL DEFAULT 15,
    "status" "GroupStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupApplication" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" SERIAL NOT NULL,
    "centreId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'General',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "history" JSONB,

    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeTestResult" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,
    "testIdentifier" TEXT NOT NULL,
    "testCategory" TEXT NOT NULL,
    "testSubcategory" TEXT,
    "setNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bandScore" DOUBLE PRECISION,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "aiAnalysis" TEXT,
    "progressNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestUnlock" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "maxUnlockedSet" INTEGER NOT NULL DEFAULT 1,
    "minScoreRequired" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressSnapshot" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "listeningAvg" DOUBLE PRECISION DEFAULT 0,
    "readingAvg" DOUBLE PRECISION DEFAULT 0,
    "writingAvg" DOUBLE PRECISION DEFAULT 0,
    "speakingAvg" DOUBLE PRECISION DEFAULT 0,
    "overallAvg" DOUBLE PRECISION DEFAULT 0,
    "estimatedBand" DOUBLE PRECISION DEFAULT 5.0,
    "targetBand" DOUBLE PRECISION DEFAULT 8.0,
    "testsCompleted" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "weakAreas" TEXT,
    "strongAreas" TEXT,
    "isMakingProgress" BOOLEAN NOT NULL DEFAULT true,
    "aiConclusion" TEXT,
    "recommendation" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupApplication_studentId_groupId_key" ON "GroupApplication"("studentId", "groupId");

-- CreateIndex
CREATE INDEX "LoginLog_userId_idx" ON "LoginLog"("userId");

-- CreateIndex
CREATE INDEX "LoginLog_timestamp_idx" ON "LoginLog"("timestamp");

-- CreateIndex
CREATE INDEX "PracticeTestResult_userId_idx" ON "PracticeTestResult"("userId");

-- CreateIndex
CREATE INDEX "PracticeTestResult_testCategory_idx" ON "PracticeTestResult"("testCategory");

-- CreateIndex
CREATE INDEX "PracticeTestResult_testIdentifier_idx" ON "PracticeTestResult"("testIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeTestResult_userId_testIdentifier_key" ON "PracticeTestResult"("userId", "testIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "TestUnlock_userId_category_subcategory_key" ON "TestUnlock"("userId", "category", "subcategory");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_userId_idx" ON "ProgressSnapshot"("userId");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_snapshotDate_idx" ON "ProgressSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "EducationCentre_city_idx" ON "EducationCentre"("city");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "EducationCentre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockSession" ADD CONSTRAINT "MockSession_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "EducationCentre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockResult" ADD CONSTRAINT "MockResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockResult" ADD CONSTRAINT "MockResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MockSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroup" ADD CONSTRAINT "StudyGroup_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "EducationCentre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroup" ADD CONSTRAINT "StudyGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupApplication" ADD CONSTRAINT "GroupApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupApplication" ADD CONSTRAINT "GroupApplication_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "EducationCentre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTask" ADD CONSTRAINT "AdminTask_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTest" ADD CONSTRAINT "PracticeTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestResult" ADD CONSTRAINT "PracticeTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeTestResult" ADD CONSTRAINT "PracticeTestResult_testId_fkey" FOREIGN KEY ("testId") REFERENCES "PracticeTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestUnlock" ADD CONSTRAINT "TestUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
