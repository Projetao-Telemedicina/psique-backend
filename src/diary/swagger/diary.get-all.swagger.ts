import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { diaryEntryListResponseSchema } from './diary.schemas';

export function GetAllDiaryEntriesApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todos os registros de diario',
      description:
        'Retorna todos os registros de diario cadastrados no sistema, ordenados do mais recente para o mais antigo.',
    }),
    ApiOkResponse({
      description: 'Lista de registros retornada com sucesso.',
      schema: diaryEntryListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
