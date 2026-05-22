import { applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export const DIARY_API_TAG = 'Diary';

export function DiaryApiTags(): ClassDecorator {
  return applyDecorators(ApiTags(DIARY_API_TAG));
}
