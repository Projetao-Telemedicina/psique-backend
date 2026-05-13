import { PartialType, PickType } from '@nestjs/swagger';
import { CreateRescheduleDto } from './create-reschedule.dto';

export class UpdateRescheduleDto extends PartialType(
	PickType(CreateRescheduleDto, [
		'suggestedStartsAt',
		'suggestedEndsAt',
		'expiresAt',
	] as const),
) {}
