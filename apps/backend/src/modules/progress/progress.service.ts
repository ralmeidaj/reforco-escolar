import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProgress } from './student-progress.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(StudentProgress) private readonly progressRepo: Repository<StudentProgress>,
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
}
