import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { InventoryService } from './inventory.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, InventoryService],
  exports: [ReservationsService, InventoryService],
})
export class ReservationsModule {}
