import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

interface LogActionParams {
  tenantId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private repo: Repository<AuditLog>,
  ) {}

  log(params: LogActionParams) {
    const entry = this.repo.create({
      tenantId: params.tenantId ?? null,
      userId: params.userId ?? null,
      userRole: params.userRole ?? null,
      action: params.action,
      entity: params.entity ?? null,
      entityId: params.entityId ?? null,
      payload: params.payload ?? null,
      ip: params.ip ?? null,
    });
    return this.repo.save(entry);
  }

  findByTenant(tenantId: string, limit = 50, offset = 0) {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  findAll(limit = 50, offset = 0) {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
