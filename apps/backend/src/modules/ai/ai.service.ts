import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import OpenAI from 'openai';
import { AiStudentPanorama } from './ai-student-panorama.entity';
import { AiActivitySuggestion, AiSuggestionType } from './ai-activity-suggestion.entity';
import { StudyLog } from '../tasks/study-log.entity';
import { SessionNote } from '../attendance/session-note.entity';
import { StudentProgress } from '../progress/student-progress.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class AiService {
  private openai: OpenAI | null;

  constructor(
    @InjectRepository(AiStudentPanorama) private panoramaRepo: Repository<AiStudentPanorama>,
    @InjectRepository(AiActivitySuggestion) private suggestionRepo: Repository<AiActivitySuggestion>,
    @InjectRepository(StudyLog) private studyLogRepo: Repository<StudyLog>,
    @InjectRepository(SessionNote) private sessionNoteRepo: Repository<SessionNote>,
    @InjectRepository(StudentProgress) private progressRepo: Repository<StudentProgress>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {
    const key = config.get<string>('OPENAI_API_KEY');
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
  }

  // ── Panorama do aluno ───────────────────────────────────────────────────────

  async generatePanorama(tenantId: string, studentId: string): Promise<AiStudentPanorama[]> {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 dias

    const logs = await this.studyLogRepo.find({ where: { tenantId, studentId } });
    const notes = await this.sessionNoteRepo.find({ where: { tenantId } });
    const progress = await this.progressRepo.find({ where: { tenantId, studentId } });

    // Agrupa topics por subjectId
    const topicsBySubject = new Map<string, Set<string>>();
    for (const log of logs) {
      if (!topicsBySubject.has(log.subjectId)) topicsBySubject.set(log.subjectId, new Set());
      topicsBySubject.get(log.subjectId)!.add(log.topic);
    }

    const panoramas: AiStudentPanorama[] = [];

    for (const prog of progress) {
      const topics = Array.from(topicsBySubject.get(prog.subjectId) ?? []);
      const recentTopics = this.getRecentTopics(logs.filter((l) => l.subjectId === prog.subjectId));

      let strengths: string[] = [];
      let needsReview: string[] = [];
      let summary: string | null = null;

      if (this.openai) {
        const context = [
          `Disciplina: ${prog.subjectId}`,
          `Nível atual: ${prog.level}`,
          `Tópicos estudados: ${topics.join(', ')}`,
          `Tópicos recentes: ${recentTopics.join(', ')}`,
          `Notas do professor: ${prog.notes ?? 'nenhuma'}`,
        ].join('\n');

        try {
          const resp = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Você é um assistente pedagógico. Analise o desempenho do aluno e responda em JSON com: strengths (array de strings), needsReview (array de strings), summary (string em pt-BR de 2-3 frases).' },
              { role: 'user', content: context },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
          });

          const parsed = JSON.parse(resp.choices[0].message.content ?? '{}');
          strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
          needsReview = Array.isArray(parsed.needsReview) ? parsed.needsReview : [];
          summary = typeof parsed.summary === 'string' ? parsed.summary : null;
        } catch {
          // Fallback se a chamada OpenAI falhar
          ({ strengths, needsReview } = this.fallbackAnalysis(prog.level, recentTopics));
        }
      } else {
        ({ strengths, needsReview } = this.fallbackAnalysis(prog.level, recentTopics));
      }

      // Assuntos nunca estudados = tópicos nas notas do professor mas ausentes nos logs
      const neverStudied = prog.notes
        ? []
        : [];

      const existing = await this.panoramaRepo.findOne({
        where: { tenantId, studentId, subjectId: prog.subjectId },
      });

      const panorama = existing ?? this.panoramaRepo.create({ tenantId, studentId, subjectId: prog.subjectId });
      panorama.strengths = strengths;
      panorama.needsReview = needsReview;
      panorama.neverStudied = neverStudied;
      panorama.level = prog.level;
      panorama.summary = summary;
      panorama.generatedAt = new Date();

      panoramas.push(await this.panoramaRepo.save(panorama));
    }

    return panoramas;
  }

  async getPanorama(tenantId: string, studentId: string): Promise<AiStudentPanorama[]> {
    return this.panoramaRepo.find({ where: { tenantId, studentId } });
  }

  // ── Agrupamento por assunto ─────────────────────────────────────────────────

  async groupByTopic(tenantId: string): Promise<Array<{ topic: string; studentIds: string[] }>> {
    const rows = await this.studyLogRepo
      .createQueryBuilder('sl')
      .select('sl.topic', 'topic')
      .addSelect('array_agg(DISTINCT sl.studentId)', 'studentIds')
      .where('sl.tenantId = :tenantId', { tenantId })
      .groupBy('sl.topic')
      .having('COUNT(DISTINCT sl.studentId) > 1')
      .orderBy('COUNT(DISTINCT sl.studentId)', 'DESC')
      .getRawMany();

    return rows.map((r) => ({ topic: r.topic, studentIds: r.studentIds }));
  }

  // ── Geração de atividades ───────────────────────────────────────────────────

  async generateActivity(
    tenantId: string,
    studentId: string,
    subjectId: string,
    type: AiSuggestionType = 'exercicio',
  ): Promise<AiActivitySuggestion> {
    const progress = await this.progressRepo.findOne({ where: { tenantId, studentId, subjectId } });
    const level = progress?.level ?? 'iniciante';

    const recentLogs = await this.studyLogRepo.find({
      where: { tenantId, studentId, subjectId },
      order: { studiedAt: 'DESC' },
      take: 5,
    });
    const recentTopics = recentLogs.map((l) => l.topic);

    let title: string;
    let content: string;

    if (this.openai && recentTopics.length > 0) {
      try {
        const resp = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Crie uma atividade do tipo "${type}" para um aluno de nível "${level}". Responda em JSON com: title (string), content (string com o enunciado completo em pt-BR, com 3-5 questões se for quiz).` },
            { role: 'user', content: `Tópicos recentes do aluno: ${recentTopics.join(', ')}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });

        const parsed = JSON.parse(resp.choices[0].message.content ?? '{}');
        title = parsed.title ?? `Atividade sobre ${recentTopics[0] ?? 'conteúdo'}`;
        content = parsed.content ?? this.fallbackActivity(type, level, recentTopics);
      } catch {
        title = `Atividade sobre ${recentTopics[0] ?? 'conteúdo'}`;
        content = this.fallbackActivity(type, level, recentTopics);
      }
    } else {
      title = `Atividade sobre ${recentTopics[0] ?? 'conteúdo'}`;
      content = this.fallbackActivity(type, level, recentTopics);
    }

    const suggestion = this.suggestionRepo.create({
      tenantId,
      studentId,
      subjectId,
      title,
      content,
      type,
      status: 'pending_review',
    });
    return this.suggestionRepo.save(suggestion);
  }

  async listSuggestionsForReview(tenantId: string) {
    return this.suggestionRepo.find({
      where: { tenantId, status: 'pending_review' },
      order: { createdAt: 'DESC' },
    });
  }

  async reviewSuggestion(tenantId: string, id: string, status: 'approved' | 'rejected', teacherId: string) {
    const suggestion = await this.suggestionRepo.findOne({ where: { tenantId, id } });
    if (!suggestion) throw new NotFoundException('Sugestão não encontrada');

    suggestion.status = status;
    suggestion.reviewedBy = teacherId;
    suggestion.reviewedAt = new Date();
    return this.suggestionRepo.save(suggestion);
  }

  async listApprovedForStudent(tenantId: string, studentId: string) {
    return this.suggestionRepo.find({
      where: { tenantId, studentId, status: 'approved' },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Cron: recalcula panoramas diariamente ──────────────────────────────────

  @Cron('0 20 * * *')
  async cronRecalculatePanoramas() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    // Alunos com atividade hoje
    const activeLogs = await this.studyLogRepo
      .createQueryBuilder('sl')
      .select('DISTINCT sl.tenantId', 'tenantId')
      .addSelect('sl.studentId', 'studentId')
      .where('sl.createdAt >= :since', { since })
      .getRawMany();

    for (const { tenantId, studentId } of activeLogs) {
      try {
        await this.generatePanorama(tenantId, studentId);
      } catch {
        // continua para os demais alunos se um falhar
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getRecentTopics(logs: StudyLog[], days = 14): string[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return [...new Set(
      logs.filter((l) => new Date(l.studiedAt) >= cutoff).map((l) => l.topic),
    )];
  }

  private fallbackAnalysis(level: string, recentTopics: string[]) {
    const strengths = recentTopics.slice(0, 2);
    const needsReview = recentTopics.slice(2, 4);
    return { strengths, needsReview };
  }

  private fallbackActivity(type: AiSuggestionType, level: string, topics: string[]): string {
    const topic = topics[0] ?? 'conteúdo estudado recentemente';
    if (type === 'quiz') {
      return `Quiz sobre ${topic} — nível ${level}\n\n1. O que você entende por ${topic}?\n2. Cite 2 exemplos de ${topic}.\n3. Qual a importância de ${topic} no contexto estudado?\n4. Como você aplicaria ${topic} em um problema prático?\n5. Resuma em uma frase o que aprendeu sobre ${topic}.`;
    }
    if (type === 'desafio') {
      return `Desafio sobre ${topic}\n\nAprofunde seu conhecimento sobre ${topic}. Pesquise, crie um resumo com suas próprias palavras e apresente 3 pontos que considera mais importantes.`;
    }
    return `Exercício sobre ${topic}\n\nResponda com base no que estudou:\n1. Defina ${topic} com suas próprias palavras.\n2. Resolva 3 exemplos práticos sobre ${topic}.\n3. Identifique uma dificuldade que ainda tem sobre o assunto.`;
  }
}
