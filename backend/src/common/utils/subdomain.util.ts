import { ConflictException } from '@nestjs/common';

/** URL-safe institute key; used for register + public lookup (TASK step 6). */
export function normalizeSubdomain(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length < 2) {
    throw new ConflictException('Invalid subdomain');
  }
  return s;
}
