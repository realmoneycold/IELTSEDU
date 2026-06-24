-- CreateEnum
CREATE TYPE "CentreRole" AS ENUM ('CENTRE_ADMIN', 'CENTRE_STAFF', 'CENTRE_TEACHER');

-- CreateTable
CREATE TABLE "EducationCentre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentreUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "CentreRole" NOT NULL DEFAULT 'CENTRE_ADMIN',
    "centreId" INTEGER NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentreUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationCentre_code_key" ON "EducationCentre"("code");

-- CreateIndex
CREATE INDEX "EducationCentre_code_idx" ON "EducationCentre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CentreUser_email_key" ON "CentreUser"("email");

-- CreateIndex
CREATE INDEX "CentreUser_email_idx" ON "CentreUser"("email");

-- CreateIndex
CREATE INDEX "CentreUser_centreId_idx" ON "CentreUser"("centreId");

-- AddForeignKey
ALTER TABLE "CentreUser" ADD CONSTRAINT "CentreUser_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "EducationCentre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
