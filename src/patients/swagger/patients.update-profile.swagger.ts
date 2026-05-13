import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import {
  patientProfileRequestSchema,
  patientProfileResponseSchema,
} from './patients.schemas';

type UpdatePatientProfileApiDocsOptions = {
  admin?: boolean;
};

export function UpdatePatientProfileApiDocs(
  options: UpdatePatientProfileApiDocsOptions = {},
): MethodDecorator {
  const isAdmin = options.admin ?? false;

  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: isAdmin
        ? 'Atualiza o perfil de um paciente como administrador'
        : 'Atualiza o próprio perfil do paciente',
      description: isAdmin
        ? 'Atualiza os dados específicos do perfil de qualquer paciente. Esta operação exige autenticação e perfil de administrador.'
        : 'Atualiza os dados específicos do perfil do paciente autenticado.',
    }),
    ...(isAdmin ? [ApiUuidParam('userId', 'ID do usuário paciente.')] : []),
    ApiBody({
      required: true,
      schema: patientProfileRequestSchema,
    }),
    ApiOkResponse({
      description: 'Perfil do paciente atualizado com sucesso.',
      schema: patientProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
