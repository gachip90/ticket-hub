import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { MeService } from './me.service';

@Controller('api/me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('orders')
  getOrders(@CurrentUser() user: AuthUser) {
    return this.meService.getOrders(user);
  }
}
