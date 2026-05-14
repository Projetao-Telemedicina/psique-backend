import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectProfessionalValidationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  rejectionReason!: string;
}
