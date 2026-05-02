import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class UpdatePatientProfileDto {
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
