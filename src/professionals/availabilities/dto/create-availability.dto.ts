import { 
    IsEnum, 
    IsInt, 
    IsOptional, 
    IsDateString, 
    Matches, 
    Min, 
    Max 
    } from 'class-validator';
import { RecurrenceType } from '@prisma/client';

export class CreateAvailabilityDto {
    @IsInt()
    @Min(0)
    @Max(6)
    weekday!: number;

    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'startTime deve estar no formato HH:MM',
    })
    startTime!: string;

    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: 'endTime deve estar no formato HH:MM',
    })
    endTime!: string;

    @IsEnum(RecurrenceType)
    recurrence!: RecurrenceType;

    @IsInt()
    @Min(30)
    @Max(120)
    @IsOptional()
    slotDurationMinutes?: number = 60;
}