import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function AuthControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Auth'));
}
