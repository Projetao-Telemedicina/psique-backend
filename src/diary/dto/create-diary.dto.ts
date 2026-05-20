
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { DiaryFeeling, DiarySleepQuality } from '@prisma/client';

export class CreateDiaryDto {
    @IsEnum(DiaryFeeling)
    @IsNotEmpty()
    feeling!: DiaryFeeling;

    @IsOptional()
    @IsEnum(DiarySleepQuality)
    sleepQuality?: DiarySleepQuality;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    symptom?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    content?: string;
}