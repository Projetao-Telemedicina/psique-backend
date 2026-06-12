import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function PaymentsApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Payments'), ApiBearerAuth('access-token'));
}
