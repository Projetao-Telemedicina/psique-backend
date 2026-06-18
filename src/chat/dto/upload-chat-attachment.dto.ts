import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadChatAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;
}
