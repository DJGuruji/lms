import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUser } from './interfaces/jwt-user.interface.js';
import {
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_SUPER_ADMIN,
  ROLE_TEACHER,
} from './constants.js';
import { Roles } from './decorators/roles.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RoleGuard } from './guards/role.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Protected route — JWT only (step 4 demo). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: JwtUser }) {
    return req.user;
  }

  /** Staff roles only — demonstrates {@link RoleGuard}. */
  @Get('staff/ping')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(
    ROLE_SUPER_ADMIN,
    ROLE_ADMIN,
    ROLE_INSTITUTION_ADMIN,
    ROLE_TEACHER,
  )
  staffPing() {
    return { ok: true };
  }
}
