import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdmin } from './super-admin.entity';
import { SaasPlan } from './saas-plan.entity';
import { AuditLog } from './audit-log.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminTenantsService } from './super-admin-tenants.service';
import { SaasPlansService } from './saas-plans.service';
import { AuditLogsService } from './audit-logs.service';
import { SuperAdminJwtStrategy } from './super-admin-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperAdmin, SaasPlan, AuditLog, Tenant, User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
    }),
  ],
  providers: [
    SuperAdminAuthService,
    SuperAdminTenantsService,
    SaasPlansService,
    AuditLogsService,
    SuperAdminJwtStrategy,
  ],
  controllers: [SuperAdminController],
  exports: [AuditLogsService],
})
export class SuperAdminModule {}
