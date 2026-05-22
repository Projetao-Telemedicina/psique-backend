import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
  createReviewRequestSchema,
  reviewResponseSchema,
} from './review.schemas';

export function CreateReviewApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria uma avaliacao da consulta',
      description:
        'Permite que o paciente autenticado avalie uma consulta concluida, ' +
        'registrando nota e comentario opcionais.',
    }),
    ApiParam({
      name: 'id',
      type: 'string',
      format: 'uuid',
      description: 'ID da consulta',
    }),
    ApiBody({
      required: true,
      schema: createReviewRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Avaliacao criada com sucesso.',
      schema: reviewResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
      includeConflict: true,
    }),
  );
}
