import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { normalizeSubdomain } from '../common/utils/subdomain.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ROLE_INSTITUTION_ADMIN } from './constants.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async verifyRecaptcha(token?: string) {
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!secret) return; // Skip if secret is not set (e.g. dev environment)
    if (!token) throw new BadRequestException('reCAPTCHA token is required');

    try {
      const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secret}&response=${token}`,
      });
      const data = await response.json();

      if (!data.success) {
        throw new UnauthorizedException('reCAPTCHA verification failed');
      }
      if (data.score !== undefined && data.score < 0.5) {
        throw new UnauthorizedException('reCAPTCHA score too low, suspected bot');
      }
    } catch (e: any) {
      if (e instanceof UnauthorizedException || e instanceof BadRequestException) {
        throw e;
      }
      throw new UnauthorizedException('Failed to verify reCAPTCHA');
    }
  }

  async register(dto: RegisterDto) {
    await this.verifyRecaptcha(dto.recaptchaToken);
    
    const subdomain = normalizeSubdomain(dto.subdomain);
    const email = dto.email.trim().toLowerCase();
    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const institute = await tx.institute.create({
          data: { name: dto.instituteName.trim(), subdomain },
        });
        const user = await tx.user.create({
          data: {
            name: dto.adminName.trim(),
            email,
            password: hashed,
            role: ROLE_INSTITUTION_ADMIN,
            instituteId: institute.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            instituteId: true,
          },
        });
        return { institute, user };
      });

      const token = await this.signToken({
        sub: result.user.id,
        email: result.user.email,
        role: result.user.role,
        instituteId: result.user.instituteId,
      });

      return {
        access_token: token,
        user: result.user,
        institute: {
          id: result.institute.id,
          name: result.institute.name,
          subdomain: result.institute.subdomain,
          path: `/${result.institute.subdomain}`,
        },
      };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'An institute or user with this subdomain or email already exists',
        );
      }
      throw err;
    }
  }

  async login(dto: LoginDto) {
    await this.verifyRecaptcha(dto.recaptchaToken);

    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        instituteId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _omit, ...safe } = user;
    const token = await this.signToken({
      sub: safe.id,
      email: safe.email,
      role: safe.role,
      instituteId: safe.instituteId,
    });

    return {
      access_token: token,
      user: safe,
    };
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
