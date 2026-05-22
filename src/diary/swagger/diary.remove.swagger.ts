import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { diaryEntryResponseSchema } from './diary.schemas';

export function RemoveDiaryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove um registro de diario',
      description:
        'Remove um registro do diario do paciente autenticado pelo identificador informado.',
    }),
    ApiUuidParam('id', 'ID do registro de diario.'),
    ApiOkResponse({
      description: 'Registro removido com sucesso.',
      schema: diaryEntryResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: false,
    }),
  );
}
