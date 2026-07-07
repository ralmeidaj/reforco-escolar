import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Task } from './task.entity';
import { StudyLog } from './study-log.entity';
import { ActivitySubmission } from './activity-submission.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, StudyLog, ActivitySubmission]),
    MulterModule.register({ dest: './uploads' }),
  ],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
