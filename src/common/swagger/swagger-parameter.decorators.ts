import { applyDecorators } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';

export function ApiUuidParam(
  name = 'id',
  description = 'Identificador único do recurso.',
): MethodDecorator {
  return applyDecorators(
    ApiParam({
      name,
      description,
      schema: {
        type: 'string',
        format: 'uuid',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
    }),
  );
}
