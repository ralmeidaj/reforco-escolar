import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import OpenAI from 'openai';
import { AiStudentPanorama } from './ai-student-panorama.entity';
import { AiActivitySuggestion, AiSuggestionType } from './ai-activity-suggestion.entity';
import { ActivityCorrection, ActivityCorrectionQuestion } from './activity-correction.entity';
import { StudyLog } from '../tasks/study-log.entity';
import { SessionNote } from '../attendance/session-note.entity';
import { StudentProgress } from '../progress/student-progress.entity';
import { User } from '../auth/user.entity';
import { CreateActivityCorrectionDto } from './dto/create-activity-correction.dto';

@Injectable()
export class AiService {
  private openai: OpenAI | null;

  constructor(
    @InjectRepository(AiStudentPanorama) private panoramaRepo: Repository<AiStudentPanorama>,
    @InjectRepository(AiActivitySuggestion) private suggestionRepo: Repository<AiActivitySuggestion>,
    @InjectRepository(ActivityCorrection) private correctionRepo: Repository<ActivityCorrection>,
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

  // ── Corretor de atividades por foto (IA) ────────────────────────────────────

  async correctActivity(
    tenantId: string,
    createdBy: string,
    file: any,
    dto: CreateActivityCorrectionDto,
  ): Promise<ActivityCorrection> {
    if (!this.openai) {
      throw new BadRequestException('Correção por IA não está disponível — configure OPENAI_API_KEY.');
    }
    if (!file) {
      throw new BadRequestException('Envie a foto da atividade.');
    }

    const imageUrl = `/uploads/${file.filename}`;
    const base64 = fs.readFileSync(file.path).toString('base64');

    const systemPrompt = `Você é uma professora de reforço experiente, corrigindo uma atividade de livro didático escolar que NÃO tem gabarito disponível — você precisa julgar cada resposta com seu próprio conhecimento do conteúdo esperado para a série informada.

Para cada questão visível na foto:
1. Leia o enunciado (quando estiver na foto) e a resposta manuscrita do aluno.
2. Julgue se a resposta está correta, incorreta ou parcialmente correta, considerando o que é esperado para a série escolar informada. Se a questão for de opinião/interpretação sem resposta única, avalie a coerência e a argumentação em vez de certo/errado, e explique isso no feedback.
3. Avalie também a QUALIDADE DA ESCRITA: legibilidade da letra, ortografia, gramática, pontuação e organização da frase — isso é tão importante quanto o conteúdo, porque o objetivo é ajudar o aluno a escrever melhor.
4. Escreva um feedback curto (1 frase) com uma orientação prática e específica de como a resposta poderia ficar melhor (ex: "Capriche na letra da palavra 'quantidade'", "Escreva a resposta em frase completa, não só o número", "Revise a ortografia de 'trabalho'").
5. Se não conseguir ler alguma parte com certeza, faça sua melhor leitura e diga isso no feedback, sem deixar de tentar.

Ao final:
- "summary": 2-3 frases sobre o desempenho geral, destacando pontos fortes e o principal ponto a praticar.
- "voiceOrientation": um texto corrido (4-6 frases), escrito como se a professora estivesse falando diretamente e calorosamente com o aluno em voz alta — parabenizando o que ele fez bem e orientando, de forma clara e motivadora, exatamente o que ele precisa treinar para escrever melhor da próxima vez. Evite jargão, use frases curtas, tom de incentivo.

Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{
  "questions": [
    {"number": "1", "studentAnswer": "o que o aluno escreveu (ou '(não respondeu)' se em branco/ilegível)", "status": "correct|wrong|partial", "feedback": "frase curta de feedback com orientação de escrita"}
  ],
  "score": "ex: 7/10 (sua melhor estimativa)",
  "summary": "observação geral final",
  "voiceOrientation": "texto para ser lido em voz alta ao aluno"
}`;

    const userText = [
      `Matéria/tema: ${dto.subject}`,
      `Série/ano escolar: ${dto.gradeLevel ?? 'não informada'}`,
      '',
      'Não há gabarito — use seu conhecimento do conteúdo esperado para essa série para julgar as respostas. Corrija a atividade na foto seguindo as instruções, com foco tanto no conteúdo quanto na qualidade da escrita.',
    ].join('\n');

    let parsed: any;
    try {
      const resp = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64}` } },
            ] as any,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      parsed = JSON.parse(resp.choices[0].message.content ?? '{}');
    } catch {
      throw new BadRequestException('Não foi possível corrigir a atividade. Verifique a foto e tente novamente.');
    }

    const questions: ActivityCorrectionQuestion[] = Array.isArray(parsed.questions) ? parsed.questions : [];

    const correction = this.correctionRepo.create({
      tenantId,
      studentId: dto.studentId,
      createdBy,
      subject: dto.subject,
      gradeLevel: dto.gradeLevel ?? null,
      imageUrl,
      score: parsed.score ?? null,
      questions,
      summary: parsed.summary ?? null,
      voiceOrientation: parsed.voiceOrientation ?? null,
    });
    return this.correctionRepo.save(correction);
  }

  async findActivityCorrections(tenantId: string, studentId?: string): Promise<ActivityCorrection[]> {
    return this.correctionRepo.find({
      where: studentId ? { tenantId, studentId } : { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteActivityCorrection(tenantId: string, id: string): Promise<void> {
    const correction = await this.correctionRepo.findOne({ where: { tenantId, id } });
    if (!correction) throw new NotFoundException('Correção não encontrada');
    await this.correctionRepo.remove(correction);
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
