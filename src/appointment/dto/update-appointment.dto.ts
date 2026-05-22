import { PartialType, PickType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

export class UpdateAppointmentDto extends PartialType(
    PickType(CreateAppointmentDto, [
        'startsAt',
        'endsAt',
        'priceCents',
    ] as const),
) {}