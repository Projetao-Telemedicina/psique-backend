import { ApiCommonErrorResponses } from "@/common/swagger";
import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiQuery } from "@nestjs/swagger";
import { professionalsByScoreAvgResponseSchema } from "./professionals.schemas";

export function GetProfessionalsByScoreAvgApiDocs(): MethodDecorator {
    return applyDecorators(
        ApiOperation({
            summary: 'Lista profissionais ordenados por nota média',
            description: 'Permite listar os profissionais ordenados por nota média, com paginação.',
        }),
        ApiOkResponse({
            description: 'Lista de profissionais retornada com sucesso.',
            schema: professionalsByScoreAvgResponseSchema,
        }),
        ApiCommonErrorResponses({
            includeUnauthorized: false,
            includeForbidden: false,
        }),
        ApiQuery({
            name: 'page',
            required: false,
            description: 'Numero da paginaçãoo (padrão: 1).',
            schema: {
                type: 'integer',
                default: 1,
                minimum: 1,
            },
        }),
        ApiQuery({
            name: 'limit',
            required: false,
            description: 'Quantidade de profissionais por pagina (padrão: 10).',
            schema: {
                type: 'integer',
                default: 10,
                minimum: 1,
            },
        }),
    );
}