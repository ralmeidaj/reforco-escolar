import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Tenant } from '../../modules/tenants/tenant.entity';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Tenant)
    private tenantsRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    // Mobile usa X-Tenant-Slug; Web usa subdomínio apenas se vier do cliente explicitamente
    const headerSlug = request.headers['x-tenant-slug'] as string | undefined;

    // Rotas públicas sem header explícito passam sem contexto de tenant
    // (ex: POST /tenants para criar escola, GET /health)
    if (isPublic && !headerSlug) return true;

    const hostname = request.hostname ?? '';
    const hostnameSlug =
      hostname.includes('.') && !/^[\d.]+$/.test(hostname)
        ? hostname.split('.')[0]
        : null;

    const slug = headerSlug ?? hostnameSlug;

    if (!slug) {
      if (isPublic) return true;
      throw new NotFoundException('Tenant não identificado');
    }

    const tenant = await this.tenantsRepo.findOne({ where: { slug, status: 'active' } });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado ou inativo');
    }

    request.tenant = tenant;
    return true;
  }
}
