import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export const APPOINTMENTS_API_TAG = 'Appointments';

export function AppointmentsApiTags(): ClassDecorator {
  return applyDecorators(ApiTags(APPOINTMENTS_API_TAG));
}