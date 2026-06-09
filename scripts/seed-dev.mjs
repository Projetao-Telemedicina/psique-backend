import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  OnlineStatus,
  PrismaClient,
  ProfessionalApprovalStatus,
  Role,
  UserStatus,
} from '@prisma/client';

const envFile = resolve(process.cwd(), '.env');

if (!existsSync(envFile)) {
  throw new Error('Arquivo .env não encontrado.');
}

loadDotenv({
  path: envFile,
  override: true,
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error('A variável DATABASE_URL não está configurada no arquivo .env.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});
const defaultPassword = 'Password123';
const validEntityKinds = ['admins', 'patients', 'professionals'];
const validQuestionnaireModes = ['with', 'without'];

const admins = [
  {
    name: 'Amanda Freitas',
    email: 'amanda.admin@psique.local',
    cpf: '52998224725',
    phone: '85999990001',
    birthDate: new Date('1988-03-14T00:00:00.000Z'),
    gender: 'Feminino',
    bio: 'Administradora responsável pela operação da plataforma.',
    cep: '60125021',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Aldeota',
    street: 'Rua Silva Jatahy',
    number: '1280',
    complement: 'Sala 301',
  },
  {
    name: 'Bruno Martins',
    email: 'bruno.admin@psique.local',
    cpf: '11144477735',
    phone: '85999990002',
    birthDate: new Date('1985-09-22T00:00:00.000Z'),
    gender: 'Masculino',
    bio: 'Administrador com foco em suporte e auditoria interna.',
    cep: '60170110',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Meireles',
    street: 'Avenida Dom Luís',
    number: '500',
    complement: 'Conjunto 1204',
  },
];

const patients = [
  {
    name: 'Marina Costa',
    email: 'marina.patient@psique.local',
    cpf: '39053344705',
    phone: '85988887711',
    birthDate: new Date('1993-05-10T00:00:00.000Z'),
    gender: 'Feminino',
    bio: 'Paciente de exemplo com preferência por acompanhamento contínuo.',
    cep: '60744115',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Parangaba',
    street: 'Rua Germano Franck',
    number: '212',
    complement: 'Apto 402',
    patientProfile: {
      emergencyContactName: 'Pedro Costa',
      emergencyContactPhone: '85977776666',
      shareDiaryWithProfessionals: true,
    },
    questionnaire: {
      motivoTerapia: 0,
      abordagem: 1,
      estiloTerapeutico: 2,
      objetivo: 0,
      genero: 3,
      experiencia: 1,
      contextos: [1, 0, 0, 0, 1],
      ignoraContextos: false,
      tempoBusca: 0,
      experienciaPrevia: 0,
      precisaSuporteFora: false,
      restricaoHorario: false,
    },
  },
  {
    name: 'Lucas Almeida',
    email: 'lucas.patient@psique.local',
    cpf: '93541134780',
    phone: '85988887722',
    birthDate: new Date('1990-11-02T00:00:00.000Z'),
    gender: 'Masculino',
    bio: 'Paciente de exemplo com diário privado desativado para compartilhamento.',
    cep: '60541640',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Fátima',
    street: 'Rua Barão de Aratanha',
    number: '945',
    complement: 'Casa',
    patientProfile: {
      emergencyContactName: 'Renata Almeida',
      emergencyContactPhone: '85977775555',
      shareDiaryWithProfessionals: false,
    },
    questionnaire: {
      motivoTerapia: 2,
      abordagem: 0,
      estiloTerapeutico: 0,
      objetivo: 1,
      genero: 4,
      experiencia: 2,
      contextos: [0, 1, 1, 0, 0],
      ignoraContextos: false,
      tempoBusca: 2,
      experienciaPrevia: 2,
      precisaSuporteFora: true,
      restricaoHorario: true,
    },
  },
];

const professionals = [
  {
    name: 'Dra. Paula Siqueira',
    email: 'paula.professional@psique.local',
    cpf: '12345678909',
    phone: '85977770011',
    birthDate: new Date('1987-07-18T00:00:00.000Z'),
    gender: 'Feminino',
    bio: 'Psicóloga clínica com foco em terapia cognitivo-comportamental.',
    cep: '60160190',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Meireles',
    street: 'Rua Vicente Leite',
    number: '1450',
    complement: 'Consultório 05',
    professionalProfile: {
      crp: 'CRP-11/0001',
      specialty: 'Terapia Cognitivo-Comportamental',
      approvalStatus: ProfessionalApprovalStatus.APPROVED,
      onlineStatus: OnlineStatus.ONLINE,
      availableForEmergency: true,
      autoAbsenceMessage: 'Em atendimento no momento. Retorno em breve.',
      gapBetweenAppointmentsMinutes: 15,
    },
    questionnaire: {
      motivosTerapia: [1, 0, 1, 0, 0],
      abordagem: 1,
      estiloTerapeutico: 2,
      objetivo: 0,
      genero: 0,
      experiencia: 1,
      contextos: [1, 0, 1, 0, 1],
      suporteFora: 1,
      periodoAtendimento: 0,
    },
  },
  {
    name: 'Dr. Rafael Nogueira',
    email: 'rafael.professional@psique.local',
    cpf: '98765432100',
    phone: '85977770022',
    birthDate: new Date('1983-01-25T00:00:00.000Z'),
    gender: 'Masculino',
    bio: 'Psicólogo de exemplo com atuação em saúde mental ocupacional.',
    cep: '60811105',
    state: 'CE',
    city: 'Fortaleza',
    neighborhood: 'Guararapes',
    street: 'Rua Francisco Matos',
    number: '88',
    complement: 'Sala 07',
    professionalProfile: {
      crp: 'CRP-11/0002',
      specialty: 'Psicologia Organizacional',
      approvalStatus: ProfessionalApprovalStatus.APPROVED,
      onlineStatus: OnlineStatus.OFFLINE,
      availableForEmergency: false,
      autoAbsenceMessage: 'Atendimentos retomados às 14h.',
      gapBetweenAppointmentsMinutes: 30,
    },
    questionnaire: {
      motivosTerapia: [0, 1, 1, 1, 0],
      abordagem: 4,
      estiloTerapeutico: 3,
      objetivo: 2,
      genero: 1,
      experiencia: 2,
      contextos: [0, 1, 0, 1, 0],
      suporteFora: 0,
      periodoAtendimento: 1,
    },
  },
];

async function upsertAdmin(admin, passwordHash) {
  await prisma.user.upsert({
    where: { email: admin.email },
    create: {
      name: admin.name,
      email: admin.email,
      cpf: admin.cpf,
      passwordHash,
      birthDate: admin.birthDate,
      gender: admin.gender,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: admin.phone,
      bio: admin.bio,
      cep: admin.cep,
      state: admin.state,
      city: admin.city,
      neighborhood: admin.neighborhood,
      street: admin.street,
      number: admin.number,
      complement: admin.complement,
    },
    update: {
      name: admin.name,
      cpf: admin.cpf,
      passwordHash,
      birthDate: admin.birthDate,
      gender: admin.gender,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      phone: admin.phone,
      bio: admin.bio,
      cep: admin.cep,
      state: admin.state,
      city: admin.city,
      neighborhood: admin.neighborhood,
      street: admin.street,
      number: admin.number,
      complement: admin.complement,
    },
  });
}

async function syncPatientQuestionnaire(userId, patient, questionnaireMode) {
  if (questionnaireMode === 'with') {
    await prisma.patientQuestionnaire.upsert({
      where: { userId },
      create: {
        userId,
        ...patient.questionnaire,
      },
      update: patient.questionnaire,
    });
    return;
  }

  await prisma.patientQuestionnaire.deleteMany({
    where: { userId },
  });
}

async function upsertPatient(patient, passwordHash, questionnaireMode) {
  const user = await prisma.user.upsert({
    where: { email: patient.email },
    create: {
      name: patient.name,
      email: patient.email,
      cpf: patient.cpf,
      passwordHash,
      birthDate: patient.birthDate,
      gender: patient.gender,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: patient.phone,
      bio: patient.bio,
      cep: patient.cep,
      state: patient.state,
      city: patient.city,
      neighborhood: patient.neighborhood,
      street: patient.street,
      number: patient.number,
      complement: patient.complement,
      patientProfile: {
        create: patient.patientProfile,
      },
    },
    update: {
      name: patient.name,
      cpf: patient.cpf,
      passwordHash,
      birthDate: patient.birthDate,
      gender: patient.gender,
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      phone: patient.phone,
      bio: patient.bio,
      cep: patient.cep,
      state: patient.state,
      city: patient.city,
      neighborhood: patient.neighborhood,
      street: patient.street,
      number: patient.number,
      complement: patient.complement,
      patientProfile: {
        upsert: {
          create: patient.patientProfile,
          update: patient.patientProfile,
        },
      },
    },
  });

  await syncPatientQuestionnaire(user.id, patient, questionnaireMode);
}

async function syncProfessionalQuestionnaire(userId, professional, questionnaireMode) {
  if (questionnaireMode === 'with') {
    await prisma.professionalQuestionnaire.upsert({
      where: { userId },
      create: {
        userId,
        ...professional.questionnaire,
      },
      update: professional.questionnaire,
    });
    return;
  }

  await prisma.professionalQuestionnaire.deleteMany({
    where: { userId },
  });
}

async function upsertProfessional(professional, passwordHash, questionnaireMode) {
  const existingByCrp = await prisma.professionalProfile.findUnique({
    where: { crp: professional.professionalProfile.crp },
    select: { userId: true },
  });

  const existingByEmail = await prisma.user.findUnique({
    where: { email: professional.email },
    select: { id: true },
  });

  if (existingByCrp && existingByEmail && existingByCrp.userId !== existingByEmail.id) {
    throw new Error(
      `O CRP ${professional.professionalProfile.crp} já está vinculado a outro usuário.`,
    );
  }

  const user = await prisma.user.upsert({
    where: { email: professional.email },
    create: {
      name: professional.name,
      email: professional.email,
      cpf: professional.cpf,
      passwordHash,
      birthDate: professional.birthDate,
      gender: professional.gender,
      role: Role.PROFESSIONAL,
      status: UserStatus.ACTIVE,
      phone: professional.phone,
      bio: professional.bio,
      cep: professional.cep,
      state: professional.state,
      city: professional.city,
      neighborhood: professional.neighborhood,
      street: professional.street,
      number: professional.number,
      complement: professional.complement,
      professionalProfile: {
        create: professional.professionalProfile,
      },
    },
    update: {
      name: professional.name,
      cpf: professional.cpf,
      passwordHash,
      birthDate: professional.birthDate,
      gender: professional.gender,
      role: Role.PROFESSIONAL,
      status: UserStatus.ACTIVE,
      phone: professional.phone,
      bio: professional.bio,
      cep: professional.cep,
      state: professional.state,
      city: professional.city,
      neighborhood: professional.neighborhood,
      street: professional.street,
      number: professional.number,
      complement: professional.complement,
      professionalProfile: {
        upsert: {
          create: professional.professionalProfile,
          update: professional.professionalProfile,
        },
      },
    },
  });

  await syncProfessionalQuestionnaire(user.id, professional, questionnaireMode);
}

function parseSelectedKinds() {
  const entitiesArg = process.argv
    .slice(2)
    .find((argument) => argument.startsWith('--entities='));

  if (!entitiesArg) {
    return new Set(validEntityKinds);
  }

  const selectedKinds = entitiesArg
    .slice('--entities='.length)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (selectedKinds.length === 0 || selectedKinds.includes('all')) {
    return new Set(validEntityKinds);
  }

  const invalidKinds = selectedKinds.filter((kind) => !validEntityKinds.includes(kind));

  if (invalidKinds.length > 0) {
    throw new Error(
      `Entidades inválidas para o seed: ${invalidKinds.join(', ')}. Use admins, patients, professionals ou all.`,
    );
  }

  return new Set(selectedKinds);
}

function parseQuestionnaireMode() {
  const questionnairesArg = process.argv
    .slice(2)
    .find((argument) => argument.startsWith('--questionnaires='));

  if (!questionnairesArg) {
    return 'without';
  }

  const mode = questionnairesArg.slice('--questionnaires='.length).trim().toLowerCase();

  if (!validQuestionnaireModes.includes(mode)) {
    throw new Error(`Modo de questionario invalido: ${mode}. Use with ou without.`);
  }

  return mode;
}

function printCredentials(selectedKinds, questionnaireMode) {
  console.log('\nSeed concluído com sucesso.\n');
  console.log(`Senha padrão para todas as contas: ${defaultPassword}\n`);

  if (selectedKinds.has('admins')) {
    console.log('Admins:');
    for (const admin of admins) {
      console.log(`- ${admin.name} | ${admin.email}`);
    }
  }

  if (selectedKinds.has('patients')) {
    console.log('\nPacientes:');
    for (const patient of patients) {
      console.log(`- ${patient.name} | ${patient.email}`);
    }
    console.log(
      `Questionario de pacientes: ${questionnaireMode === 'with' ? 'respondido' : 'nao respondido'}`,
    );
  }

  if (selectedKinds.has('professionals')) {
    console.log('\nProfissionais:');
    for (const professional of professionals) {
      console.log(
        `- ${professional.name} | ${professional.email} | ${professional.professionalProfile.crp}`,
      );
    }
    console.log(
      `Questionario de profissionais: ${
        questionnaireMode === 'with' ? 'respondido' : 'nao respondido'
      }`,
    );
  }

  console.log('');
}

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const selectedKinds = parseSelectedKinds();
  const questionnaireMode = parseQuestionnaireMode();

  if (selectedKinds.has('admins')) {
    for (const admin of admins) {
      await upsertAdmin(admin, passwordHash);
    }
  }

  if (selectedKinds.has('patients')) {
    for (const patient of patients) {
      await upsertPatient(patient, passwordHash, questionnaireMode);
    }
  }

  if (selectedKinds.has('professionals')) {
    for (const professional of professionals) {
      await upsertProfessional(professional, passwordHash, questionnaireMode);
    }
  }

  printCredentials(selectedKinds, questionnaireMode);
}

main()
  .catch((error) => {
    console.error(
      `Falha ao executar o seed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
