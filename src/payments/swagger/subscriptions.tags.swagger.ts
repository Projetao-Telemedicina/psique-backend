import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function SubscriptionsApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Subscriptions'), ApiBearerAuth('access-token'));
}
