import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
};
