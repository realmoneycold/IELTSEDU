-- AlterTable
ALTER TABLE "User" ADD COLUMN     "exam_date" TIMESTAMP(3),
ADD COLUMN     "exam_date_text" TEXT,
ADD COLUMN     "is_onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referral_source" TEXT,
ADD COLUMN     "study_commitment" TEXT,
ADD COLUMN     "target_band_range" TEXT;
