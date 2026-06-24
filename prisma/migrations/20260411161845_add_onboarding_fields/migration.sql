-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isExamDateUnsure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceOfExposure" TEXT;
