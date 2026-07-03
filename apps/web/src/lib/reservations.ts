export type ReservationItem = {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReservationDetail = {
  id: string;
  eventId: string;
  userId: string;
  status: 'HELD' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  totalQuantity: number;
  totalAmount: number;
  event: {
    id: string;
    name: string;
    venue: string;
    startAt: string;
  };
  items: ReservationItem[];
};

export type SandboxPayment = {
  id: string;
  reservationId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  provider: 'SANDBOX';
  amount: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type CreateSandboxPaymentResponse = {
  payment: SandboxPayment | null;
};

export type ConfirmSandboxPaymentResponse = {
  payment: SandboxPayment | null;
  reservation: {
    id: string;
    status: 'HELD' | 'PAID' | 'EXPIRED' | 'CANCELLED';
    expiresAt: string;
  };
  order: {
    id: string;
    code: string;
    totalAmount: number;
    createdAt: string;
  } | null;
  alreadyProcessed: boolean;
};

export type FailSandboxPaymentResponse = {
  payment: SandboxPayment | null;
  reservation: {
    id: string;
    status: 'HELD' | 'PAID' | 'EXPIRED' | 'CANCELLED';
    expiresAt: string;
  };
};
