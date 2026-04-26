import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { UsersService } from './users.service.js';

@Controller('peers')
@UseGuards(JwtAuthGuard)
export class PeersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() me: JwtUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.usersService.findPeers(instituteId, me.id, p, l);
  }
}
