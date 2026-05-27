import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPanicButtonOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
