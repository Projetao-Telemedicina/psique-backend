import {
  IsEmail,
  IsEnum,
  IsIn,
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
import { IsCPF, IsNoEmoji } from '@/common/validators/index';

function normalizeCpfValue({ value }: { value: unknown }): unknown {
  if (typeof value === 'string') {
    return value.replace(/\D/g, '');
  }

  return value;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR',
  'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
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
  @Transform(normalizeCpfValue)
  @IsCPF()
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  phone?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'A data de nascimento deve estar no formato YYYY-MM-DD',
  })
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsNoEmoji({ message: 'Sem emojis aqui' })
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
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'O CEP deve estar no formato XXXXX-XXX (ex: 12345-678)',
  })
  cep?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().trim() : value,
  )
  @IsIn(BRAZILIAN_STATES, {
    message: 'O estado deve ser uma sigla válida (ex: SP, RJ, MG)',
  })
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  @Matches(/^[\p{L}\s'-]+$/u, {
    message: 'A cidade deve conter apenas letras',
  })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^(\d+[a-zA-Z]?|[sS]\/[nN])$/, {
    message: 'O número deve ser um valor válido (ex: 123, 45B ou S/N)',
  })
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsNoEmoji({ message: 'Sem emojis aqui' })
  complement?: string;
}
