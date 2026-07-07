import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or, Equal } from 'typeorm';
import { Message } from './message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly repo: Repository<Message>,
  ) {}

  async send(tenantId: string, fromId: string, dto: SendMessageDto): Promise<Message> {
    const msg = this.repo.create({ tenantId, fromId, toId: dto.toId, content: dto.content, readAt: null });
    return this.repo.save(msg);
  }

  async getConversation(tenantId: string, userId: string, otherId: string): Promise<Message[]> {
    return this.repo.find({
      where: [
        { tenantId, fromId: userId, toId: otherId },
        { tenantId, fromId: otherId, toId: userId },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  async markRead(tenantId: string, userId: string, otherId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('tenant_id = :tenantId AND to_id = :userId AND from_id = :otherId AND read_at IS NULL', {
        tenantId, userId, otherId,
      })
      .execute();
  }

  async getContacts(tenantId: string, userId: string): Promise<{ userId: string; unread: number }[]> {
    const rows: { other_id: string; unread: string }[] = await this.repo.query(
      `SELECT CASE WHEN from_id = $1 THEN to_id ELSE from_id END AS other_id,
              COUNT(*) FILTER (WHERE to_id = $1 AND read_at IS NULL) AS unread
       FROM messages
       WHERE tenant_id = $2 AND (from_id = $1 OR to_id = $1)
       GROUP BY other_id`,
      [userId, tenantId],
    );
    return rows.map((r) => ({ userId: r.other_id, unread: Number(r.unread) }));
  }
}
