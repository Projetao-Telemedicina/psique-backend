import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export function UsersControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Users'));
}
