import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiCreatedResponse,
    ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
    createDiaryRequestSchema,
    diaryEntryResponseSchema,
} from './diary.schemas';

export function CreateDiaryApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um registro de diario',
      description:
        'Registra um novo diario do paciente autenticado com sentimentos, sintomas e notas adicionais.',
    }),
    ApiBody({
      required: true,
      schema: createDiaryRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Registro do diario criado com sucesso.',
      schema: diaryEntryResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
