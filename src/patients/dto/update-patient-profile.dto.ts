import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientProfileDto } from './create-patient-profile.dto';
import { PickType } from '@nestjs/swagger';

export class UpdatePatientProfileDto extends PartialType(PickType(CreatePatientProfileDto, ['emergencyContactName', 'emergencyContactPhone', 'shareDiaryWithProfessionals'] as const)) {}
