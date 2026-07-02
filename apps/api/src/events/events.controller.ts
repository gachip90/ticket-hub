import { Controller, Get, Param, Query } from '@nestjs/common';
import { InventoryService } from '../reservations/inventory.service';
import { EventsService } from './events.service';

@Controller('api/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly inventoryService: InventoryService,
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

  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }
}
