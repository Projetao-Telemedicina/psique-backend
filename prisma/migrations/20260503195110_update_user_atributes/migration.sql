/*
  Warnings:

  - You are about to drop the column `birth_date` on the `patient_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "patient_profiles" DROP COLUMN "birth_date";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "gender" TEXT;
