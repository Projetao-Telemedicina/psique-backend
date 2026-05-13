-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFESSIONAL', 'PATIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProfessionalApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OnlineStatus" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "ProfessionalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "birth_date" DATE,
    "gender" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "phone" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "cep" TEXT,
    "state" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "street" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "user_id" TEXT NOT NULL,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "share_diary_with_professionals" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "user_id" TEXT NOT NULL,
    "crp" TEXT NOT NULL,
    "specialty" TEXT,
    "approval_status" "ProfessionalApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "online_status" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
    "available_for_emergency" BOOLEAN NOT NULL DEFAULT false,
    "auto_absence_message" TEXT,
    "gap_between_appointments_minutes" INTEGER NOT NULL DEFAULT 0,
    "score_avg" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "professional_requests" (
    "request_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "status" "ProfessionalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "professional_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "professional_request_documents" (
    "document_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_request_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_crp_key" ON "professional_profiles"("crp");

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_requests" ADD CONSTRAINT "professional_requests_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_requests" ADD CONSTRAINT "professional_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_request_documents" ADD CONSTRAINT "professional_request_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "professional_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;
