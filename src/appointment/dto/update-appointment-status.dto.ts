import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
    @ApiProperty({
        enum: AppointmentStatus,
        description: 'Novo status da consulta. Valores possíveis: SCHEDULED, RESCHEDULE_REQUESTED, CANCELED, COMPLETED, NO_SHOW.',
    })
    @IsEnum(AppointmentStatus, {
        message: 'Status da consulta inválido. Valores permitidos: SCHEDULED, RESCHEDULE_REQUESTED, CANCELED, COMPLETED, NO_SHOW'
    })
    @IsNotEmpty({ message: 'O status da consulta é obrigatório' })
    status!: AppointmentStatus;
}