import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Query,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InventoryService } from '../reservations/inventory.service';
import { InventoryUpdatesService } from '../reservations/inventory-updates.service';
import { EventsService } from './events.service';

@Controller('api/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly inventoryService: InventoryService,
    private readonly inventoryUpdatesService: InventoryUpdatesService,
  ) {}

  @Get()
  getEvents() {
    return this.eventsService.listEvents();
  }

  @Get('search')
  searchEvents(@Query('q') keyword?: string) {
    return this.eventsService.searchEvents(keyword ?? '');
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.inventoryService.getEventInventory(id);
  }

  @Sse('inventory/stream')
  streamAllInventory(): Observable<MessageEvent> {
    return this.inventoryUpdatesService.streamAllInventory();
  }

  @Sse(':id/inventory/stream')
  streamInventory(@Param('id') id: string): Observable<MessageEvent> {
    return this.inventoryUpdatesService.streamEventInventory(id);
  }

  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }
}
