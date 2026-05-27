import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePanicButtonActivationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
