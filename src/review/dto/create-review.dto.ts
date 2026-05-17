import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateReviewDto {
    @IsInt({ message: 'A nota deve ser um número inteiro' })
    @IsNotEmpty({ message: 'A nota é obrigatória' })
    @Min(1, { message: 'A nota mínima é 1' })
    @Max(5, { message: 'A nota máxima é 5' })
    rating!: number;

    @IsOptional()
    @IsString({ message: 'O comentário deve ser um texto' })
    @MaxLength(1000, { message: 'O comentário pode ter no máximo 1000 caracteres' })
    comment?: string;
}