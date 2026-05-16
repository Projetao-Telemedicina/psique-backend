-- CreateEnum
CREATE TYPE "DiaryFeeling" AS ENUM ('HAPPY', 'SCARED', 'SAD', 'ANXIOUS', 'ANGRY', 'CALM', 'OVERWHELMED', 'HOPEFUL', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "DiarySleepQuality" AS ENUM ('EIGHT_OR_MORE', 'SIX_TO_EIGHT', 'FOUR_TO_FIVE', 'LESS_THAN_FOUR');

-- CreateTable
CREATE TABLE "diary_entries" (
    "diary_entry_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "feeling" "DiaryFeeling" NOT NULL,
    "sleep_quality" "DiarySleepQuality",
    "symptom" TEXT,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("diary_entry_id")
);

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
