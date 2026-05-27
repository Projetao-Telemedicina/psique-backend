import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPanicButtonActivationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
