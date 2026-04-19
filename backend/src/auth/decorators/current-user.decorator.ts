import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtUser } from '../interfaces/jwt-user.interface.js';

/** Authenticated JWT user. Requires {@link JwtAuthGuard}. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return req.user;
  },
);
