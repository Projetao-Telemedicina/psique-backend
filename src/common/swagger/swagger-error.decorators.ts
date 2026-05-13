import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type CommonErrorResponseOptions = {
  includeBadRequest?: boolean;
  includeConflict?: boolean;
  includeUnauthorized?: boolean;
  includeForbidden?: boolean;
  includeNotFound?: boolean;
  includeInternalServerError?: boolean;
};

type ErrorDescriptor = {
  statusCode: number;
  code:
    | 'BAD_REQUEST'
    | 'CONFLICT'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'INTERNAL_SERVER_ERROR';
  error: string;
  message: string;
};

const defaultErrors: Record<string, ErrorDescriptor> = {
  badRequest: {
    statusCode: 400,
    code: 'BAD_REQUEST',
    error: 'Bad Request',
    message: 'A requisição possui dados inválidos.',
  },
  conflict: {
    statusCode: 409,
    code: 'CONFLICT',
    error: 'Conflict',
    message: 'O recurso informado já existe ou viola uma restrição única.',
  },
  unauthorized: {
    statusCode: 401,
    code: 'UNAUTHORIZED',
    error: 'Unauthorized',
    message: 'Token JWT ausente, inválido ou expirado.',
  },
  forbidden: {
    statusCode: 403,
    code: 'FORBIDDEN',
    error: 'Forbidden',
    message: 'Você não possui permissão para acessar este recurso.',
  },
  notFound: {
    statusCode: 404,
    code: 'NOT_FOUND',
    error: 'Not Found',
    message: 'Recurso não encontrado.',
  },
  internalServerError: {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    error: 'Internal Server Error',
    message: 'Erro interno inesperado ao processar a requisição.',
  },
};

function buildErrorSchema(error: ErrorDescriptor) {
  return {
    type: 'object',
    properties: {
      statusCode: {
        type: 'number',
        enum: [error.statusCode],
        example: error.statusCode,
      },
      code: {
        type: 'string',
        enum: [error.code],
        example: error.code,
      },
      error: {
        type: 'string',
        example: error.error,
      },
      message: {
        oneOf: [
          { type: 'string', example: error.message },
          {
            type: 'array',
            items: { type: 'string' },
            example: [error.message],
          },
        ],
      },
    },
    required: ['statusCode', 'code', 'error', 'message'],
  };
}

export function ApiCommonErrorResponses(
  options: CommonErrorResponseOptions = {},
): MethodDecorator {
  const decorators: Array<ClassDecorator | MethodDecorator> = [];

  if (options.includeBadRequest ?? true) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Erro de validação da requisição.',
        schema: buildErrorSchema(defaultErrors.badRequest),
      }),
    );
  }

  if (options.includeConflict ?? false) {
    decorators.push(
      ApiConflictResponse({
        description: 'Conflito com dados já existentes.',
        schema: buildErrorSchema(defaultErrors.conflict),
      }),
    );
  }

  if (options.includeUnauthorized ?? true) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Não autenticado para executar a operação.',
        schema: buildErrorSchema(defaultErrors.unauthorized),
      }),
    );
  }

  if (options.includeForbidden ?? true) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Acesso negado para este recurso.',
        schema: buildErrorSchema(defaultErrors.forbidden),
      }),
    );
  }

  if (options.includeNotFound ?? true) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Recurso solicitado não encontrado.',
        schema: buildErrorSchema(defaultErrors.notFound),
      }),
    );
  }

  if (options.includeInternalServerError ?? true) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: 'Falha interna inesperada.',
        schema: buildErrorSchema(defaultErrors.internalServerError),
      }),
    );
  }

  return applyDecorators(...decorators);
}
