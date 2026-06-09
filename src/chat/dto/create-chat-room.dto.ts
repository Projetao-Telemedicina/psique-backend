import { IsOptional, IsUUID } from 'class-validator';

export class CreateChatRoomDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}
