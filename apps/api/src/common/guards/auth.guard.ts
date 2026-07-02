import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../../auth/auth.types';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest<TUser = AuthUser>(
    err: unknown,
    user: TUser | false | null,
    info?: Error & { name?: string },
  ) {
    if (user) {
      return user;
    }

    if (info?.message === 'No auth token') {
      throw new UnauthorizedException('Authorization header is required.');
    }

    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Access token expired.');
    }

    if (err instanceof UnauthorizedException) {
      throw err;
    }

    throw new UnauthorizedException('Invalid access token.');
  }
}
