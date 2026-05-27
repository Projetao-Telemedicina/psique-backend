import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function MatchingControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Matching'));
}
