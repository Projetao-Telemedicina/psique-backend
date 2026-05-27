import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function PanicButtonControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Panic Button'));
}
