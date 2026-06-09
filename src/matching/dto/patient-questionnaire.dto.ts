import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  Max,
  Min,
} from 'class-validator';

const MOTIVO_LABELS = [
  '0 = Saúde emocional',
  '1 = Relacionamentos',
  '2 = Vida profissional',
  '3 = Autoconhecimento',
  '4 = Crises e perdas',
  '5 = Não tenho certeza',
].join(' | ');

const ABORDAGEM_LABELS = [
  '0 = TCC',
  '1 = Psicanálise',
  '2 = Humanista',
  '3 = Corporal',
  '4 = Sistêmica',
  '5 = Não sei / Quero indicação',
].join(' | ');

const ESTILO_LABELS = [
  '0 = Ativo e direto',
  '1 = Reflexivo e analítico',
  '2 = Acolhedor e suporte',
  '3 = Equilibrado / Flexível',
  '4 = Não sei',
].join(' | ');

const OBJETIVO_LABELS = [
  '0 = Clareza e profundidade',
  '1 = Resolução e praticidade',
  '2 = Ambos',
  '3 = Não tenho certeza',
].join(' | ');

const GENERO_PACIENTE_LABELS = [
  '0 = Mulher',
  '1 = Homem',
  '2 = Pessoa não-binária',
  '3 = Sem preferência',
  '4 = Quero ver perfis variados',
].join(' | ');

const EXPERIENCIA_PACIENTE_LABELS = [
  '0 = Conectado às novas tendências',
  '1 = Equilíbrio teoria e prática',
  '2 = Trajetória consolidada',
  '3 = Sem preferência',
  '4 = Quero ver perfis variados',
].join(' | ');

const CONTEXTOS_LABELS = [
  '0 = LGBTQIA+',
  '1 = Étnico-racial',
  '2 = Neurodiversidade',
  '3 = Feminismo',
  '4 = Espiritualidade',
].join(' | ');

const TEMPO_BUSCA_LABELS = [
  '0 = Recentemente (algumas semanas)',
  '1 = Há alguns meses',
  '2 = Há um ano ou mais',
  '3 = Não sei dizer ao certo',
].join(' | ');

const EXPERIENCIA_PREVIA_LABELS = [
  '0 = Nunca fiz terapia',
  '1 = Já fiz e tive boas experiências',
  '2 = Já fiz, mas tive dificuldade de adaptação',
].join(' | ');

export class CreatePatientQuestionnaireDto {
  @ApiProperty({ description: MOTIVO_LABELS, minimum: 0, maximum: 5, example: 0 })
  @IsInt()
  @Min(0)
  @Max(5)
  motivoTerapia!: number;

  @ApiProperty({ description: ABORDAGEM_LABELS, minimum: 0, maximum: 5, example: 1 })
  @IsInt()
  @Min(0)
  @Max(5)
  abordagem!: number;

  @ApiProperty({ description: ESTILO_LABELS, minimum: 0, maximum: 4, example: 2 })
  @IsInt()
  @Min(0)
  @Max(4)
  estiloTerapeutico!: number;

  @ApiProperty({ description: OBJETIVO_LABELS, minimum: 0, maximum: 3, example: 0 })
  @IsInt()
  @Min(0)
  @Max(3)
  objetivo!: number;

  @ApiProperty({ description: GENERO_PACIENTE_LABELS, minimum: 0, maximum: 4, example: 3 })
  @IsInt()
  @Min(0)
  @Max(4)
  genero!: number;

  @ApiProperty({ description: EXPERIENCIA_PACIENTE_LABELS, minimum: 0, maximum: 4, example: 1 })
  @IsInt()
  @Min(0)
  @Max(4)
  experiencia!: number;

  @ApiProperty({
    description: `Array binário de tamanho 5 (0/1). ${CONTEXTOS_LABELS}`,
    type: [Number],
    example: [1, 0, 0, 0, 1],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  contextos!: number[];

  @ApiPropertyOptional({
    description: 'Se verdadeiro, ignora o filtro de contextos no algoritmo de matching.',
    default: false,
    example: false,
  })
  @IsBoolean()
  ignoraContextos: boolean = false;

  @ApiProperty({ description: TEMPO_BUSCA_LABELS, minimum: 0, maximum: 3, example: 1 })
  @IsInt()
  @Min(0)
  @Max(3)
  tempoBusca!: number;

  @ApiProperty({ description: EXPERIENCIA_PREVIA_LABELS, minimum: 0, maximum: 2, example: 0 })
  @IsInt()
  @Min(0)
  @Max(2)
  experienciaPrevia!: number;

  @ApiPropertyOptional({
    description: 'Se verdadeiro, o paciente precisa de suporte por mensagens entre as sessões.',
    default: false,
    example: false,
  })
  @IsBoolean()
  precisaSuporteFora: boolean = false;

  @ApiPropertyOptional({
    description: 'Se verdadeiro, o paciente possui restrição de horário para atendimento.',
    default: false,
    example: false,
  })
  @IsBoolean()
  restricaoHorario: boolean = false;
}
