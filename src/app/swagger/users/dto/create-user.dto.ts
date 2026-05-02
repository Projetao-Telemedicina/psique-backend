import { CreatePatientProfileDto } from './create-patient-profile.dto';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  cpf?: string;

  @IsOptional()
  phone?: string;

  // profissional
  @IsOptional()
  crp?: string;

  @IsOptional()
  specialty?: string;

  @IsOptional()
  patientProfile?: CreatePatientProfileDto;
}
