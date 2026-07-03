import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: 'ticket-hub-api';
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'ticket-hub-api',
      timestamp: new Date().toISOString(),
    };
  }
}
