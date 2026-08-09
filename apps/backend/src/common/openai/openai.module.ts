import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../modules/tenants/tenant.entity';
import { OpenAiClientResolver } from './openai-client-resolver.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [OpenAiClientResolver],
  exports: [OpenAiClientResolver],
})
export class OpenAiModule {}
