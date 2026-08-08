import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import OpenAI from 'openai';
import { Task } from './task.entity';
import { StudyLog } from './study-log.entity';
import { ActivitySubmission } from './activity-submission.entity';
import { SchoolTaskCapture } from './school-task-capture.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateStudyLogDto } from './dto/create-study-log.dto';
import { CreateActivitySubmissionDto } from './dto/create-activity-submission.dto';
import { ConfirmSchoolTaskCaptureDto } from './dto/confirm-school-task-capture.dto';

@Injectable()
export class TasksService {
  private openai: OpenAI | null;

  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(StudyLog) private readonly studyLogRepo: Repository<StudyLog>,
    @InjectRepository(ActivitySubmission) private readonly submissionRepo: Repository<ActivitySubmission>,
    @InjectRepository(SchoolTaskCapture) private readonly captureRepo: Repository<SchoolTaskCapture>,
    private readonly config: ConfigService,
  ) {
    const key = config.get<string>('OPENAI_API_KEY');
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
  }

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

  // ── Captura de tarefa da escola regular (IA) ────────────────────────────────

  async extractSchoolTaskCapture(
    tenantId: string,
    file: any,
  ): Promise<{ imageUrl: string; extracted: Record<string, any> | null }> {
    const imageUrl = file ? `/uploads/${file.filename}` : 'stub://no-file';
    if (!this.openai || !file) return { imageUrl, extracted: null };

    try {
      const base64 = fs.readFileSync(file.path).toString('base64');
      const resp = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você extrai dados de uma tarefa escolar a partir de um print de tela de um app/portal de escola. Responda em JSON com: subject (string ou null), title (string), description (string ou null), dueDate (string YYYY-MM-DD ou null).',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia a tarefa mostrada nesta imagem.' },
              { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64}` } },
            ] as any,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const extracted = JSON.parse(resp.choices[0].message.content ?? '{}');
      return { imageUrl, extracted };
    } catch {
      return { imageUrl, extracted: null };
    }
  }

  async confirmSchoolTaskCapture(
    tenantId: string,
    studentId: string,
    dto: ConfirmSchoolTaskCaptureDto,
  ): Promise<SchoolTaskCapture> {
    const capture = this.captureRepo.create({
      tenantId,
      studentId,
      imageUrl: dto.imageUrl,
      subject: dto.subject ?? null,
      title: dto.title,
      description: dto.description ?? null,
      dueDate: dto.dueDate ?? null,
    });
    return this.captureRepo.save(capture);
  }

  async findSchoolTaskCaptures(tenantId: string, studentId?: string): Promise<SchoolTaskCapture[]> {
    return this.captureRepo.find({
      where: studentId ? { tenantId, studentId } : { tenantId },
      order: { createdAt: 'DESC' },
      relations: { student: true },
    });
  }
}
