import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return the API health response', () => {
      const response = appController.getHealth();

      expect(response).toEqual({
        status: 'ok',
        service: 'mini-ticketbox-api',
        timestamp: response.timestamp,
      });
      expect(typeof response.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
    });
  });
});
