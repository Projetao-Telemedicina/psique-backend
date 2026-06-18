CREATE TYPE "ChatRoomStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'READ_ONLY');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'SYSTEM');

CREATE TABLE "chat_rooms" (
    "room_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "status" "ChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("room_id")
);

CREATE TABLE "messages" (
    "message_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "is_auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

CREATE TABLE "message_attachments" (
    "attachment_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("attachment_id")
);

CREATE UNIQUE INDEX "chat_rooms_patient_id_professional_id_key" ON "chat_rooms"("patient_id", "professional_id");
CREATE INDEX "chat_rooms_patient_id_idx" ON "chat_rooms"("patient_id");
CREATE INDEX "chat_rooms_professional_id_idx" ON "chat_rooms"("professional_id");
CREATE INDEX "messages_room_id_sent_at_idx" ON "messages"("room_id", "sent_at");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

ALTER TABLE "chat_rooms"
ADD CONSTRAINT "chat_rooms_patient_id_fkey"
FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_rooms"
ADD CONSTRAINT "chat_rooms_professional_id_fkey"
FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_rooms"
ADD CONSTRAINT "chat_rooms_appointment_id_fkey"
FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("room_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_sender_id_fkey"
FOREIGN KEY ("sender_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_attachments"
ADD CONSTRAINT "message_attachments_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "messages"("message_id")
ON DELETE CASCADE ON UPDATE CASCADE;
