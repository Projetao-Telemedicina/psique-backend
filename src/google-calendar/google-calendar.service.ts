import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
}

@Injectable()
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(private config: ConfigService) {
    const oauth2Client = new google.auth.OAuth2(
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      'urn:ietf:wg:oauth:2.0:oob',
    );

    oauth2Client.setCredentials({
      refresh_token: this.config.getOrThrow<string>('GOOGLE_REFRESH_TOKEN'),
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async createAppointmentEvent(params: {
    patientName: string;
    patientEmail: string;
    professionalName: string;
    professionalEmail: string;
    startsAt: Date;
    endsAt: Date;
    requestId: string;
  }): Promise<CalendarEventResult> {
    const calendarId = this.config.getOrThrow<string>('GOOGLE_CALENDAR_ID');

    try {
      const response = await this.calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // envia e-mail de convite para os participantes
        requestBody: {
          summary: `Consulta: ${params.professionalName} x ${params.patientName}`,
          description: 'Consulta online pela plataforma Psique.',
          start: {
            dateTime: params.startsAt.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: params.endsAt.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          attendees: [
            { email: params.patientEmail, displayName: params.patientName },
            { email: params.professionalEmail, displayName: params.professionalName },
          ],
          conferenceData: {
            createRequest: {
              requestId: params.requestId,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 15 },
            ],
          },
        },
      });

      const event = response.data;

      const meetLink = event.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri;

      if (!meetLink) {
        throw new InternalServerErrorException(
          'Evento criado, mas o link do Google Meet não foi gerado.',
        );
      }

      return {
        eventId: event.id!,
        meetLink,
        htmlLink: event.htmlLink!,
      };
    } catch (error) {
      const err = error as Error;
      throw new InternalServerErrorException(
        `Erro ao criar evento no Google Calendar: ${err.message}`,
      );
    }
  }

  async updateAppointmentEvent(params: {
    eventId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<void> {
    const calendarId = this.config.getOrThrow<string>('GOOGLE_CALENDAR_ID');

    try {
      await this.calendar.events.patch({
        calendarId,
        eventId: params.eventId,
        sendUpdates: 'all', // notifica os convidados sobre a alteração
        requestBody: {
          start: {
            dateTime: params.startsAt.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: params.endsAt.toISOString(),
            timeZone: 'America/Sao_Paulo',
          },
        },
      });
    } catch (error) {
      const err = error as Error;
      console.error(`Erro ao atualizar evento no Calendar: ${err.message}`);
    }
  }

  async deleteAppointmentEvent(eventId: string): Promise<void> {
    const calendarId = this.config.getOrThrow<string>('GOOGLE_CALENDAR_ID');

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all', // notifica os convidados sobre o cancelamento
      });
    } catch (error) {
      const err = error as Error;
      console.error(`Erro ao deletar evento no Calendar: ${err.message}`);
    }
  }
}