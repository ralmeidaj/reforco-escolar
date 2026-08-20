import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

export interface CreateMeetEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
}

export interface GoogleTokens {
  refreshToken: string | null;
  accessToken: string | null;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
      this.config.get<string>('GOOGLE_CLIENT_SECRET') &&
      this.config.get<string>('GOOGLE_REDIRECT_URI') &&
      this.config.get<string>('GOOGLE_REFRESH_TOKEN'),
    );
  }

  private hasOAuthClientCredentials(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_CLIENT_ID') &&
      this.config.get<string>('GOOGLE_CLIENT_SECRET') &&
      this.config.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      this.config.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  // Etapa 1 do bootstrap único da conta da plataforma — visitar esta URL autoriza o app.
  getAuthUrl(): string {
    if (!this.hasOAuthClientCredentials()) {
      throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI não configurados');
    }
    return this.createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
    });
  }

  // Etapa 2 do bootstrap — troca o code do callback pelo refresh token a ser salvo em GOOGLE_REFRESH_TOKEN.
  async exchangeCode(code: string): Promise<GoogleTokens> {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    return {
      refreshToken: tokens.refresh_token ?? null,
      accessToken: tokens.access_token ?? null,
    };
  }

  // Cria o evento com Google Meet embutido na agenda da conta única da plataforma.
  // Sem participantes na requisição de propósito: evitar convite automático por e-mail
  // para professor/aluno sem consentimento explícito — o link já cobre o acesso à aula.
  async createMeetEvent(params: CreateMeetEventParams): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const client = this.createOAuthClient();
      client.setCredentials({ refresh_token: this.config.get<string>('GOOGLE_REFRESH_TOKEN') });
      const calendar = google.calendar({ version: 'v3', auth: client });

      const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60_000);

      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          conferenceData: {
            createRequest: {
              requestId: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      });

      return data.hangoutLink ?? null;
    } catch (err) {
      this.logger.warn(`Falha ao criar evento no Google Calendar: ${err}`);
      return null;
    }
  }
}
