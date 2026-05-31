CREATE TYPE "EmergencyRequestStatus" AS ENUM (
  'SEARCHING',
  'OFFER_PENDING',
  'MATCHED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE "EmergencyOfferStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED'
);

ALTER TABLE "professional_profiles"
ADD COLUMN "active_emergency_offer_id" TEXT;

ALTER TABLE "professional_profiles"
ADD CONSTRAINT "professional_profiles_active_emergency_offer_id_key"
UNIQUE ("active_emergency_offer_id");

CREATE TABLE "emergency_requests" (
  "emergency_request_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "status" "EmergencyRequestStatus" NOT NULL DEFAULT 'SEARCHING',
  "matched_professional_id" TEXT,
  "notes" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "matched_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "emergency_requests_pkey" PRIMARY KEY ("emergency_request_id")
);

CREATE TABLE "emergency_offers" (
  "emergency_offer_id" TEXT NOT NULL,
  "emergency_request_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "status" "EmergencyOfferStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_number" INTEGER NOT NULL,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "responded_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "emergency_offers_pkey" PRIMARY KEY ("emergency_offer_id")
);

CREATE UNIQUE INDEX "emergency_offers_emergency_request_id_professional_id_key"
ON "emergency_offers"("emergency_request_id", "professional_id");

CREATE INDEX "emergency_requests_patient_id_status_idx"
ON "emergency_requests"("patient_id", "status");

CREATE INDEX "emergency_requests_status_created_at_idx"
ON "emergency_requests"("status", "created_at");

CREATE INDEX "emergency_offers_emergency_request_id_status_idx"
ON "emergency_offers"("emergency_request_id", "status");

CREATE INDEX "emergency_offers_professional_id_status_idx"
ON "emergency_offers"("professional_id", "status");

CREATE INDEX "emergency_offers_status_expires_at_idx"
ON "emergency_offers"("status", "expires_at");

ALTER TABLE "emergency_requests"
ADD CONSTRAINT "emergency_requests_patient_id_fkey"
FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "emergency_requests"
ADD CONSTRAINT "emergency_requests_matched_professional_id_fkey"
FOREIGN KEY ("matched_professional_id") REFERENCES "professional_profiles"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "emergency_offers"
ADD CONSTRAINT "emergency_offers_emergency_request_id_fkey"
FOREIGN KEY ("emergency_request_id") REFERENCES "emergency_requests"("emergency_request_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "emergency_offers"
ADD CONSTRAINT "emergency_offers_professional_id_fkey"
FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
