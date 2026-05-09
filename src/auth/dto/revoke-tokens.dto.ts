import { IsNotEmpty, IsUUID } from 'class-validator';

export class RevokeTokensDto {
  @IsUUID('4', { message: 'userId deve ser um UUID valido' })
  @IsNotEmpty({ message: 'userId e obrigatorio' })
  userId!: string;
}
