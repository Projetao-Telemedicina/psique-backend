ALTER TABLE "professional_request_documents"
DROP COLUMN "file_url",
ADD COLUMN "file_name" TEXT NOT NULL DEFAULT 'rg.pdf',
ADD COLUMN "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
ADD COLUMN "size_bytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "file_data" BYTEA NOT NULL DEFAULT decode('', 'hex');

ALTER TABLE "professional_request_documents"
ALTER COLUMN "file_name" DROP DEFAULT,
ALTER COLUMN "mime_type" DROP DEFAULT,
ALTER COLUMN "size_bytes" DROP DEFAULT,
ALTER COLUMN "file_data" DROP DEFAULT;
