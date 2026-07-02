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
