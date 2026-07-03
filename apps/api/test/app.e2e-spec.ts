import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HealthResponse } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        const response = body as unknown as HealthResponse;

        expect(response).toEqual({
          status: 'ok',
          service: 'ticket-hub-api',
          timestamp: response.timestamp,
        });
        expect(typeof response.timestamp).toBe('string');
        expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
