import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { parseHoldReservationDto } from './reservation.validation';
import { ReservationsService } from './reservations.service';

@Controller('api/reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('hold')
  holdReservation(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.reservationsService.holdReservation(
      user,
      parseHoldReservationDto(body),
    );
  }

  @Get(':id')
  getReservation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reservationsService.getReservationById(id, user);
  }

  @Post(':id/release')
  releaseReservation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reservationsService.releaseReservation(id, user);
  }
}
