export type AdminInventoryItem = {
  eventId: string;
  eventName: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  heldQuantity: number;
  soldQuantity: number;
  startAt: string;
  venue: string;
};

export type AdminReservationItem = {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type AdminHeldReservation = {
  id: string;
  status: "HELD" | "PAID" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
    venue: string;
    startAt: string;
  };
  totalQuantity: number;
  totalAmount: number;
  items: AdminReservationItem[];
};

export type AdminOrder = {
  id: string;
  code: string;
  totalAmount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  event: {
    id: string;
    name: string;
    venue: string;
    startAt: string;
  };
  reservation: {
    id: string;
    status: "HELD" | "PAID" | "EXPIRED" | "CANCELLED";
    expiresAt: string;
    recipientName: string | null;
    recipientEmail: string | null;
    recipientPhone: string | null;
    items: AdminReservationItem[];
  };
  payment: {
    id: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "TIMEOUT";
    provider: "SANDBOX";
    amount: number;
    paidAt: string | null;
    createdAt: string;
  } | null;
};

export type AdminStatsResponse = {
  totalSoldTickets: number;
  totalHeldTickets: number;
  totalAvailableTickets: number;
  totalInventoryTickets: number;
  totalRevenue: number;
  inventory: AdminInventoryItem[];
  recentOrders: AdminOrder[];
};
