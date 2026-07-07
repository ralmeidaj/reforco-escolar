import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationType } from './notification.entity';

export interface SendNotificationPayload {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly config: ConfigService,
  ) {}

  async send(payload: SendNotificationPayload): Promise<Notification> {
    const notification = this.repo.create({
      tenantId: payload.tenantId,
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? 'info',
      read: false,
    });
    const saved = await this.repo.save(notification);
    return saved;
  }

  async sendMany(payloads: SendNotificationPayload[]): Promise<void> {
    for (const p of payloads) {
      await this.send(p);
    }
  }

  async findForUser(tenantId: string, userId: string, onlyUnread = false): Promise<Notification[]> {
    return this.repo.find({
      where: { tenantId, userId, ...(onlyUnread ? { read: false } : {}) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<void> {
    await this.repo.update({ tenantId, userId, id }, { read: true });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.repo.update({ tenantId, userId, read: false }, { read: true });
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.repo.count({ where: { tenantId, userId, read: false } });
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.repo.query('UPDATE users SET push_token = $1 WHERE id = $2', [token, userId]);
  }

  async sendPush(userId: string, title: string, body: string): Promise<void> {
    const rows: { push_token: string | null }[] = await this.repo.query(
      'SELECT push_token FROM users WHERE id = $1',
      [userId],
    );
    const token = rows[0]?.push_token;
    if (!token || !token.startsWith('ExponentPushToken')) return;

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body, sound: 'default' }),
      });
    } catch (err) {
      this.logger.warn(`Push falhou para ${userId}: ${err}`);
    }
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    const url = this.config.get<string>('EVOLUTION_API_URL');
    const key = this.config.get<string>('EVOLUTION_API_KEY');
    if (!url || !key) return; // stub mode

    try {
      await fetch(`${url}/message/sendText/reforcos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key },
        body: JSON.stringify({ number: phone, textMessage: { text: message } }),
      });
    } catch (err) {
      this.logger.warn(`WhatsApp falhou para ${phone}: ${err}`);
    }
  }
}
