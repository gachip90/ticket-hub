import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { InventoryService } from './inventory.service';
import { InventoryUpdatesService } from './inventory-updates.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, InventoryService, InventoryUpdatesService],
  exports: [ReservationsService, InventoryService, InventoryUpdatesService],
})
export class ReservationsModule {}
