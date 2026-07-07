import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { TeacherSubject } from './teacher-subject.entity';
import { StudentEnrollment } from './student-enrollment.entity';
import { GuardianStudent } from './guardian-student.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateTeacherSubjectDto } from './dto/create-teacher-subject.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateGuardianStudentDto } from './dto/create-guardian-student.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepo: Repository<Subject>,
    @InjectRepository(TeacherSubject)
    private teacherSubjectsRepo: Repository<TeacherSubject>,
    @InjectRepository(StudentEnrollment)
    private enrollmentsRepo: Repository<StudentEnrollment>,
    @InjectRepository(GuardianStudent)
    private guardianStudentsRepo: Repository<GuardianStudent>,
  ) {}

  // ── Subjects ─────────────────────────────────────────────────────────────

  findAllSubjects(tenantId: string) {
    return this.subjectsRepo.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async findSubject(tenantId: string, id: string) {
    const subject = await this.subjectsRepo.findOne({ where: { tenantId, id } });
    if (!subject) throw new NotFoundException('Disciplina não encontrada');
    return subject;
  }

  async createSubject(tenantId: string, dto: CreateSubjectDto) {
    const subject = this.subjectsRepo.create({ ...dto, tenantId });
    return this.subjectsRepo.save(subject);
  }

  async updateSubject(tenantId: string, id: string, dto: UpdateSubjectDto) {
    const subject = await this.findSubject(tenantId, id);
    Object.assign(subject, dto);
    return this.subjectsRepo.save(subject);
  }

  async removeSubject(tenantId: string, id: string) {
    const subject = await this.findSubject(tenantId, id);
    await this.subjectsRepo.remove(subject);
  }

  // ── Teacher ↔ Subject ────────────────────────────────────────────────────

  async linkTeacherSubject(tenantId: string, dto: CreateTeacherSubjectDto) {
    const exists = await this.teacherSubjectsRepo.findOne({
      where: { tenantId, teacherId: dto.teacherId, subjectId: dto.subjectId },
    });
    if (exists) throw new ConflictException('Vínculo já existe');

    const link = this.teacherSubjectsRepo.create({ ...dto, tenantId });
    return this.teacherSubjectsRepo.save(link);
  }

  async unlinkTeacherSubject(tenantId: string, id: string) {
    const link = await this.teacherSubjectsRepo.findOne({ where: { tenantId, id } });
    if (!link) throw new NotFoundException('Vínculo não encontrado');
    await this.teacherSubjectsRepo.remove(link);
  }

  findTeacherSubjects(tenantId: string, teacherId: string) {
    return this.teacherSubjectsRepo.find({
      where: { tenantId, teacherId },
      relations: { subject: true },
    });
  }

  // ── Student Enrollments ──────────────────────────────────────────────────

  async enroll(tenantId: string, dto: CreateEnrollmentDto) {
    const exists = await this.enrollmentsRepo.findOne({
      where: { tenantId, studentId: dto.studentId, subjectId: dto.subjectId },
    });
    if (exists) throw new ConflictException('Aluno já matriculado nesta disciplina');

    const enrollment = this.enrollmentsRepo.create({ ...dto, tenantId });
    return this.enrollmentsRepo.save(enrollment);
  }

  async unenroll(tenantId: string, id: string) {
    const enrollment = await this.enrollmentsRepo.findOne({ where: { tenantId, id } });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    await this.enrollmentsRepo.remove(enrollment);
  }

  findStudentEnrollments(tenantId: string, studentId: string) {
    return this.enrollmentsRepo.find({
      where: { tenantId, studentId },
      relations: { subject: true, group: true },
    });
  }

  // ── Guardian ↔ Student ────────────────────────────────────────────────────

  async linkGuardianStudent(tenantId: string, dto: CreateGuardianStudentDto) {
    const exists = await this.guardianStudentsRepo.findOne({
      where: { tenantId, guardianId: dto.guardianId, studentId: dto.studentId },
    });
    if (exists) throw new ConflictException('Vínculo já existe');

    const link = this.guardianStudentsRepo.create({ ...dto, tenantId });
    return this.guardianStudentsRepo.save(link);
  }

  async unlinkGuardianStudent(tenantId: string, id: string) {
    const link = await this.guardianStudentsRepo.findOne({ where: { tenantId, id } });
    if (!link) throw new NotFoundException('Vínculo não encontrado');
    await this.guardianStudentsRepo.remove(link);
  }

  findGuardianStudents(tenantId: string, guardianId: string) {
    return this.guardianStudentsRepo.find({
      where: { tenantId, guardianId },
      relations: { student: true },
    });
  }
}
