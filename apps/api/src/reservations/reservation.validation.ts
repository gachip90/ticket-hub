import { BadRequestException } from '@nestjs/common';

export type HoldReservationDto = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+\-\s()]{8,20}$/;

function parseObject(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a valid object.');
  }

  return body as Record<string, unknown>;
}

function requiredString(payload: Record<string, unknown>, field: string) {
  const value = payload[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`"${field}" is required.`);
  }

  return value.trim();
}

export function parseHoldReservationDto(body: unknown): HoldReservationDto {
  const payload = parseObject(body);
  const eventId = requiredString(payload, 'eventId');
  const ticketTypeId = requiredString(payload, 'ticketTypeId');
  const recipientName = requiredString(payload, 'recipientName');
  const recipientEmail = requiredString(
    payload,
    'recipientEmail',
  ).toLowerCase();
  const recipientPhone = requiredString(payload, 'recipientPhone');
  const quantityValue = payload.quantity;

  if (
    typeof quantityValue !== 'number' ||
    !Number.isInteger(quantityValue) ||
    quantityValue <= 0
  ) {
    throw new BadRequestException('"quantity" must be a positive integer.');
  }

  if (!emailPattern.test(recipientEmail)) {
    throw new BadRequestException(
      '"recipientEmail" must be a valid email address.',
    );
  }

  if (!phonePattern.test(recipientPhone)) {
    throw new BadRequestException(
      '"recipientPhone" must be a valid phone number.',
    );
  }

  return {
    eventId,
    ticketTypeId,
    quantity: quantityValue,
    recipientName,
    recipientEmail,
    recipientPhone,
  };
}
