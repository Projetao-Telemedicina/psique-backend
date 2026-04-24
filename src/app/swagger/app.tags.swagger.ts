import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function AppControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('App'));
}
