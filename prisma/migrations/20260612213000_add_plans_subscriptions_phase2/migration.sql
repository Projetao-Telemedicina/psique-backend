CREATE TYPE "PlanBillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

CREATE TYPE "SubscriptionStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'OVERDUE',
    'CANCELED',
    'EXPIRED'
);

CREATE TABLE "plans" (
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "billing_cycle" "PlanBillingCycle" NOT NULL,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stripe_product_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("plan_id")
);

CREATE TABLE "subscriptions" (
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_subscription_id" TEXT,
    "started_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

CREATE UNIQUE INDEX "plans_stripe_product_id_key"
ON "plans"("stripe_product_id");

CREATE UNIQUE INDEX "plans_stripe_price_id_key"
ON "plans"("stripe_price_id");

CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key"
ON "subscriptions"("stripe_subscription_id");

CREATE INDEX "subscriptions_user_id_status_idx"
ON "subscriptions"("user_id", "status");

CREATE INDEX "subscriptions_status_current_period_end_idx"
ON "subscriptions"("status", "current_period_end");

ALTER TABLE "payments"
ADD CONSTRAINT "payments_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_plan_id_fkey"
FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
