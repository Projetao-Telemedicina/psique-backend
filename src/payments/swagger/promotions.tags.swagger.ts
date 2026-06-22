import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function PromotionsApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Promotions'), ApiBearerAuth('access-token'));
}
