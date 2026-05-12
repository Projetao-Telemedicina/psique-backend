import { ApiProperty } from '@nestjs/swagger';
import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsUUID,
} from 'class-validator';

export class CreateRescheduleDto {
	@ApiProperty({
		description: 'ID da consulta que sera reagendada.',
	})
	@IsUUID('4', { message: 'O ID da consulta deve ser um UUID valido' })
	@IsNotEmpty({ message: 'O ID da consulta e obrigatorio' })
	appointmentId!: string;

	@ApiProperty({
		description: 'Data e hora sugeridas para o inicio da consulta (ISO 8601).',
	})
	@IsDateString({}, { message: 'A data de inicio deve ser ISO 8601' })
	@IsNotEmpty({ message: 'A data de inicio e obrigatoria' })
	suggestedStartsAt!: string;

	@ApiProperty({
		description: 'Data e hora sugeridas para o termino da consulta (ISO 8601).',
	})
	@IsDateString({}, { message: 'A data de termino deve ser ISO 8601' })
	@IsNotEmpty({ message: 'A data de termino e obrigatoria' })
	suggestedEndsAt!: string;

	@ApiProperty({
		required: false,
		description: 'Data limite para resposta ao reagendamento (ISO 8601).',
	})
	@IsOptional()
	@IsDateString({}, { message: 'A data de expiracao deve ser ISO 8601' })
	expiresAt?: string;
}
