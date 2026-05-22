import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { patientProfileResponseSchema } from '../../patients/swagger';
import { updateDiarySharingRequestSchema } from './diary.schemas';

export function UpdateDiarySharingApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza o compartilhamento do diario',
      description:
        'Permite que o paciente defina se os registros do diario podem ser compartilhados com profissionais.',
    }),
    ApiBody({
      required: true,
      schema: updateDiarySharingRequestSchema,
    }),
    ApiOkResponse({
      description: 'Preferencia de compartilhamento atualizada com sucesso.',
      schema: patientProfileResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeNotFound: false,
      includeConflict: false,
    }),
  );
}
