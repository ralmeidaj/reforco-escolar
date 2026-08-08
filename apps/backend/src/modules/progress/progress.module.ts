import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentProgress } from './student-progress.entity';
import { StudentGrade } from './student-grade.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentProgress, StudentGrade])],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
