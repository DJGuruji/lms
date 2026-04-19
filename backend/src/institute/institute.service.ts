import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeSubdomain } from '../common/utils/subdomain.util.js';

export type InstitutePublicView = {
  id: string;
  name: string;
  subdomain: string;
  /** TASK step 6 — path-style segment, e.g. `/acme-institute`. */
  path: string;
};

@Injectable()
export class InstituteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current tenant's institute — always filtered by JWT `instituteId` (TASK step 5). */
  async getCurrentInstitute(instituteId: string): Promise<InstitutePublicView> {
    const row = await this.prisma.institute.findFirst({
      where: { id: instituteId },
      select: { id: true, name: true, subdomain: true },
    });
    if (!row) {
      throw new NotFoundException('Institute not found');
    }
    return this.toView(row);
  }

  /** Public lookup by subdomain for routing (e.g. Next.js `/:subdomain/...`). */
  async findBySubdomain(raw: string): Promise<InstitutePublicView> {
    const subdomain = normalizeSubdomain(raw);
    const row = await this.prisma.institute.findUnique({
      where: { subdomain },
      select: { id: true, name: true, subdomain: true },
    });
    if (!row) {
      throw new NotFoundException('Institute not found');
    }
    return this.toView(row);
  }

  private toView(row: {
    id: string;
    name: string;
    subdomain: string;
  }): InstitutePublicView {
    return {
      ...row,
      path: `/${row.subdomain}`,
    };
  }
}
