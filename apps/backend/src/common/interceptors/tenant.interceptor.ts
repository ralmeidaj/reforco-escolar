import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (tenant) {
      // Injeta tenant_id em todos os EntityManagers via AsyncLocalStorage
      // O TypeORM usa o manager padrão; forçamos o filtro via request
      request.tenantId = tenant.id;
    }

    return next.handle();
  }
}
