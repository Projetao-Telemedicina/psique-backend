import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  checkoutAppointmentRequestSchema,
  checkoutAppointmentResponseSchema,
} from './payments.schemas';

export function CheckoutAppointmentApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Inicia o checkout de uma consulta',
      description:
        'Cria a intenção de pagamento de uma consulta avulsa, reserva automaticamente o cupom aplicável quando houver, ' +
        'e confirma o agendamento somente após a aprovação do pagamento.',
    }),
    ApiBody({
      required: true,
      schema: checkoutAppointmentRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Checkout iniciado com sucesso.',
      schema: checkoutAppointmentResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
