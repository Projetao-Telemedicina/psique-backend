-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'EXPIRED',
    'CANCELED',
    'FAILED'
);

-- AlterTable
ALTER TABLE "professional_profiles"
ADD COLUMN "is_promoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotion_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "promotion_plans" (
    "promotion_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_plans_pkey" PRIMARY KEY ("promotion_plan_id")
);

-- CreateTable
CREATE TABLE "professional_promotions" (
    "promotion_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "promotion_plan_id" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_promotions_pkey" PRIMARY KEY ("promotion_id")
);

-- CreateIndex
CREATE INDEX "professional_promotions_professional_id_status_idx" ON "professional_promotions"("professional_id", "status");

-- CreateIndex
CREATE INDEX "professional_promotions_status_ends_at_idx" ON "professional_promotions"("status", "ends_at");

-- AddForeignKey
ALTER TABLE "professional_promotions"
ADD CONSTRAINT "professional_promotions_professional_id_fkey"
FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_promotions"
ADD CONSTRAINT "professional_promotions_promotion_plan_id_fkey"
FOREIGN KEY ("promotion_plan_id") REFERENCES "promotion_plans"("promotion_plan_id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"
ADD CONSTRAINT "payments_promotion_id_fkey"
FOREIGN KEY ("promotion_id") REFERENCES "professional_promotions"("promotion_id")
ON DELETE SET NULL ON UPDATE CASCADE;
