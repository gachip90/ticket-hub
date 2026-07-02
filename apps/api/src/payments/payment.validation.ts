import { BadRequestException } from '@nestjs/common';

export type SandboxPaymentReservationDto = {
  reservationId: string;
};

export type ConfirmSandboxPaymentDto = {
  reservationId: string;
  idempotencyKey: string;
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

export function parseSandboxPaymentReservationDto(
  body: unknown,
): SandboxPaymentReservationDto {
  const payload = parseObject(body);

  return {
    reservationId: requiredString(payload, 'reservationId'),
  };
}

export function parseConfirmSandboxPaymentDto(
  body: unknown,
): ConfirmSandboxPaymentDto {
  const payload = parseObject(body);

  return {
    reservationId: requiredString(payload, 'reservationId'),
    idempotencyKey: requiredString(payload, 'idempotencyKey'),
  };
}
