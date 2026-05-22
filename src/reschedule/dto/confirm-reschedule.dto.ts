// dto/confirm-reschedule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ConfirmRescheduleDto {
    @ApiProperty({ description: 'Confirmacao ou recusa do reagendamento.' })
    @IsBoolean({ message: 'O campo confirmed deve ser um booleano.' })
    @IsNotEmpty({ message: 'O campo confirmed e obrigatorio.' })
    confirmed!: boolean;
}