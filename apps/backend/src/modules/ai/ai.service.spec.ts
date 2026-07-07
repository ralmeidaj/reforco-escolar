import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiStudentPanorama } from './ai-student-panorama.entity';
import { AiActivitySuggestion } from './ai-activity-suggestion.entity';
import { StudyLog } from '../tasks/study-log.entity';
import { SessionNote } from '../attendance/session-note.entity';
import { StudentProgress } from '../progress/student-progress.entity';
import { User } from '../auth/user.entity';

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

const mkRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((e) => Promise.resolve({ id: 'gen-id', ...e })),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  }),
});

const mockConfig = { get: jest.fn().mockReturnValue(null) }; // sem OPENAI_API_KEY

describe('AiService', () => {
  let service: AiService;
  let panoramaRepo: ReturnType<typeof mkRepo>;
  let suggestionRepo: ReturnType<typeof mkRepo>;
  let studyLogRepo: ReturnType<typeof mkRepo>;
  let progressRepo: ReturnType<typeof mkRepo>;

  beforeEach(async () => {
    panoramaRepo = mkRepo();
    suggestionRepo = mkRepo();
    studyLogRepo = mkRepo();
    const sessionNoteRepo = mkRepo();
    progressRepo = mkRepo();
    const userRepo = mkRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getRepositoryToken(AiStudentPanorama), useValue: panoramaRepo },
        { provide: getRepositoryToken(AiActivitySuggestion), useValue: suggestionRepo },
        { provide: getRepositoryToken(StudyLog), useValue: studyLogRepo },
        { provide: getRepositoryToken(SessionNote), useValue: sessionNoteRepo },
        { provide: getRepositoryToken(StudentProgress), useValue: progressRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AiService);
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue(null);
  });

  describe('generatePanorama', () => {
    it('deve gerar panorama via fallback quando não há OPENAI_API_KEY', async () => {
      studyLogRepo.find.mockResolvedValue([
        { subjectId: 'sub-1', topic: 'Frações', studiedAt: '2025-01-10' },
        { subjectId: 'sub-1', topic: 'Decimais', studiedAt: '2025-01-11' },
      ]);
      progressRepo.find.mockResolvedValue([
        { subjectId: 'sub-1', level: 'basico', notes: null },
      ]);
      panoramaRepo.findOne.mockResolvedValue(null);

      const result = await service.generatePanorama('t1', 's1');

      expect(result).toHaveLength(1);
      expect(panoramaRepo.save).toHaveBeenCalledTimes(1);
    });

    it('deve atualizar panorama existente', async () => {
      studyLogRepo.find.mockResolvedValue([
        { subjectId: 'sub-1', topic: 'Equações', studiedAt: '2025-01-10' },
      ]);
      progressRepo.find.mockResolvedValue([
        { subjectId: 'sub-1', level: 'intermediario', notes: null },
      ]);
      const existing = { id: 'p1', tenantId: 't1', studentId: 's1', subjectId: 'sub-1' };
      panoramaRepo.findOne.mockResolvedValue(existing);

      await service.generatePanorama('t1', 's1');

      expect(panoramaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    });

    it('deve retornar array vazio quando aluno não tem progresso', async () => {
      studyLogRepo.find.mockResolvedValue([]);
      progressRepo.find.mockResolvedValue([]);

      const result = await service.generatePanorama('t1', 's1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPanorama', () => {
    it('deve retornar panoramas do aluno', async () => {
      const panoramas = [{ id: 'p1', studentId: 's1' }];
      panoramaRepo.find.mockResolvedValue(panoramas);

      const result = await service.getPanorama('t1', 's1');

      expect(result).toEqual(panoramas);
    });
  });

  describe('groupByTopic', () => {
    it('deve retornar grupos de alunos por tópico', async () => {
      const groups = [
        { topic: 'Frações', studentIds: ['s1', 's2'] },
        { topic: 'Álgebra', studentIds: ['s1', 's3', 's4'] },
      ];
      studyLogRepo.createQueryBuilder().getRawMany.mockResolvedValue(groups);

      const result = await service.groupByTopic('t1');

      expect(result).toEqual(groups);
    });

    it('deve retornar array vazio quando nenhum tópico em comum', async () => {
      studyLogRepo.createQueryBuilder().getRawMany.mockResolvedValue([]);

      const result = await service.groupByTopic('t1');

      expect(result).toHaveLength(0);
    });
  });

  describe('generateActivity', () => {
    it('deve gerar atividade fallback sem OpenAI', async () => {
      progressRepo.findOne.mockResolvedValue({ level: 'iniciante' });
      studyLogRepo.find.mockResolvedValue([
        { topic: 'Frações', subjectId: 'sub-1', studiedAt: '2025-01-10' },
      ]);

      const result = await service.generateActivity('t1', 's1', 'sub-1', 'exercicio');

      expect(suggestionRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('deve gerar quiz fallback', async () => {
      progressRepo.findOne.mockResolvedValue({ level: 'intermediario' });
      studyLogRepo.find.mockResolvedValue([{ topic: 'Álgebra', studiedAt: '2025-01-10' }]);

      const result = await service.generateActivity('t1', 's1', 'sub-1', 'quiz');

      const savedArg = suggestionRepo.save.mock.calls[0][0];
      expect(savedArg.type).toBe('quiz');
      expect(savedArg.content).toContain('Quiz');
    });

    it('deve usar nível iniciante quando aluno não tem progresso cadastrado', async () => {
      progressRepo.findOne.mockResolvedValue(null);
      studyLogRepo.find.mockResolvedValue([]);

      await service.generateActivity('t1', 's1', 'sub-1');

      const savedArg = suggestionRepo.save.mock.calls[0][0];
      expect(savedArg.status).toBe('pending_review');
    });
  });

  describe('reviewSuggestion', () => {
    it('deve aprovar sugestão', async () => {
      const suggestion = { id: 'sg1', tenantId: 't1', status: 'pending_review', reviewedBy: null, reviewedAt: null };
      suggestionRepo.findOne.mockResolvedValue(suggestion);

      await service.reviewSuggestion('t1', 'sg1', 'approved', 'teacher-1');

      expect(suggestionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', reviewedBy: 'teacher-1' }));
    });

    it('deve rejeitar sugestão', async () => {
      const suggestion = { id: 'sg1', tenantId: 't1', status: 'pending_review' };
      suggestionRepo.findOne.mockResolvedValue(suggestion);

      await service.reviewSuggestion('t1', 'sg1', 'rejected', 'teacher-1');

      expect(suggestionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    });

    it('deve lançar NotFoundException para sugestão inexistente', async () => {
      suggestionRepo.findOne.mockResolvedValue(null);

      await expect(service.reviewSuggestion('t1', 'bad', 'approved', 't1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSuggestionsForReview', () => {
    it('deve listar sugestões pendentes', async () => {
      const suggestions = [{ id: 'sg1', status: 'pending_review' }];
      suggestionRepo.find.mockResolvedValue(suggestions);

      const result = await service.listSuggestionsForReview('t1');

      expect(result).toEqual(suggestions);
    });
  });
});
