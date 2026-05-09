import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
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
		description: 'ID do usuario solicitante do reagendamento.',
	})
	@IsUUID('4', { message: 'O ID do solicitante deve ser um UUID valido' })
	@IsNotEmpty({ message: 'O ID do solicitante e obrigatorio' })
	requestedBy!: string;

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
		description: 'Confirmacao do paciente, quando aplicavel.',
	})
	@IsOptional()
	@IsBoolean({ message: 'A confirmacao do paciente deve ser booleana' })
	patientConfirmed?: boolean;

	@ApiProperty({
		required: false,
		description: 'Confirmacao do profissional, quando aplicavel.',
	})
	@IsOptional()
	@IsBoolean({ message: 'A confirmacao do profissional deve ser booleana' })
	professionalConfirmed?: boolean;

	@ApiProperty({
		required: false,
		description: 'Data limite para resposta ao reagendamento (ISO 8601).',
	})
	@IsOptional()
	@IsDateString({}, { message: 'A data de expiracao deve ser ISO 8601' })
	expiresAt?: string;
}
