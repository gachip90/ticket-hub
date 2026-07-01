import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: 'mini-ticketbox-api';
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'mini-ticketbox-api',
      timestamp: new Date().toISOString(),
    };
  }
}
