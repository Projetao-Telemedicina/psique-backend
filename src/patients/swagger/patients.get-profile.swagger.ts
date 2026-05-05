import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index.js';
import { patientProfileWithUserResponseSchema } from './patients.schemas.js';

export function GetPatientProfileApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca o perfil do paciente',
      description:
        'Retorna os dados do perfil do paciente e as principais informações públicas do usuário associado.',
    }),
    ApiUuidParam('userId', 'ID do usuário paciente.'),
    ApiOkResponse({
      description: 'Perfil do paciente encontrado com sucesso.',
      schema: patientProfileWithUserResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
