-- AlterTable
ALTER TABLE "centres" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "typing_practice_texts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'intermediate',
    "wordCount" INTEGER NOT NULL,
    "topics" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "typing_practice_texts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "typing_practice_texts_difficulty_idx" ON "typing_practice_texts"("difficulty");

-- CreateIndex
CREATE INDEX "typing_practice_texts_isActive_idx" ON "typing_practice_texts"("isActive");

-- CreateIndex
CREATE INDEX "centres_latitude_longitude_idx" ON "centres"("latitude", "longitude");
