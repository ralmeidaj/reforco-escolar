import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { StudentPlan } from './student-plan.entity';
import { Payment } from './payment.entity';
import { GuardianStudent } from '../subjects/guardian-student.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, StudentPlan, Payment, GuardianStudent]),
    CommunicationModule,
  ],
  providers: [FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
