import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    IsDateString,
    Min,
} from 'class-validator';

export class CreateAppointmentDto {
    @IsUUID('4', { message: 'O ID do profissional deve ser um UUID válido' })
    @IsNotEmpty({ message: 'O ID do profissional é obrigatório' })
    professionalId!: string;

    @IsOptional()
    @IsUUID('4', { message: 'O ID do paciente deve ser um UUID válido' })
    patientId?: string;

    @IsDateString({}, { message: 'A data de início deve ser uma data e hora ISO 8601 válida' })
    @IsNotEmpty({ message: 'A data de início é obrigatória' })
    startsAt!: string;

    @IsDateString({}, { message: 'A data de término deve ser uma data e hora ISO 8601 válida' })
    @IsNotEmpty({ message: 'A data de término é obrigatória' })
    endsAt!: string;

    @IsOptional()
    @IsInt({ message: 'O preço deve ser um número inteiro (em centavos)' })
    @Min(0, { message: 'O preço não pode ser negativo' })
    priceCents!: number;
}