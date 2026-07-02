import { BadRequestException } from '@nestjs/common';

export type HoldReservationDto = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
};

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
  const quantityValue = payload.quantity;

  if (
    typeof quantityValue !== 'number' ||
    !Number.isInteger(quantityValue) ||
    quantityValue <= 0
  ) {
    throw new BadRequestException('"quantity" must be a positive integer.');
  }

  return {
    eventId,
    ticketTypeId,
    quantity: quantityValue,
  };
}
