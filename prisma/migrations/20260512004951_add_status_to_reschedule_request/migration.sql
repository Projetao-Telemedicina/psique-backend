-- AlterTable
ALTER TABLE "appointment_reschedule_requests" ADD COLUMN     "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING';
