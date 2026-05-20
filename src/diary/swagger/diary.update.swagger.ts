import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import {
    diaryEntryResponseSchema,
    updateDiaryRequestSchema,
} from './diary.schemas';

export function UpdateDiaryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza um registro de diario',
      description:
        'Atualiza os dados do registro de diario do paciente autenticado.',
    }),
    ApiUuidParam('id', 'ID do registro de diario.'),
    ApiBody({
      required: true,
      schema: updateDiaryRequestSchema,
    }),
    ApiOkResponse({
      description: 'Registro atualizado com sucesso.',
      schema: diaryEntryResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: false,
    }),
  );
}
