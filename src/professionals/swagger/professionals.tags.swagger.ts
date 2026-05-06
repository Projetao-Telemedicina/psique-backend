import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function ProfessionalsControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Professionals'));
}
