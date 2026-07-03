import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows requests when no role metadata is defined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows requests from users with the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(
        createContext({
          user: {
            id: 'admin-1',
            role: UserRole.ADMIN,
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects requests from users without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(
        createContext({
          user: {
            id: 'user-1',
            role: UserRole.USER,
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects requests without an authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createContext())).toThrow(
      ForbiddenException,
    );
  });
});

function createContext(
  request: Record<string, unknown> = {},
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
  } as unknown as ExecutionContext;
}
