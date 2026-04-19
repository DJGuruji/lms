import {
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_SUPER_ADMIN,
  ROLE_TEACHER,
} from './constants.js';

/** Who may manage users & bulk CSV (step 7). */
export const MANAGE_USERS_ROLES = [
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_TEACHER,
] as const;

/** Who may manage courses & subjects (steps 8–9). */
export const MANAGE_CURRICULUM_ROLES = [
  ROLE_SUPER_ADMIN,
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_TEACHER,
] as const;
