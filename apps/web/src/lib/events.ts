export type EventSummary = {
  id: string;
  name: string;
  description: string;
  venue: string;
  startAt: string;
  salesOpenAt: string;
  salesCloseAt: string;
  imageUrl: string;
  genreLabel: string;
  lowestPrice: number;
  availableTickets: number;
  totalTickets: number;
  ticketTypeCount: number;
};

export type EventTicketType = {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
};

export type EventDetail = EventSummary & {
  ticketTypes: EventTicketType[];
};

export type EventInventoryTotals = {
  totalQuantity: number;
  availableQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
};

export type EventInventoryTicketType = {
  eventId: string;
  ticketTypeId: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
};

export type EventInventoryResponse = {
  eventId: string;
  totals: EventInventoryTotals;
  ticketTypes: EventInventoryTicketType[];
};
