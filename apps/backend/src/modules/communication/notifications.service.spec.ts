import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';

const makeRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto) => dto),
  update: jest.fn(),
  count: jest.fn(),
  query: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: ReturnType<typeof makeRepo>;

  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(async () => {
    repo = makeRepo();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('send', () => {
    it('creates and saves notification', async () => {
      const saved = { id: 'n-1', tenantId, userId, title: 'Teste', body: 'Corpo', type: 'info', read: false };
      repo.save.mockResolvedValue(saved);

      const result = await service.send({ tenantId, userId, title: 'Teste', body: 'Corpo' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ read: false, type: 'info' }));
      expect(result.title).toBe('Teste');
    });

    it('uses provided type', async () => {
      repo.save.mockImplementation((v) => Promise.resolve(v));
      await service.send({ tenantId, userId, title: 'T', body: 'B', type: 'task' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'task' }));
    });
  });

  describe('findForUser', () => {
    it('returns notifications without unread filter by default', async () => {
      repo.find.mockResolvedValue([]);
      await service.findForUser(tenantId, userId);
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tenantId, userId }),
      }));
    });

    it('filters unread when flag is true', async () => {
      repo.find.mockResolvedValue([]);
      await service.findForUser(tenantId, userId, true);
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ read: false }),
      }));
    });
  });

  describe('markRead', () => {
    it('updates single notification', async () => {
      await service.markRead(tenantId, userId, 'n-1');
      expect(repo.update).toHaveBeenCalledWith({ tenantId, userId, id: 'n-1' }, { read: true });
    });
  });

  describe('markAllRead', () => {
    it('marks all unread as read', async () => {
      await service.markAllRead(tenantId, userId);
      expect(repo.update).toHaveBeenCalledWith({ tenantId, userId, read: false }, { read: true });
    });
  });

  describe('countUnread', () => {
    it('returns count of unread', async () => {
      repo.count.mockResolvedValue(3);
      const result = await service.countUnread(tenantId, userId);
      expect(result).toBe(3);
    });
  });

  describe('savePushToken', () => {
    it('updates push token via raw query', async () => {
      await service.savePushToken(userId, 'ExponentPushToken[xxx]');
      expect(repo.query).toHaveBeenCalledWith(
        'UPDATE users SET push_token = $1 WHERE id = $2',
        ['ExponentPushToken[xxx]', userId],
      );
    });
  });

  describe('sendWhatsApp', () => {
    it('returns silently in stub mode (no env vars)', async () => {
      await expect(service.sendWhatsApp('+5511999999999', 'Mensagem')).resolves.toBeUndefined();
    });
  });
});
