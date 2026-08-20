import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';

const mockGenerateAuthUrl = jest.fn();
const mockGetToken = jest.fn();
const mockSetCredentials = jest.fn();
const mockEventsInsert = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
      })),
    },
    calendar: jest.fn().mockImplementation(() => ({
      events: { insert: mockEventsInsert },
    })),
  },
}));

describe('GoogleCalendarService', () => {
  let configValues: Record<string, string | undefined>;

  const buildService = async (values: Record<string, string | undefined>) => {
    configValues = values;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => configValues[key]) } },
      ],
    }).compile();
    return module.get<GoogleCalendarService>(GoogleCalendarService);
  };

  const FULL_CONFIG = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'https://api.example.com/super-admin/google/callback',
    GOOGLE_REFRESH_TOKEN: 'refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('retorna true quando as 4 variáveis estão presentes', async () => {
      const service = await buildService(FULL_CONFIG);
      expect(service.isConfigured()).toBe(true);
    });

    it('retorna false quando falta o refresh token', async () => {
      const { GOOGLE_REFRESH_TOKEN, ...rest } = FULL_CONFIG;
      const service = await buildService(rest);
      expect(service.isConfigured()).toBe(false);
    });

    it('retorna false quando nenhuma variável está configurada', async () => {
      const service = await buildService({});
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('getAuthUrl', () => {
    it('gera a URL com o escopo de calendar quando há credenciais de client', async () => {
      const { GOOGLE_REFRESH_TOKEN, ...clientOnly } = FULL_CONFIG;
      const service = await buildService(clientOnly);
      mockGenerateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth');

      const url = service.getAuthUrl();

      expect(url).toBe('https://accounts.google.com/o/oauth2/auth');
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/calendar.events'],
        }),
      );
    });

    it('lança erro quando faltam credenciais de client', async () => {
      const service = await buildService({});
      expect(() => service.getAuthUrl()).toThrow();
    });
  });

  describe('exchangeCode', () => {
    it('retorna refreshToken e accessToken vindos do Google', async () => {
      const service = await buildService(FULL_CONFIG);
      mockGetToken.mockResolvedValue({ tokens: { refresh_token: 'rt-1', access_token: 'at-1' } });

      const result = await service.exchangeCode('auth-code');

      expect(result).toEqual({ refreshToken: 'rt-1', accessToken: 'at-1' });
    });

    it('retorna null quando o Google não devolve refresh_token', async () => {
      const service = await buildService(FULL_CONFIG);
      mockGetToken.mockResolvedValue({ tokens: { access_token: 'at-1' } });

      const result = await service.exchangeCode('auth-code');

      expect(result).toEqual({ refreshToken: null, accessToken: 'at-1' });
    });
  });

  describe('createMeetEvent', () => {
    it('retorna null sem chamar a API quando não está configurado', async () => {
      const service = await buildService({});

      const result = await service.createMeetEvent({
        summary: 'Aula', startTime: new Date('2025-01-01T10:00:00Z'), durationMinutes: 60,
      });

      expect(result).toBeNull();
      expect(mockEventsInsert).not.toHaveBeenCalled();
    });

    it('retorna o hangoutLink quando o Google cria o evento com sucesso', async () => {
      const service = await buildService(FULL_CONFIG);
      mockEventsInsert.mockResolvedValue({ data: { hangoutLink: 'https://meet.google.com/abc-defg-hij' } });

      const result = await service.createMeetEvent({
        summary: 'Aula de reforço (online)',
        startTime: new Date('2025-01-01T10:00:00Z'),
        durationMinutes: 60,
      });

      expect(result).toBe('https://meet.google.com/abc-defg-hij');
      expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: 'refresh-token' });
      expect(mockEventsInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'primary',
          conferenceDataVersion: 1,
        }),
      );
    });

    it('retorna null e não lança quando a chamada ao Google falha', async () => {
      const service = await buildService(FULL_CONFIG);
      mockEventsInsert.mockRejectedValue(new Error('quota exceeded'));

      const result = await service.createMeetEvent({
        summary: 'Aula', startTime: new Date('2025-01-01T10:00:00Z'), durationMinutes: 60,
      });

      expect(result).toBeNull();
    });
  });
});
