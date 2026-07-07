import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { Message } from './message.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  query: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  }),
});

describe('MessagesService', () => {
  let service: MessagesService;
  let repo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const otherId = 'user-2';

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: repo },
      ],
    }).compile();
    service = module.get<MessagesService>(MessagesService);
  });

  describe('send', () => {
    it('creates and saves a message', async () => {
      const saved = { id: 'msg-1', tenantId, fromId: userId, toId: otherId, content: 'Olá', readAt: null };
      repo.save.mockResolvedValue(saved);

      const result = await service.send(tenantId, userId, { toId: otherId, content: 'Olá' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ fromId: userId, toId: otherId, content: 'Olá' }));
      expect(result.content).toBe('Olá');
    });
  });

  describe('getConversation', () => {
    it('queries both directions of conversation', async () => {
      repo.find.mockResolvedValue([]);
      await service.getConversation(tenantId, userId, otherId);
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.arrayContaining([
          expect.objectContaining({ fromId: userId, toId: otherId }),
          expect.objectContaining({ fromId: otherId, toId: userId }),
        ]),
        order: { createdAt: 'ASC' },
      }));
    });
  });

  describe('getContacts', () => {
    it('returns contacts with unread count', async () => {
      repo.query.mockResolvedValue([{ other_id: otherId, unread: '2' }]);
      const result = await service.getContacts(tenantId, userId);
      expect(result).toEqual([{ userId: otherId, unread: 2 }]);
    });
  });

  describe('markRead', () => {
    it('calls update query builder', async () => {
      await service.markRead(tenantId, userId, otherId);
      expect(repo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
