import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function PlansApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Plans'), ApiBearerAuth('access-token'));
}
