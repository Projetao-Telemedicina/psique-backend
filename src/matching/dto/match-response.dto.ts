import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchRecommendationDto {
  @ApiProperty({
    description: 'ID do profissional.',
    format: 'uuid',
    example: 'b81d5e2a-6725-57df-b981-5cdc5e1f7fe9',
  })
  professionalId!: string;

  @ApiProperty({
    description: 'Nome completo do profissional.',
    example: 'Dra. Maria Oliveira',
  })
  professionalName!: string;

  @ApiPropertyOptional({
    description: 'URL do avatar do profissional.',
    example: 'https://cdn.psique.com/avatars/prof-01.jpg',
  })
  avatarUrl!: string | null;

  @ApiPropertyOptional({
    description: 'Especialidade do profissional.',
    example: 'Terapia Cognitivo-Comportamental',
  })
  specialty!: string | null;

  @ApiProperty({
    description: 'Média de score nas avaliações (0 a 5).',
    example: 4.5,
  })
  scoreAvg!: number;

  @ApiProperty({
    description: 'Total de avaliações recebidas.',
    example: 12,
  })
  reviewCount!: number;

  @ApiProperty({
    description: 'Score de match normalizado para exibição (0 a 100).',
    example: 100.0,
  })
  scoreDisplay!: number;

  @ApiProperty({
    description: 'Score bruto antes da normalização min-max.',
    example: 8.4839,
  })
  scoreBruto!: number;

  @ApiProperty({
    description: 'Cosine similarity entre vetores one-hot do paciente e profissional.',
    example: 0.707,
  })
  cosine!: number;

  @ApiProperty({
    description: 'Distância de Hamming ponderada normalizada para [0, 1].',
    example: 0.1,
  })
  hamming!: number;

  @ApiProperty({
    description: 'Penalidades soft aplicadas (gênero, experiência).',
    example: 0.0,
  })
  penalidade!: number;

  @ApiProperty({
    description: 'Modificador clínico aplicado ao score (contexto do paciente).',
    example: 0.0,
  })
  modClinico!: number;

  @ApiProperty({
    description: 'Explicações textuais dos motivos do match.',
    type: [String],
    example: [
      'Foco clínico compatível: Saúde emocional',
      'Abordagem compatível: Psicanálise',
      'Postura terapêutica alinhada: Acolhedor e suporte',
    ],
  })
  explicacoes!: string[];
}

export class MatchResponseDto {
  @ApiProperty({
    description: 'Lista de profissionais recomendados, ordenados por score decrescente (top-N).',
    type: [MatchRecommendationDto],
  })
  recommendations!: MatchRecommendationDto[];
}
