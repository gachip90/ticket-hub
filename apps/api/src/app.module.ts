import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { MeModule } from './me/me.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    EventsModule,
    MeModule,
    ReservationsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
