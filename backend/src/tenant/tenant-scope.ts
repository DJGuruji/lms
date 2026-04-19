/**
 * TASK step 5 — use on tenant-owned rows (Course, User in-tenant queries, etc.):
 * `where: { ...forInstitute(instituteId), ...other }`
 */
export function forInstitute(instituteId: string): { instituteId: string } {
  return { instituteId };
}
