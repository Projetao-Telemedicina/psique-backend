import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '@/common/swagger';
import {
  checkoutPromotionRequestSchema,
  checkoutPromotionResponseSchema,
} from './payments.schemas';

export function CheckoutPromotionApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Contrata impulsionamento de perfil',
      description:
        'Cria o checkout avulso do impulsionamento para o profissional autenticado e ativa o destaque do perfil após pagamento aprovado.',
    }),
    ApiBody({
      required: true,
      schema: checkoutPromotionRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Checkout do impulsionamento iniciado com sucesso.',
      schema: checkoutPromotionResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeConflict: true,
      includeNotFound: true,
    }),
  );
}
