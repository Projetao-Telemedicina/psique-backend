import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export const COUPONS_API_TAG = 'Cupons';

export function CouponsApiTags(): ClassDecorator {
  return applyDecorators(ApiTags(COUPONS_API_TAG), ApiBearerAuth('access-token'));
}
