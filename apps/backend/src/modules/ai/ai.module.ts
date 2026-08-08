import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AiStudentPanorama } from './ai-student-panorama.entity';
import { AiActivitySuggestion } from './ai-activity-suggestion.entity';
import { ActivityCorrection } from './activity-correction.entity';
import { StudyLog } from '../tasks/study-log.entity';
import { SessionNote } from '../attendance/session-note.entity';
import { StudentProgress } from '../progress/student-progress.entity';
import { User } from '../auth/user.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiStudentPanorama,
      AiActivitySuggestion,
      ActivityCorrection,
      StudyLog,
      SessionNote,
      StudentProgress,
      User,
    ]),
    MulterModule.register({ dest: './uploads' }),
  ],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
