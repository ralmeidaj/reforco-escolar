import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { StudyLog } from './study-log.entity';
import { ActivitySubmission } from './activity-submission.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateStudyLogDto } from './dto/create-study-log.dto';
import { CreateActivitySubmissionDto } from './dto/create-activity-submission.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(StudyLog) private readonly studyLogRepo: Repository<StudyLog>,
    @InjectRepository(ActivitySubmission) private readonly submissionRepo: Repository<ActivitySubmission>,
  ) {}

  async createTask(tenantId: string, teacherId: string, dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepo.create({
      tenantId,
      teacherId,
      studentId: dto.studentId,
      subjectId: dto.subjectId,
      title: dto.title,
      description: dto.description ?? null,
      type: (dto.type ?? 'padrao') as any,
      dueDate: dto.dueDate ?? null,
      done: false,
      doneAt: null,
    });
    return this.taskRepo.save(task);
  }

  async findTasksByStudent(tenantId: string, studentId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { tenantId, studentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findTasksByTeacher(tenantId: string, teacherId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { tenantId, teacherId },
      order: { createdAt: 'DESC' },
    });
  }

  async findTask(tenantId: string, id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { tenantId, id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(tenantId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findTask(tenantId, id);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description ?? null;
    if (dto.type !== undefined) task.type = dto.type as any;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ?? null;
    return this.taskRepo.save(task);
  }

  async markDone(tenantId: string, id: string, studentId: string): Promise<Task> {
    const task = await this.findTask(tenantId, id);
    if (task.studentId !== studentId) throw new ForbiddenException('Not your task');
    task.done = true;
    task.doneAt = new Date();
    return this.taskRepo.save(task);
  }

  async deleteTask(tenantId: string, id: string): Promise<void> {
    const task = await this.findTask(tenantId, id);
    await this.taskRepo.remove(task);
  }

  async createStudyLog(tenantId: string, studentId: string, dto: CreateStudyLogDto): Promise<StudyLog> {
    const log = this.studyLogRepo.create({
      tenantId,
      studentId,
      sessionId: dto.sessionId ?? null,
      subjectId: dto.subjectId,
      topic: dto.topic,
      pagesRead: dto.pagesRead ?? 0,
      studiedAt: dto.studiedAt,
    });
    return this.studyLogRepo.save(log);
  }

  async findStudyLogsByStudent(tenantId: string, studentId: string): Promise<StudyLog[]> {
    return this.studyLogRepo.find({
      where: { tenantId, studentId },
      order: { studiedAt: 'DESC' },
    });
  }

  async createActivitySubmission(
    tenantId: string,
    studentId: string,
    dto: CreateActivitySubmissionDto,
    fileUrl: string,
    fileType?: string,
  ): Promise<ActivitySubmission> {
    const submission = this.submissionRepo.create({
      tenantId,
      studentId,
      taskId: dto.taskId,
      fileUrl,
      fileType: fileType ?? null,
      comment: dto.comment ?? null,
    });
    return this.submissionRepo.save(submission);
  }

  async findSubmissionsByTask(tenantId: string, taskId: string): Promise<ActivitySubmission[]> {
    return this.submissionRepo.find({ where: { tenantId, taskId } });
  }
}
