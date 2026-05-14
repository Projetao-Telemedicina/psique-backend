import { Transform } from 'class-transformer';
import { ProfessionalRequestStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

function normalizeEmptyString({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export class ListProfessionalValidationRequestsDto {
  @IsOptional()
  @Transform(normalizeEmptyString)
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @Transform(normalizeEmptyString)
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @Transform(normalizeEmptyString)
  @IsString()
  @MaxLength(120)
  professionalName?: string;

  @IsOptional()
  @IsEnum(ProfessionalRequestStatus)
  status?: ProfessionalRequestStatus;

  @IsOptional()
  @IsDateString()
  submittedFrom?: string;

  @IsOptional()
  @IsDateString()
  submittedTo?: string;
}
