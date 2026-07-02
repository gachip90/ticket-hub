import { BadRequestException } from '@nestjs/common';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterDto = {
  email: string;
  password: string;
  name: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

function requiredString(payload: Record<string, unknown>, field: string) {
  const value = payload[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`"${field}" is required.`);
  }

  return value.trim();
}

function parseObject(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Request body must be a valid object.');
  }

  return body as Record<string, unknown>;
}

export function parseRegisterDto(body: unknown): RegisterDto {
  const payload = parseObject(body);
  const email = requiredString(payload, 'email').toLowerCase();
  const password = requiredString(payload, 'password');
  const name = requiredString(payload, 'name');

  if (!emailPattern.test(email)) {
    throw new BadRequestException('Email must be a valid email address.');
  }

  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters.');
  }

  if (name.length > 100) {
    throw new BadRequestException('Name must be at most 100 characters.');
  }

  return { email, password, name };
}

export function parseLoginDto(body: unknown): LoginDto {
  const payload = parseObject(body);
  const email = requiredString(payload, 'email').toLowerCase();
  const password = requiredString(payload, 'password');

  if (!emailPattern.test(email)) {
    throw new BadRequestException('Email must be a valid email address.');
  }

  return { email, password };
}
