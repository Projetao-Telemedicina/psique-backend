import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function RescheduleApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Reschedule'));
}
