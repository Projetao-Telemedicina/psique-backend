import { PartialType } from '@nestjs/mapped-types';
import { PickType } from '@nestjs/swagger';
import { CreateAvailabilityDto } from './create-availability.dto';

export class UpdateAvailabilityDto extends PartialType(
    PickType(CreateAvailabilityDto, [
        'startTime',
        'endTime',
        'slotDurationMinutes',
        'recurrence',
    ] as const),
) {}