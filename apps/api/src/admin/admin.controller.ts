import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('stats')
  getStats() {
    return {
      totalSoldTickets: 0,
      totalHeldTickets: 0,
      totalAvailableTickets: 0,
      totalRevenue: 0,
      inventory: [],
      recentOrders: [],
    };
  }
}
