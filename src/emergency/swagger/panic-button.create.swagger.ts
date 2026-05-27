import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
  createPanicButtonActivationSchema,
  panicButtonActivationResponseSchema,
} from './panic-button.schemas';

export function ActivatePanicButtonApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Aciona o botão do pânico',
      description:
        'Registra um novo acionamento do botão do pânico para o paciente autenticado e inicia a busca ' +
        'pelo primeiro psicólogo elegível disponível.',
    }),
    ApiBody({
      required: false,
      schema: createPanicButtonActivationSchema,
    }),
    ApiCreatedResponse({
      description: 'Acionamento do botão do pânico criado com sucesso.',
      schema: panicButtonActivationResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: false,
      includeConflict: true,
    }),
  );
}
