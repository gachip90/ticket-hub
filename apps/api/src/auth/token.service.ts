import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AccessTokenPayload } from './auth.types';

const tokenAlgorithm = 'HS256';

function encodeBase64Url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

@Injectable()
export class TokenService {
  private readonly secret =
    process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
  private readonly ttlSeconds = 60 * 60;

  get accessTokenSecret() {
    return this.secret;
  }

  sign(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>) {
    const now = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url(
      JSON.stringify({ alg: tokenAlgorithm, typ: 'JWT' }),
    );
    const body = encodeBase64Url(
      JSON.stringify({
        ...payload,
        iat: now,
        exp: now + this.ttlSeconds,
      } satisfies AccessTokenPayload),
    );
    const signature = this.signContent(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  verify(token: string) {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const [header, body, signature] = parts;
    const expectedSignature = this.signContent(`${header}.${body}`);
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const parsedHeader = this.parseJson<{ alg?: string }>(header);

    if (parsedHeader.alg !== tokenAlgorithm) {
      throw new UnauthorizedException('Unsupported access token.');
    }

    const payload = this.parseJson<AccessTokenPayload>(body);

    if (!payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Access token expired.');
    }

    return payload;
  }

  private signContent(content: string) {
    return createHmac('sha256', this.secret)
      .update(content)
      .digest('base64url');
  }

  private parseJson<T>(value: string) {
    try {
      return JSON.parse(decodeBase64Url(value)) as T;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
