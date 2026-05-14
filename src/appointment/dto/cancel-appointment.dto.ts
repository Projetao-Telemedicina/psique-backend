import { ApiProperty } from '@nestjs/swagger';
import { AppointmentCanceledBy } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({
    enum: AppointmentCanceledBy,
    description:
      'Quem está cancelando a consulta. Valores possíveis: PATIENT, PROFESSIONAL, ADMIN, SYSTEM.',
  })
  @IsEnum(AppointmentCanceledBy, {
    message:
      'O campo canceledBy deve ser um dos valores: PATIENT, PROFESSIONAL, ADMIN ou SYSTEM',
  })
  @IsNotEmpty({ message: 'O campo canceledBy é obrigatório' })
  canceledBy!: AppointmentCanceledBy;

  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Motivo opcional do cancelamento.',
  })
  @IsOptional()
  @IsString({ message: 'O motivo do cancelamento deve ser uma string' })
  @MaxLength(500, {
    message: 'O motivo do cancelamento deve ter no máximo 500 caracteres',
  })
  cancellationReason?: string;
}