import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OnlineStatus } from '@prisma/client';

export class UpdateOnlineStatusDto {
    @ApiProperty({
        enum: OnlineStatus,
        description: 'Novo status online do profissional. Valores possíveis: ONLINE, OFFLINE.',
    })
    @IsEnum(OnlineStatus, {
        message: 'Status online inválido. Valores permitidos: ONLINE, OFFLINE'
    })
    @IsNotEmpty({ message: 'O status online é obrigatório' })
    onlineMode!: OnlineStatus;
}