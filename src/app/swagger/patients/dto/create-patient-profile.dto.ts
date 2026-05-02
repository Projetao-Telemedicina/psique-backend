import { IsOptional, IsDateString, IsString, IsBoolean } from 'class-validator';

export class CreatePatientProfileDto {
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsBoolean()
  shareDiaryWithProfessionals?: boolean;
}