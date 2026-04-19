import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtUser } from '../../auth/interfaces/jwt-user.interface.js';

/** `institute_id` from JWT (`user.instituteId`). Requires {@link JwtAuthGuard} before the route. */
export const CurrentInstituteId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const id = req.user?.instituteId;
    if (!id) {
      throw new UnauthorizedException('Missing tenant (institute) context');
    }
    return id;
  },
);
