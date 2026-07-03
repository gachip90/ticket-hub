export type UserOrderItem = {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type UserOrder = {
  id: string;
  code: string;
  totalAmount: number;
  createdAt: string;
  event: {
    id: string;
    name: string;
    venue: string;
    startAt: string;
  };
  reservation: {
    id: string;
    status: 'HELD' | 'PAID' | 'EXPIRED' | 'CANCELLED';
    expiresAt: string;
    recipientName: string | null;
    recipientEmail: string | null;
    recipientPhone: string | null;
    items: UserOrderItem[];
  };
  payment: {
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    provider: 'SANDBOX';
    amount: number;
    paidAt: string | null;
    createdAt: string;
  } | null;
};
