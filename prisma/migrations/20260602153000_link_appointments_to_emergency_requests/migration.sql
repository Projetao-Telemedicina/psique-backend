ALTER TABLE "appointments"
ADD COLUMN "emergency_request_id" TEXT;

CREATE UNIQUE INDEX "appointments_emergency_request_id_key"
ON "appointments"("emergency_request_id");

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_emergency_request_id_fkey"
FOREIGN KEY ("emergency_request_id")
REFERENCES "emergency_requests"("emergency_request_id")
ON DELETE SET NULL
ON UPDATE CASCADE;
