import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eAppContext } from './e2e-helpers';

describe('AppController (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication<App>;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app as INestApplication<App>;
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

