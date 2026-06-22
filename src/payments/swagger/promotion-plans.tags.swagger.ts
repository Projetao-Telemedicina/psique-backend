import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function PromotionPlansApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('PromotionPlans'), ApiBearerAuth('access-token'));
}
