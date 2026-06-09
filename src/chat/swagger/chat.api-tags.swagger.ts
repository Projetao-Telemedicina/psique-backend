import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

export function ChatControllerApiTags(): ClassDecorator {
  return applyDecorators(ApiTags('Chat'), ApiBearerAuth('access-token'));
}
