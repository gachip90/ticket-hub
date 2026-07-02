import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser, AccessTokenPayload } from './auth.types';
import { TokenService } from './token.service';

type JwtPayload = Partial<AccessTokenPayload>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(tokenService: TokenService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: tokenService.accessTokenSecret,
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (
      !payload.sub ||
      !payload.email ||
      !payload.name ||
      !payload.role ||
      !Object.values(UserRole).includes(payload.role)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
