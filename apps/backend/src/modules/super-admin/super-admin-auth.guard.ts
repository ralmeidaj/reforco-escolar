import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperAdminAuthGuard extends AuthGuard('super-admin-jwt') {
  canActivate(ctx: ExecutionContext) {
    return super.canActivate(ctx);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) throw err ?? new UnauthorizedException('Acesso restrito ao super admin');
    return user;
  }
}
