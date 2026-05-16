import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { diaryEntryResponseSchema } from './diary.schemas';

export function GetDiaryByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um registro de diario por ID',
      description:
        'Retorna um registro de diario especifico a partir do identificador informado.',
    }),
    ApiUuidParam('id', 'ID do registro de diario.'),
    ApiOkResponse({
      description: 'Registro encontrado com sucesso.',
      schema: diaryEntryResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: false,
    }),
  );
}
