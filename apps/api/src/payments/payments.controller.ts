import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import {
  parseConfirmSandboxPaymentDto,
  parseSandboxPaymentReservationDto,
} from './payment.validation';
import { PaymentsService } from './payments.service';

@Controller('api/payments/sandbox')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  createPayment(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.paymentsService.createSandboxPayment(
      user,
      parseSandboxPaymentReservationDto(body),
    );
  }

  @Post('confirm')
  confirmPayment(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.paymentsService.confirmSandboxPayment(
      user,
      parseConfirmSandboxPaymentDto(body),
    );
  }

  @Post('fail')
  failPayment(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.paymentsService.failSandboxPayment(
      user,
      parseSandboxPaymentReservationDto(body),
    );
  }
}
