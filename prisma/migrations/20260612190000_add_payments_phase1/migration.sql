ALTER TABLE "users"
ADD COLUMN "stripe_customer_id" TEXT;

CREATE UNIQUE INDEX "users_stripe_customer_id_key"
ON "users"("stripe_customer_id");

CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'PIX', 'BOLETO', 'WALLET');

CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'CANCELED'
);

CREATE TYPE "PaymentPurpose" AS ENUM (
    'APPOINTMENT',
    'PLAN_SUBSCRIPTION',
    'PROFILE_PROMOTION'
);

CREATE TABLE "payment_methods" (
    "payment_method_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "gateway_token" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "holder_name" TEXT,
    "expires_month" INTEGER,
    "expires_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("payment_method_id")
);

CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payment_method_id" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "appointment_id" TEXT,
    "subscription_id" TEXT,
    "promotion_id" TEXT,
    "user_coupon_id" TEXT,
    "original_amount_cents" INTEGER NOT NULL,
    "discount_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "wallet_amount_cents" INTEGER NOT NULL DEFAULT 0,
    "final_amount_cents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gateway_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

CREATE UNIQUE INDEX "payment_methods_gateway_token_key"
ON "payment_methods"("gateway_token");

CREATE INDEX "payment_methods_user_id_is_default_idx"
ON "payment_methods"("user_id", "is_default");

CREATE UNIQUE INDEX "payments_appointment_id_key"
ON "payments"("appointment_id");

CREATE UNIQUE INDEX "payments_gateway_transaction_id_key"
ON "payments"("gateway_transaction_id");

CREATE INDEX "payments_user_id_status_idx"
ON "payments"("user_id", "status");

CREATE INDEX "payments_purpose_status_idx"
ON "payments"("purpose", "status");

ALTER TABLE "payment_methods"
ADD CONSTRAINT "payment_methods_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_payment_method_id_fkey"
FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("payment_method_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_appointment_id_fkey"
FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_user_coupon_id_fkey"
FOREIGN KEY ("user_coupon_id") REFERENCES "user_coupons"("user_coupon_id")
ON DELETE SET NULL ON UPDATE CASCADE;
