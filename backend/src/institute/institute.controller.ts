import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { InstituteService } from './institute.service.js';

@Controller('institutes')
export class InstituteController {
  constructor(private readonly instituteService: InstituteService) {}

  /**
   * Authenticated: institute for JWT `institute_id` claim.
   * Tenant isolation: query uses only the ID from the token (step 5).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(@CurrentInstituteId() instituteId: string) {
    return this.instituteService.getCurrentInstitute(instituteId);
  }

  /** Public resolver for subdomain / path routing (TASK step 6). */
  @Get('by-subdomain/:subdomain')
  lookupBySubdomain(@Param('subdomain') subdomain: string) {
    return this.instituteService.findBySubdomain(subdomain);
  }
}
