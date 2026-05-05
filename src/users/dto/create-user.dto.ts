import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { CreatePatientProfileDto } from '@/patients/dto/create-patient-profile.dto';
import { CreateProfessionalProfileDto } from '@/professionals/dto/create-professional-profile.dto';
import { IsCPF } from '@/common/validators/index';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail({}, { message: 'email deve ser um endereço de email válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @MaxLength(255, { message: 'O e-mail deve ter no máximo 255 caracteres' })
  email!: string;

  @IsString({ message: 'A senha deve ser um texto com letras e números' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' })
  password!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsCPF()
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data de nascimento deve estar no formato YYYY-MM-DD',
  })
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  patientProfile?: CreatePatientProfileDto;

  @IsOptional()
  professionalProfile?: CreateProfessionalProfileDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;
}
