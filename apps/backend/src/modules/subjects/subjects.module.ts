import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './subject.entity';
import { TeacherSubject } from './teacher-subject.entity';
import { StudentEnrollment } from './student-enrollment.entity';
import { GuardianStudent } from './guardian-student.entity';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, TeacherSubject, StudentEnrollment, GuardianStudent]),
  ],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService, TypeOrmModule],
})
export class SubjectsModule {}
