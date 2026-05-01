import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import {
  DocumentBuilder,
  type OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { AppModule } from './app.module.js';

const logger = new Logger('Swagger');
const nodeRequire = createRequire(__filename);

function loadEnvironment(): void {
  const envPath = join(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  // Make the local .env take precedence over inherited process variables.
  Object.assign(process.env, parseEnv(readFileSync(envPath, 'utf8')));
}

function getSwaggerRoute(): string {
  return process.env.SWAGGER_ROUTE ?? 'api';
}

function isSwaggerDocsEnabled(): boolean {
  const value = (process.env.SWAGGER_DOCS ?? '').toLowerCase();

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function getApiDocsUi(): 'swagger' | 'scalar' {
  const value = (process.env.API_DOCS_UI ?? 'scalar').toLowerCase();

  return value === 'swagger' ? 'swagger' : 'scalar';
}

function setupScalar(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  document: OpenAPIObject,
): void {
  const scalarModule = nodeRequire('@scalar/express-api-reference') as {
    apiReference?: (options: { content: OpenAPIObject }) => unknown;
  };

  if (typeof scalarModule.apiReference !== 'function') {
    throw new Error('Scalar nao esta disponivel no projeto.');
  }

  app.use(
    `/${getSwaggerRoute()}`,
    scalarModule.apiReference({
      content: document,
    }) as Parameters<typeof app.use>[1],
  );
}

function setupSwaggerUi(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
  document: OpenAPIObject,
): void {
  SwaggerModule.setup(getSwaggerRoute(), app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

function setupApiDocumentation(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
): void {
  if (!isSwaggerDocsEnabled()) {
    logger.log(
      `Documentacao desabilitada. Defina SWAGGER_DOCS=true para expor /${getSwaggerRoute()}.`,
    );

    return;
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Psique Backend API')
    .setDescription('Documentacao da API do projeto Psique Backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o token abaixo.',
      },
      'jwt-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const apiDocsUi = getApiDocsUi();

  if (apiDocsUi === 'swagger') {
    setupSwaggerUi(app, swaggerDocument);
    logger.log(`Documentacao disponivel em /${getSwaggerRoute()} (Swagger UI).`);

    return;
  }

  try {
    setupScalar(app, swaggerDocument);
    logger.log(`Documentacao disponivel em /${getSwaggerRoute()} (Scalar).`);
  } catch (error) {
    setupSwaggerUi(app, swaggerDocument);

    logger.warn(
      `API_DOCS_UI=scalar, mas o Scalar nao foi carregado. Usando Swagger UI em /${getSwaggerRoute()}.`,
    );

    if (error instanceof Error) {
      logger.debug(error.message);
    }
  }
}

async function bootstrap() {
  loadEnvironment();

  const app = await NestFactory.create(AppModule);

  setupApiDocumentation(app);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    logger.error(error.message, error.stack);
    return;
  }

  logger.error('Falha ao iniciar a aplicacao.');
});
