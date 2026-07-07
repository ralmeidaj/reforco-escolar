import { SetMetadata } from '@nestjs/common';

export type UserRole = 'super_admin' | 'tenant_admin' | 'teacher' | 'student' | 'guardian';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
