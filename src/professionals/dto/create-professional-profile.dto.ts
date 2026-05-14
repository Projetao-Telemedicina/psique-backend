import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProfessionalProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  crp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialty?: string;

  @IsOptional()
  @IsBoolean()
  availableForEmergency?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  autoAbsenceMessage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gapBetweenAppointmentsMinutes?: number;
}
