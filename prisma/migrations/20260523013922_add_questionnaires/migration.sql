-- CreateTable
CREATE TABLE "patient_questionnaires" (
    "user_id" TEXT NOT NULL,
    "motivo_terapia" INTEGER NOT NULL,
    "abordagem" INTEGER NOT NULL,
    "estilo_terapeutico" INTEGER NOT NULL,
    "objetivo" INTEGER NOT NULL,
    "genero" INTEGER NOT NULL,
    "experiencia" INTEGER NOT NULL,
    "contextos" INTEGER[],
    "ignora_contextos" BOOLEAN NOT NULL DEFAULT false,
    "tempo_busca" INTEGER NOT NULL,
    "experiencia_previa" INTEGER NOT NULL,
    "precisa_suporte_fora" BOOLEAN NOT NULL DEFAULT false,
    "restricao_horario" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_questionnaires_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "professional_questionnaires" (
    "user_id" TEXT NOT NULL,
    "motivos_terapia" INTEGER[],
    "abordagem" INTEGER NOT NULL,
    "estilo_terapeutico" INTEGER NOT NULL,
    "objetivo" INTEGER NOT NULL,
    "genero" INTEGER NOT NULL,
    "experiencia" INTEGER NOT NULL,
    "contextos" INTEGER[],
    "suporte_fora" INTEGER NOT NULL,
    "periodo_atendimento" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_questionnaires_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "patient_questionnaires" ADD CONSTRAINT "patient_questionnaires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "patient_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_questionnaires" ADD CONSTRAINT "professional_questionnaires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "professional_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
