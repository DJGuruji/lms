/** User attached to `req.user` after JWT validation. */
export interface JwtUser {
  id: string;
  name: string;
  email: string;
  role: string;
  instituteId: string;
}
