import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProgress } from './student-progress.entity';
import { StudentGrade } from './student-grade.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateStudentGradeDto } from './dto/create-student-grade.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(StudentProgress) private readonly progressRepo: Repository<StudentProgress>,
    @InjectRepository(StudentGrade) private readonly gradeRepo: Repository<StudentGrade>,
  ) {}

  async upsert(tenantId: string, dto: UpdateProgressDto): Promise<StudentProgress> {
    const existing = await this.progressRepo.findOne({
      where: { tenantId, studentId: dto.studentId, subjectId: dto.subjectId },
    });
    if (existing) {
      existing.level = dto.level as any;
      if (dto.notes !== undefined) existing.notes = dto.notes ?? null;
      return this.progressRepo.save(existing);
    }
    const progress = this.progressRepo.create({
      tenantId,
      studentId: dto.studentId,
      subjectId: dto.subjectId,
      level: dto.level as any,
      notes: dto.notes ?? null,
    });
    return this.progressRepo.save(progress);
  }

  async findByStudent(tenantId: string, studentId: string): Promise<StudentProgress[]> {
    return this.progressRepo.find({ where: { tenantId, studentId } });
  }

  async findByStudentAndSubject(tenantId: string, studentId: string, subjectId: string): Promise<StudentProgress | null> {
    return this.progressRepo.findOne({ where: { tenantId, studentId, subjectId } });
  }

  // ── Notas da escola regular ──────────────────────────────────────────────────

  async createGrade(tenantId: string, recordedBy: string, dto: CreateStudentGradeDto): Promise<StudentGrade> {
    const grade = this.gradeRepo.create({
      tenantId,
      studentId: dto.studentId,
      recordedBy,
      subject: dto.subject,
      unidade: dto.unidade,
      value: dto.value,
    });
    return this.gradeRepo.save(grade);
  }

  async findGradesByStudent(tenantId: string, studentId: string): Promise<StudentGrade[]> {
    return this.gradeRepo.find({ where: { tenantId, studentId }, order: { createdAt: 'DESC' } });
  }

  async deleteGrade(tenantId: string, id: string): Promise<void> {
    const grade = await this.gradeRepo.findOne({ where: { tenantId, id } });
    if (!grade) throw new NotFoundException('Nota não encontrada');
    await this.gradeRepo.remove(grade);
  }
}
