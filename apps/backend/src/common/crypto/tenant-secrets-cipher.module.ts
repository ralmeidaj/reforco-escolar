import { Module, Global } from '@nestjs/common';
import { TenantSecretsCipherService } from './tenant-secrets-cipher.service';

@Global()
@Module({
  providers: [TenantSecretsCipherService],
  exports: [TenantSecretsCipherService],
})
export class TenantSecretsCipherModule {}
