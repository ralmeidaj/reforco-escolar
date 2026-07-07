import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { SessionNote } from './session-note.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateSessionNoteDto } from './dto/create-session-note.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(SessionNote) private readonly noteRepo: Repository<SessionNote>,
  ) {}

  async createOrUpdate(tenantId: string, teacherId: string, dto: CreateAttendanceDto): Promise<Attendance> {
    const existing = await this.attendanceRepo.findOne({
      where: { tenantId, sessionId: dto.sessionId, studentId: dto.studentId },
    });
    if (existing) {
      existing.status = dto.status as any;
      return this.attendanceRepo.save(existing);
    }
    const attendance = this.attendanceRepo.create({
      tenantId,
      sessionId: dto.sessionId,
      studentId: dto.studentId,
      status: dto.status as any,
    });
    return this.attendanceRepo.save(attendance);
  }

  async findBySession(tenantId: string, sessionId: string): Promise<Attendance[]> {
    return this.attendanceRepo.find({ where: { tenantId, sessionId } });
  }

  async findByStudent(tenantId: string, studentId: string): Promise<Attendance[]> {
    return this.attendanceRepo.find({
      where: { tenantId, studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateAttendanceDto): Promise<Attendance> {
    const attendance = await this.attendanceRepo.findOne({ where: { tenantId, id } });
    if (!attendance) throw new NotFoundException('Attendance not found');
    attendance.status = dto.status as any;
    return this.attendanceRepo.save(attendance);
  }

  async addSessionNote(tenantId: string, teacherId: string, dto: CreateSessionNoteDto): Promise<SessionNote> {
    const existing = await this.noteRepo.findOne({
      where: { tenantId, sessionId: dto.sessionId, teacherId },
    });
    if (existing) {
      existing.content = dto.content;
      return this.noteRepo.save(existing);
    }
    const note = this.noteRepo.create({
      tenantId,
      sessionId: dto.sessionId,
      teacherId,
      content: dto.content,
    });
    return this.noteRepo.save(note);
  }

  async findNotesBySession(tenantId: string, sessionId: string): Promise<SessionNote[]> {
    return this.noteRepo.find({ where: { tenantId, sessionId } });
  }

  async getAbsenceCount(tenantId: string, studentId: string): Promise<number> {
    return this.attendanceRepo.count({ where: { tenantId, studentId, status: 'ausente' as any } });
  }

  async getConsecutiveAbsences(tenantId: string, studentId: string): Promise<number> {
    const records = await this.attendanceRepo.find({
      where: { tenantId, studentId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
    let count = 0;
    for (const r of records) {
      if (r.status === 'ausente') count++;
      else break;
    }
    return count;
  }
}
