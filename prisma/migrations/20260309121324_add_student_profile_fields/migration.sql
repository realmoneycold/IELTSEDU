-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "study_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "test_type" TEXT;
