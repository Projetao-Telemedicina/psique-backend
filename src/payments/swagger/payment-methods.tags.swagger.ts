import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function PaymentMethodsApiTags(): ClassDecorator {
  return applyDecorators(
    ApiTags('Payment Methods'),
    ApiBearerAuth('access-token'),
  );
}
