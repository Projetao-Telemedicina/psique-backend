import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';

const MOTIVOS_LABELS = [
  '0 = Saúde emocional',
  '1 = Relacionamentos',
  '2 = Vida profissional',
  '3 = Autoconhecimento',
  '4 = Crises e perdas',
].join(' | ');

const ABORDAGEM_LABELS = [
  '0 = TCC',
  '1 = Psicanálise',
  '2 = Humanista',
  '3 = Corporal',
  '4 = Sistêmica',
  '5 = Outra',
  '6 = Outra (neutro)',
].join(' | ');

const ESTILO_LABELS = [
  '0 = Ativo e direto',
  '1 = Reflexivo e analítico',
  '2 = Acolhedor e suporte',
  '3 = Equilibrado / Flexível',
].join(' | ');

const OBJETIVO_LABELS = [
  '0 = Clareza e profundidade',
  '1 = Resolução e praticidade',
  '2 = Ambos',
].join(' | ');

const GENERO_PROF_LABELS = [
  '0 = Mulher',
  '1 = Homem',
  '2 = Pessoa não-binária',
].join(' | ');

const EXPERIENCIA_PROF_LABELS = [
  '0 = Até 5 anos',
  '1 = 5 a 15 anos',
  '2 = Mais de 15 anos',
].join(' | ');

const CONTEXTOS_LABELS = [
  '0 = LGBTQIA+',
  '1 = Étnico-racial',
  '2 = Neurodiversidade',
  '3 = Feminismo',
  '4 = Espiritualidade',
].join(' | ');

const SUPORTE_FORA_LABELS = [
  '0 = Ofereço suporte pontual por mensagens',
  '1 = Limitado',
  '2 = Não ofereço suporte fora da sessão',
].join(' | ');

const PERIODO_ATENDIMENTO_LABELS = [
  '0 = Integral',
  '1 = Parcial',
  '2 = Pontual',
].join(' | ');

export class CreateProfessionalQuestionnaireDto {
  @ApiProperty({
    description: `Array binário de tamanho 5 (0/1). ${MOTIVOS_LABELS}`,
    type: [Number],
    example: [1, 0, 1, 0, 0],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  motivosTerapia!: number[];

  @ApiProperty({ description: ABORDAGEM_LABELS, minimum: 0, maximum: 6, example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  abordagem!: number;

  @ApiProperty({ description: ESTILO_LABELS, minimum: 0, maximum: 3, example: 2 })
  @IsInt()
  @Min(0)
  @Max(3)
  estiloTerapeutico!: number;

  @ApiProperty({ description: OBJETIVO_LABELS, minimum: 0, maximum: 2, example: 0 })
  @IsInt()
  @Min(0)
  @Max(2)
  objetivo!: number;

  @ApiProperty({ description: GENERO_PROF_LABELS, minimum: 0, maximum: 2, example: 0 })
  @IsInt()
  @Min(0)
  @Max(2)
  genero!: number;

  @ApiProperty({ description: EXPERIENCIA_PROF_LABELS, minimum: 0, maximum: 2, example: 1 })
  @IsInt()
  @Min(0)
  @Max(2)
  experiencia!: number;

  @ApiProperty({
    description: `Array binário de tamanho 5 (0/1). ${CONTEXTOS_LABELS}`,
    type: [Number],
    example: [1, 0, 1, 0, 1],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1, { each: true })
  contextos!: number[];

  @ApiProperty({ description: SUPORTE_FORA_LABELS, minimum: 0, maximum: 2, example: 1 })
  @IsInt()
  @Min(0)
  @Max(2)
  suporteFora!: number;

  @ApiProperty({ description: PERIODO_ATENDIMENTO_LABELS, minimum: 0, maximum: 2, example: 0 })
  @IsInt()
  @Min(0)
  @Max(2)
  periodoAtendimento!: number;
}
