import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { webhookResponseSchema } from './payments.schemas';

export function StripeWebhookApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Recebe eventos do Stripe',
      description:
        'Endpoint técnico de webhook usado pelo Stripe para confirmar sucesso, falha ou cancelamento do pagamento.',
    }),
    ApiOkResponse({
      description: 'Evento recebido com sucesso.',
      schema: webhookResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Webhook inválido ou assinatura ausente.',
    }),
    ApiInternalServerErrorResponse({
      description: 'Falha interna ao processar o webhook.',
    }),
  );
}
