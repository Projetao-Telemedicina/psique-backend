import {
  dateTimeSchema,
  nullableStringSchema,
  uuidSchema,
} from '../../common/swagger/index';

// ---------------------------------------------------------------
// Labels das categorias — exibidos na documentação para contexto
// ---------------------------------------------------------------

const motivoTerapiaLabels = [
  'Saúde emocional',
  'Relacionamentos',
  'Vida profissional',
  'Autoconhecimento',
  'Crises e perdas',
  'Não tenho certeza',
] as const;

const abordagemLabels = [
  'TCC',
  'Psicanálise',
  'Humanista',
  'Corporal',
  'Sistêmica',
  'Não sei / Quero indicação',
  'Outra',
] as const;

const estiloLabels = [
  'Ativo e direto',
  'Reflexivo e analítico',
  'Acolhedor e suporte',
  'Equilibrado / Flexível',
  'Não sei',
] as const;

const objetivoLabels = [
  'Clareza e profundidade',
  'Resolução e praticidade',
  'Ambos',
  'Não tenho certeza',
] as const;

const generoPacienteLabels = [
  'Mulher',
  'Homem',
  'Pessoa não-binária',
  'Sem preferência',
  'Quero ver perfis variados',
] as const;

const generoProfissionalLabels = [
  'Mulher',
  'Homem',
  'Pessoa não-binária',
] as const;

const experienciaPacienteLabels = [
  'Conectado às novas tendências',
  'Equilíbrio teoria e prática',
  'Trajetória consolidada',
  'Sem preferência',
  'Quero ver perfis variados',
] as const;

const experienciaProfissionalLabels = [
  'Até 5 anos',
  '5 a 15 anos',
  'Mais de 15 anos',
] as const;

const tempoBuscaLabels = [
  'Recentemente (algumas semanas)',
  'Há alguns meses',
  'Há um ano ou mais',
  'Não sei dizer ao certo',
] as const;

const experienciaPreviaLabels = [
  'Nunca fiz terapia',
  'Já fiz e tive boas experiências',
  'Já fiz, mas tive dificuldade de adaptação',
] as const;

const suporteForaLabels = [
  'Ofereço suporte pontual por mensagens',
  'Limitado',
  'Não ofereço suporte fora da sessão',
] as const;

const periodoAtendimentoLabels = [
  'Integral',
  'Parcial',
  'Pontual',
] as const;

const contextosLabels = [
  'LGBTQIA+',
  'Étnico-racial',
  'Neurodiversidade',
  'Feminismo',
  'Espiritualidade',
] as const;

// ---------------------------------------------------------------
// Helpers auxiliares para documentar campos inteiros com label
// ---------------------------------------------------------------

function enumIntSchema(
  values: readonly string[],
  exampleValue: number,
  min: number,
  max: number,
) {
  return {
    type: 'integer',
    minimum: min,
    maximum: max,
    description: values
      .map((label, idx) => `${idx} = ${label}`)
      .join(' | '),
    example: exampleValue,
  };
}

function binaryArraySchema(length: number, labels: readonly string[], example: number[]) {
  return {
    type: 'array',
    minItems: length,
    maxItems: length,
    description: `Array binário (0/1). Índices: ${labels
      .map((label, idx) => `${idx} = ${label}`)
      .join(' | ')}`,
    items: {
      type: 'integer',
      minimum: 0,
      maximum: 1,
    },
    example,
  };
}

// ---------------------------------------------------------------
// Patient Questionnaire schemas
// ---------------------------------------------------------------

const patientQuestionnaireRequestProperties = {
  motivoTerapia: enumIntSchema(motivoTerapiaLabels, 0, 0, 5),
  abordagem: enumIntSchema(abordagemLabels.slice(0, 6), 1, 0, 5),
  estiloTerapeutico: enumIntSchema(estiloLabels, 2, 0, 4),
  objetivo: enumIntSchema(objetivoLabels, 0, 0, 3),
  genero: enumIntSchema(generoPacienteLabels, 3, 0, 4),
  experiencia: enumIntSchema(experienciaPacienteLabels, 1, 0, 4),
  contextos: binaryArraySchema(5, contextosLabels, [1, 0, 0, 0, 1]),
  ignoraContextos: {
    type: 'boolean',
    description: 'Ignorar filtro de contextos no matching.',
    default: false,
    example: false,
  },
  tempoBusca: enumIntSchema(tempoBuscaLabels, 1, 0, 3),
  experienciaPrevia: enumIntSchema(experienciaPreviaLabels, 0, 0, 2),
  precisaSuporteFora: {
    type: 'boolean',
    description: 'Precisa de suporte por mensagens entre sessões.',
    default: false,
    example: false,
  },
  restricaoHorario: {
    type: 'boolean',
    description: 'Possui restrição de horário para atendimento.',
    default: false,
    example: false,
  },
};

export const patientQuestionnaireRequestSchema = {
  type: 'object',
  properties: patientQuestionnaireRequestProperties,
  required: [
    'motivoTerapia',
    'abordagem',
    'estiloTerapeutico',
    'objetivo',
    'genero',
    'experiencia',
    'contextos',
    'tempoBusca',
    'experienciaPrevia',
  ],
};

const patientQuestionnaireResponseProperties = {
  userId: uuidSchema('fd356e1a-5614-46cf-a870-4bcb4f0f6ed8'),
  ...patientQuestionnaireRequestProperties,
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const patientQuestionnaireResponseSchema = {
  type: 'object',
  properties: patientQuestionnaireResponseProperties,
  required: [
    'userId',
    'motivoTerapia',
    'abordagem',
    'estiloTerapeutico',
    'objetivo',
    'genero',
    'experiencia',
    'contextos',
    'tempoBusca',
    'experienciaPrevia',
    'createdAt',
    'updatedAt',
  ],
};

// ---------------------------------------------------------------
// Professional Questionnaire schemas
// ---------------------------------------------------------------

const professionalQuestionnaireRequestProperties = {
  motivosTerapia: binaryArraySchema(5, motivoTerapiaLabels.slice(0, 5), [1, 0, 1, 0, 0]),
  abordagem: enumIntSchema(abordagemLabels, 1, 0, 6),
  estiloTerapeutico: enumIntSchema(estiloLabels.slice(0, 4), 2, 0, 3),
  objetivo: enumIntSchema(objetivoLabels.slice(0, 3), 0, 0, 2),
  genero: enumIntSchema(generoProfissionalLabels, 0, 0, 2),
  experiencia: enumIntSchema(experienciaProfissionalLabels, 1, 0, 2),
  contextos: binaryArraySchema(5, contextosLabels, [1, 0, 1, 0, 1]),
  suporteFora: enumIntSchema(suporteForaLabels, 1, 0, 2),
  periodoAtendimento: enumIntSchema(periodoAtendimentoLabels, 0, 0, 2),
};

export const professionalQuestionnaireRequestSchema = {
  type: 'object',
  properties: professionalQuestionnaireRequestProperties,
  required: [
    'motivosTerapia',
    'abordagem',
    'estiloTerapeutico',
    'objetivo',
    'genero',
    'experiencia',
    'contextos',
    'suporteFora',
    'periodoAtendimento',
  ],
};

const professionalQuestionnaireResponseProperties = {
  userId: uuidSchema('b81d5e2a-6725-57df-b981-5cdc5e1f7fe9'),
  ...professionalQuestionnaireRequestProperties,
  createdAt: dateTimeSchema('2026-05-05T12:00:00.000Z'),
  updatedAt: dateTimeSchema('2026-05-05T12:30:00.000Z'),
};

export const professionalQuestionnaireResponseSchema = {
  type: 'object',
  properties: professionalQuestionnaireResponseProperties,
  required: [
    'userId',
    'motivosTerapia',
    'abordagem',
    'estiloTerapeutico',
    'objetivo',
    'genero',
    'experiencia',
    'contextos',
    'suporteFora',
    'periodoAtendimento',
    'createdAt',
    'updatedAt',
  ],
};

// ---------------------------------------------------------------
// Match Recommendation schemas (response)
// ---------------------------------------------------------------

const matchRecommendationItemProperties = {
  professionalId: uuidSchema('b81d5e2a-6725-57df-b981-5cdc5e1f7fe9'),
  professionalName: {
    type: 'string',
    example: 'Dra. Maria Oliveira',
  },
  avatarUrl: nullableStringSchema('https://cdn.psique.com/avatars/prof-01.jpg'),
  specialty: nullableStringSchema('Terapia Cognitivo-Comportamental'),
  scoreAvg: {
    type: 'number',
    format: 'float',
    description: 'Média de score nas avaliações (0-5).',
    example: 4.5,
  },
  reviewCount: {
    type: 'integer',
    example: 12,
  },
  scoreDisplay: {
    type: 'number',
    format: 'float',
    description: 'Score de match normalizado para exibição (0-100).',
    example: 100.0,
  },
  scoreBruto: {
    type: 'number',
    format: 'float',
    description: 'Score bruto antes da normalização.',
    example: 8.4839,
  },
  cosine: {
    type: 'number',
    format: 'float',
    description: 'Cosine similarity entre vetores one-hot.',
    example: 0.707,
  },
  hamming: {
    type: 'number',
    format: 'float',
    description: 'Distância de Hamming ponderada normalizada para [0,1].',
    example: 0.1,
  },
  penalidade: {
    type: 'number',
    format: 'float',
    description: 'Penalidades soft aplicadas (gênero, experiência).',
    example: 0.0,
  },
  modClinico: {
    type: 'number',
    format: 'float',
    description: 'Modificador clínico aplicado ao score.',
    example: 0.0,
  },
  explicacoes: {
    type: 'array',
    description: 'Explicações textuais do match.',
    items: { type: 'string' },
    example: [
      'Foco clínico compatível: Saúde emocional',
      'Abordagem compatível: Psicanálise',
    ],
  },
};

const matchRecommendationItemSchema = {
  type: 'object',
  properties: matchRecommendationItemProperties,
  required: [
    'professionalId',
    'professionalName',
    'scoreAvg',
    'reviewCount',
    'scoreDisplay',
    'scoreBruto',
    'cosine',
    'hamming',
    'penalidade',
    'modClinico',
    'explicacoes',
  ],
};

export const matchRecommendationsResponseSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      description: 'Lista de profissionais recomendados (top-N).',
      items: matchRecommendationItemSchema,
    },
  },
  required: ['recommendations'],
};

// ---------------------------------------------------------------
// Exemplos para o Swagger
// ---------------------------------------------------------------

export const patientQuestionnaireRequestExample = {
  summary: 'Paciente iniciante com preferência por acolhimento',
  value: {
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
};

export const patientQuestionnaireRequestExamples = {
  pacienteIniciante: patientQuestionnaireRequestExample,
};

export const professionalQuestionnaireRequestExample = {
  summary: 'Profissional com abordagem psicanalítica e postura acolhedora',
  value: {
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
};

export const professionalQuestionnaireRequestExamples = {
  profissionalPadrao: professionalQuestionnaireRequestExample,
};

export const matchRecommendationsResponseExample = {
  summary: 'Recomendações com um profissional',
  value: {
    recommendations: [
      {
        professionalId: 'b81d5e2a-6725-57df-b981-5cdc5e1f7fe9',
        professionalName: 'Dra. Maria Oliveira',
        avatarUrl: 'https://cdn.psique.com/avatars/prof-01.jpg',
        specialty: 'Terapia Cognitivo-Comportamental',
        scoreAvg: 4.5,
        reviewCount: 12,
        scoreDisplay: 100.0,
        scoreBruto: 8.4839,
        cosine: 0.707,
        hamming: 0.0,
        penalidade: 0.0,
        modClinico: 0.0,
        explicacoes: [
          'Foco clínico compatível: Saúde emocional',
          'Abordagem compatível: Psicanálise',
          'Postura terapêutica alinhada: Acolhedor e suporte',
          'Objetivo em comum: Clareza e profundidade',
          'Especialidade em comum: LGBTQIA+',
          'Especialidade em comum: Espiritualidade',
        ],
      },
    ],
  },
};
