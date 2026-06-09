-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "professional_availabilities" (
    "availability_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 50,
    "recurrence" "RecurrenceType" NOT NULL DEFAULT 'WEEKLY',
    "valid_from" DATE,
    "valid_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_availabilities_pkey" PRIMARY KEY ("availability_id")
);

-- CreateIndex
CREATE INDEX "professional_availabilities_professional_id_is_active_idx" ON "professional_availabilities"("professional_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "professional_availabilities_professional_id_weekday_start_t_key" ON "professional_availabilities"("professional_id", "weekday", "start_time", "recurrence");

-- AddForeignKey
ALTER TABLE "professional_availabilities" ADD CONSTRAINT "professional_availabilities_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
