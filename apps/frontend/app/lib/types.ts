export type UserRole = 'tenant_admin' | 'teacher' | 'student' | 'guardian';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
