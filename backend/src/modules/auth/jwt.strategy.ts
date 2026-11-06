
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { DataSource } from 'typeorm';

import { ACCESS_TOKEN_COOKIE_NAME } from './auth-cookie.constants';

export interface JwtPayload {
  sub: number;
  sid?: number;
  roles?: string[];
  firstName?: string;
}

export interface AuthenticatedUser {
  userId: number;
  sessionId?: number;
  roles: string[];
  permissions: string[];
  firstName: string;
}

interface UserRecord {
  user_id: number;
  account_status: string;
  first_name: string;
}

interface AuthorizationRecord {
  role_name: string;
  permission_name: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
      private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          if (request?.cookies?.[ACCESS_TOKEN_COOKIE_NAME]) {
            return request.cookies[ACCESS_TOKEN_COOKIE_NAME] as string;
          }

          return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !Number.isInteger(payload.sub)) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    // Verify that the account still exists and is active.
    const users = await this.dataSource.query<UserRecord[]>(
      `
      SELECT user_id, account_status, first_name
      FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [payload.sub],
    );

    const user = users[0];

    if (!user || user.account_status !== 'Active') {
      throw new UnauthorizedException(
        'Your account is inactive or has been deactivated.',
      );
    }

    // Validate the database-backed session when the token contains a sid.
    if (payload.sid !== undefined) {
      if (!Number.isInteger(payload.sid) || payload.sid <= 0) {
        throw new UnauthorizedException('Invalid authentication session.');
      }

      const sessions = await this.dataSource.query<{ session_id: number }[]>(
        `
        SELECT session_id
        FROM sessions
        WHERE session_id = $1
        AND member_id = $2
        AND session_status = 'Active'
      AND logout_time IS NULL
      LIMIT 1
      `,
      [payload.sid, payload.sub],
      );

      if (!sessions.length) {
        throw new UnauthorizedException(
          'Your session is no longer active. Please log in again.',
        );
      }
    }

    // Always retrieve current roles and permissions from the database.
    // Do not trust roles stored in an older JWT.
    const authorizationRecords =
    await this.dataSource.query<AuthorizationRecord[]>(
      `
      SELECT DISTINCT
      r.role_name,
      p.permission_name
      FROM member_roles mr
      INNER JOIN roles r
      ON r.role_id = mr.role_id
      LEFT JOIN role_permissions rp
      ON rp.role_id = r.role_id
      LEFT JOIN permissions p
      ON p.permission_id = rp.permission_id
      WHERE mr.member_id = $1
      `,
      [user.user_id],
    );

    const roles = [
      ...new Set(
        authorizationRecords
        .map((record) => record.role_name)
        .filter(Boolean),
      ),
    ];

    const permissions = [
      ...new Set(
        authorizationRecords
        .map((record) => record.permission_name)
        .filter((permission): permission is string => Boolean(permission)),
      ),
    ];

    return {
      userId: user.user_id,
      sessionId: payload.sid,
      roles,
      permissions,
      firstName: payload.firstName ?? user.first_name,
    };
  }
}
