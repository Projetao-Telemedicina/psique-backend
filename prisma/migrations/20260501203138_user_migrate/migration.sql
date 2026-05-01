/*
  Warnings:

  - The values [PENDING_APPROVAL] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `professional_requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `appointment_reschedule_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chat_rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coupons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `diary_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `message_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `panic_request_offers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `panic_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `professional_availability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `professional_breaks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `professional_calendar_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `professional_promotions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promotion_plans` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_coupons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `video_call_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProfessionalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
ALTER TABLE "public"."users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "appointment_reschedule_requests" DROP CONSTRAINT "appointment_reschedule_requests_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "appointment_reschedule_requests" DROP CONSTRAINT "appointment_reschedule_requests_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_rescheduled_from_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_rooms" DROP CONSTRAINT "chat_rooms_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "diary_entries" DROP CONSTRAINT "diary_entries_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "message_attachments" DROP CONSTRAINT "message_attachments_message_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_room_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "panic_request_offers" DROP CONSTRAINT "panic_request_offers_panic_request_id_fkey";

-- DropForeignKey
ALTER TABLE "panic_request_offers" DROP CONSTRAINT "panic_request_offers_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "panic_requests" DROP CONSTRAINT "panic_requests_accepted_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "panic_requests" DROP CONSTRAINT "panic_requests_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_subscription_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_coupon_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "professional_availability" DROP CONSTRAINT "professional_availability_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "professional_breaks" DROP CONSTRAINT "professional_breaks_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "professional_calendar_events" DROP CONSTRAINT "professional_calendar_events_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "professional_promotions" DROP CONSTRAINT "professional_promotions_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "professional_promotions" DROP CONSTRAINT "professional_promotions_promotion_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_professional_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_coupons" DROP CONSTRAINT "user_coupons_coupon_id_fkey";

-- DropForeignKey
ALTER TABLE "user_coupons" DROP CONSTRAINT "user_coupons_user_id_fkey";

-- DropForeignKey
ALTER TABLE "video_call_sessions" DROP CONSTRAINT "video_call_sessions_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "video_call_sessions" DROP CONSTRAINT "video_call_sessions_panic_request_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_patient_id_fkey";

-- AlterTable
ALTER TABLE "professional_requests" DROP COLUMN "status",
ADD COLUMN     "status" "ProfessionalRequestStatus" NOT NULL DEFAULT 'PENDING';

-- DropTable
DROP TABLE "appointment_reschedule_requests";

-- DropTable
DROP TABLE "appointments";

-- DropTable
DROP TABLE "chat_rooms";

-- DropTable
DROP TABLE "coupons";

-- DropTable
DROP TABLE "diary_entries";

-- DropTable
DROP TABLE "message_attachments";

-- DropTable
DROP TABLE "messages";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "panic_request_offers";

-- DropTable
DROP TABLE "panic_requests";

-- DropTable
DROP TABLE "payment_methods";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "plans";

-- DropTable
DROP TABLE "professional_availability";

-- DropTable
DROP TABLE "professional_breaks";

-- DropTable
DROP TABLE "professional_calendar_events";

-- DropTable
DROP TABLE "professional_promotions";

-- DropTable
DROP TABLE "promotion_plans";

-- DropTable
DROP TABLE "reviews";

-- DropTable
DROP TABLE "subscriptions";

-- DropTable
DROP TABLE "user_coupons";

-- DropTable
DROP TABLE "video_call_sessions";

-- DropTable
DROP TABLE "wallet_transactions";

-- DropTable
DROP TABLE "wallets";

-- DropEnum
DROP TYPE "AppointmentCanceledBy";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "CalendarEventType";

-- DropEnum
DROP TYPE "ChatRoomStatus";

-- DropEnum
DROP TYPE "CouponCategory";

-- DropEnum
DROP TYPE "CouponDiscountType";

-- DropEnum
DROP TYPE "MessageType";

-- DropEnum
DROP TYPE "PanicOfferStatus";

-- DropEnum
DROP TYPE "PanicRequestStatus";

-- DropEnum
DROP TYPE "PaymentMethodType";

-- DropEnum
DROP TYPE "PaymentPurpose";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PromotionStatus";

-- DropEnum
DROP TYPE "RequestStatus";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "VideoCallStatus";

-- DropEnum
DROP TYPE "WalletTransactionDirection";

-- DropEnum
DROP TYPE "WalletTransactionType";
