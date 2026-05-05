import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index.js';
import {
  patientProfileRequestSchema,
  patientProfileResponseSchema,
} from './patients.schemas.js';

export function UpdatePatientProfileApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza o perfil do paciente',
      description:
        'Atualiza os dados específicos do perfil do paciente vinculado ao usuário informado.',
    }),
    ApiUuidParam('userId', 'ID do usuário paciente.'),
    ApiBody({
      required: true,
      schema: patientProfileRequestSchema,
    }),
    ApiOkResponse({
      description: 'Perfil do paciente atualizado com sucesso.',
      schema: patientProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
