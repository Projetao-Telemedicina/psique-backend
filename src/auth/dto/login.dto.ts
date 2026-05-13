import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email deve ser um endereco de email valido' })
  @IsNotEmpty({ message: 'O e-mail e obrigatorio' })
  @MaxLength(255, { message: 'O e-mail deve ter no maximo 255 caracteres' })
  email!: string;

  @IsString({ message: 'A senha deve ser um texto com letras e numeros' })
  @IsNotEmpty({ message: 'A senha e obrigatoria' })
  @MinLength(8, { message: 'A senha deve ter no minimo 8 caracteres' })
  @MaxLength(72, { message: 'A senha deve ter no maximo 72 caracteres' })
  password!: string;
}
