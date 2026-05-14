-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'RESCHEDULE_REQUESTED', 'CANCELED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentCanceledBy" AS ENUM ('PATIENT', 'PROFESSIONAL', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "appointments" (
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "canceled_by" "AppointmentCanceledBy",
    "cancellation_reason" TEXT,
    "canceled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "rescheduled_from_appointment_id" TEXT,
    "attendance_certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "appointment_reschedule_requests" (
    "request_id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "suggested_starts_at" TIMESTAMP(3) NOT NULL,
    "suggested_ends_at" TIMESTAMP(3) NOT NULL,
    "patient_confirmed" BOOLEAN,
    "professional_confirmed" BOOLEAN,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reschedule_requests_pkey" PRIMARY KEY ("request_id")
);

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_appointment_id_fkey" FOREIGN KEY ("rescheduled_from_appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_requests" ADD CONSTRAINT "appointment_reschedule_requests_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reschedule_requests" ADD CONSTRAINT "appointment_reschedule_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
