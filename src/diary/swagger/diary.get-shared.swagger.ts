import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { diaryEntryListResponseSchema } from './diary.schemas';

export function GetSharedDiaryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista registros compartilhados do paciente',
      description:
        'Permite que o profissional visualize os registros do diario do paciente quando ha compartilhamento habilitado e vinculo de consulta.',
    }),
    ApiUuidParam('patientId', 'ID do paciente.'),
    ApiOkResponse({
      description: 'Registros compartilhados retornados com sucesso.',
      schema: diaryEntryListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
