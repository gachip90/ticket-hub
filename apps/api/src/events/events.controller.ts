import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  getEvents() {
    return this.eventsService.listEvents();
  }

  @Get('search')
  searchEvents(@Query('q') keyword?: string) {
    return this.eventsService.searchEvents(keyword ?? '');
  }

  @Get(':id')
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }
}
