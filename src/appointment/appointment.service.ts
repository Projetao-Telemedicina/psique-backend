import { GoogleCalendarService } from '@/google-calendar/google-calendar.service';
import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentCanceledBy, AppointmentStatus, Prisma, Role } from '@prisma/client';
import { CertificateService } from './certificate/certificate.service';
import { CanJoinResponseDto } from './dto/can-join-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

export interface CreatePendingAppointmentInput {
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  priceCents?: number;
}

type PreparedAppointmentInput = {
  patientId: string;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;
  patientName: string;
  patientEmail: string;
  professionalName: string;
  professionalEmail: string;
};

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private googleCalendar: GoogleCalendarService,
    private certificate: CertificateService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    const prepared = await this.prepareAppointmentInput({
      patientId: createAppointmentDto.patientId ?? '',
      professionalId: createAppointmentDto.professionalId,
      startsAt: createAppointmentDto.startsAt,
      endsAt: createAppointmentDto.endsAt,
      priceCents: createAppointmentDto.priceCents,
    });

    const calendarEvent = await this.googleCalendar.createAppointmentEvent({
      patientName: prepared.patientName,
      patientEmail: prepared.patientEmail,
      professionalName: prepared.professionalName,
      professionalEmail: prepared.professionalEmail,
      startsAt: prepared.startsAt,
      endsAt: prepared.endsAt,
      requestId: crypto.randomUUID(),
    });

    return this.prisma.appointment.create({
      data: {
        professionalId: prepared.professionalId,
        patientId: prepared.patientId,
        startsAt: prepared.startsAt,
        endsAt: prepared.endsAt,
        priceCents: prepared.priceCents,
        confirmedAt: new Date(),
        googleCalendarEventId: calendarEvent.eventId,
        meetLink: calendarEvent.meetLink,
      },
    });
  }

  async createPendingAppointment(input: CreatePendingAppointmentInput) {
    const prepared = await this.prepareAppointmentInput(input);

    return this.prisma.appointment.create({
      data: {
        professionalId: prepared.professionalId,
        patientId: prepared.patientId,
        startsAt: prepared.startsAt,
        endsAt: prepared.endsAt,
        priceCents: prepared.priceCents,
      },
    });
  }

  async confirmPendingAppointment(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        professionalId: true,
        startsAt: true,
        endsAt: true,
        priceCents: true,
        status: true,
        confirmedAt: true,
        googleCalendarEventId: true,
        meetLink: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      throw new BadRequestException('Esta consulta já foi cancelada.');
    }

    if (appointment.confirmedAt && appointment.googleCalendarEventId && appointment.meetLink) {
      return appointment;
    }

    const [patient, professional] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: appointment.patientId },
        select: { name: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: appointment.professionalId },
        select: { name: true, email: true },
      }),
    ]);

    if (!patient || !professional) {
      throw new NotFoundException('Paciente ou profissional não encontrado.');
    }

    const calendarEvent = await this.googleCalendar.createAppointmentEvent({
      patientName: patient.name,
      patientEmail: patient.email,
      professionalName: professional.name,
      professionalEmail: professional.email,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      requestId: crypto.randomUUID(),
    });

    return this.prisma.appointment.update({
      where: { id },
      data: {
        confirmedAt: appointment.confirmedAt ?? new Date(),
        googleCalendarEventId: calendarEvent.eventId,
        meetLink: calendarEvent.meetLink,
      },
    });
  }

  async cancelPendingAppointment(id: string, reason: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        googleCalendarEventId: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    if (appointment.status === AppointmentStatus.CANCELED) {
      return this.prisma.appointment.findUnique({ where: { id } });
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledBy: AppointmentCanceledBy.SYSTEM,
        cancellationReason: reason,
        canceledAt: new Date(),
      },
    });

    if (appointment.googleCalendarEventId) {
      await this.googleCalendar.deleteAppointmentEvent(appointment.googleCalendarEventId);
    }

    return updatedAppointment;
  }

  async getAll(status?: AppointmentStatus) {
    return this.prisma.appointment.findMany({
      where: {
        ...(status && { status }),
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async getById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            user: { select: { name: true, avatarUrl: true } },
          },
        },
        professional: {
          select: {
            specialty: true,
            crp: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    return appointment;
  }

  async getAppointmentsByDate(userId: string, userRole: Role, date: string) {
    const targetDate = new Date(date);

    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Data inválida. Use o formato YYYY-MM-DD');
    }

    const dayStart = new Date(targetDate);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        startsAt: { gte: dayStart },
        endsAt: { lte: dayEnd },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        patient: {
          select: {
            user: { select: { name: true, avatarUrl: true } },
          },
        },
        professional: {
          select: {
            specialty: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async getUpcomingAppointments(userId: string, userRole: Role, page: number, limit: number) {
    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        startsAt: { gte: new Date() },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
      },
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        patient: {
          select: { user: { select: { name: true, avatarUrl: true } } },
        },
        professional: {
          select: {
            specialty: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async getAppointmentHistory(userId: string, userRole: Role, page: number, limit: number) {
    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        status: {
          in: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
          ],
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: isPatient
        ? {
            professional: {
              select: {
                specialty: true,
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          }
        : {
            patient: {
              select: { user: { select: { name: true, avatarUrl: true } } },
            },
          },
    });
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    await this.getById(id);

    const dataToUpdate: Prisma.AppointmentUpdateInput = {};

    if (updateAppointmentDto.startsAt) {
      dataToUpdate.startsAt = new Date(updateAppointmentDto.startsAt);
    }
    if (updateAppointmentDto.endsAt) {
      dataToUpdate.endsAt = new Date(updateAppointmentDto.endsAt);
    }
    if (updateAppointmentDto.priceCents !== undefined) {
      dataToUpdate.priceCents = updateAppointmentDto.priceCents;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    await this.getById(id);

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }

  async markAsCompleted(id: string) {
    const appointment = await this.getById(id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Apenas consultas agendadas podem ser marcadas como concluídas.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markAsNoShow(id: string) {
    const appointment = await this.getById(id);

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Apenas consultas agendadas podem ser marcadas como ausência.');
    }

    if (appointment.endsAt > new Date()) {
      throw new BadRequestException('A consulta ainda não terminou.');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.NO_SHOW },
    });
  }

  async applyReschedule(id: string, newStartsAt: Date, newEndsAt: Date) {
    const appointment = await this.getById(id);

    if (appointment.status !== AppointmentStatus.RESCHEDULE_REQUESTED) {
      throw new BadRequestException('Esta consulta não está em processo de reagendamento.');
    }

    const conflictTimeReschedule = await this.prisma.appointment.findFirst({
      where: {
        id: { not: id },
        professionalId: appointment.professionalId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
        startsAt: { lt: newEndsAt },
        endsAt: { gt: newStartsAt },
      },
    });

    if (conflictTimeReschedule) {
      throw new ConflictException('O profissional já possui uma consulta neste novo horário.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        status: AppointmentStatus.SCHEDULED,
      },
    });

    if (updated.googleCalendarEventId) {
      await this.googleCalendar.updateAppointmentEvent({
        eventId: updated.googleCalendarEventId,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
      });
    }

    return updated;
  }

  async canJoinAppointment(id: string, userId: string): Promise<CanJoinResponseDto> {
    const appointment = await this.getById(id);

    const isParticipant = appointment.patientId === userId || appointment.professionalId === userId;

    if (!isParticipant) {
      throw new ForbiddenException('Você não tem permissão para acessar esta consulta.');
    }

    const activeStatuses: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.RESCHEDULE_REQUESTED,
    ];

    if (!activeStatuses.includes(appointment.status)) {
      throw new BadRequestException('Esta consulta não está disponível para acesso.');
    }

    if (!appointment.meetLink) {
      throw new BadRequestException('Esta consulta não possui link de videoconferência.');
    }

    const now = new Date();
    const startsAt = new Date(appointment.startsAt);
    const endsAt = new Date(appointment.endsAt);

    const joinToleranceMs = 10 * 60 * 1000;
    const earliestJoinTime = new Date(startsAt.getTime() - joinToleranceMs);

    const minutesUntilStart = Math.round((startsAt.getTime() - now.getTime()) / (1000 * 60));

    if (now < earliestJoinTime) {
      throw new BadRequestException(
        `A consulta ainda não foi iniciada. Você poderá acessar a sala ${minutesUntilStart} minuto(s) antes do início.`,
      );
    }

    if (now > endsAt) {
      throw new BadRequestException('O horário desta consulta já foi encerrado.');
    }

    return {
      canJoin: true,
      meetLink: appointment.meetLink,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      minutesUntilStart: minutesUntilStart < 0 ? 0 : minutesUntilStart,
    };
  }

  async cancelAppointment(id: string, cancelAppointmentDto: CancelAppointmentDto) {
    const appointment = await this.getById(id);

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELED
    ) {
      throw new BadRequestException(
        'Esta consulta não pode ser cancelada pois já foi finalizada ou cancelada.',
      );
    }

    if (cancelAppointmentDto.canceledBy === AppointmentCanceledBy.PATIENT) {
      const hoursUntilAppointment =
        (appointment.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        throw new BadRequestException(
          'Cancelamentos com menos de 24 horas de antecedência estão sujeitos à política de taxas. Consulte os termos antes de prosseguir.',
        );
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELED,
        canceledBy: cancelAppointmentDto.canceledBy,
        cancellationReason: cancelAppointmentDto.cancellationReason,
        canceledAt: new Date(),
      },
    });

    if (updated.googleCalendarEventId) {
      await this.googleCalendar.deleteAppointmentEvent(updated.googleCalendarEventId);
    }

    return updated;
  }

  async generateCertificate(id: string, userId: string): Promise<Buffer> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: { select: { name: true } } },
        },
        professional: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    const isParticipant = appointment.patientId === userId || appointment.professionalId === userId;

    if (!isParticipant) {
      throw new ForbiddenException('Você não tem permissão para acessar este certificado.');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('O certificado só está disponível para consultas concluídas.');
    }

    return this.certificate.generateAttendanceCertificate({
      appointmentId: appointment.id,
      patientName: appointment.patient.user.name,
      professionalName: appointment.professional.user.name,
      professionalCrp: appointment.professional.crp,
      professionalSpecialty: appointment.professional.specialty,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      completedAt: appointment.completedAt!,
    });
  }

  private async prepareAppointmentInput(
    input: CreatePendingAppointmentInput,
  ): Promise<PreparedAppointmentInput> {
    if (!input.patientId) {
      throw new BadRequestException('O ID do paciente é obrigatório para agendar a consulta.');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('A data de término deve ser posterior à data de início.');
    }

    const patientHaveAppointment = await this.prisma.appointment.findFirst({
      where: {
        patientId: input.patientId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (patientHaveAppointment) {
      throw new ConflictException(
        'O paciente já possui uma consulta marcada no mesmo horário ou está reagendando uma consulta nesse horário.',
      );
    }

    const conflictAppointment = await this.prisma.appointment.findFirst({
      where: {
        professionalId: input.professionalId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictAppointment) {
      throw new ConflictException('O profissional possui uma consulta no mesmo horário.');
    }

    const priceCents = input.priceCents ?? 0;

    if (priceCents < 0) {
      throw new BadRequestException('O preço não pode ser negativo.');
    }

    const [patient, professional] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.patientId },
        select: { name: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: input.professionalId },
        select: { name: true, email: true },
      }),
    ]);

    if (!patient || !professional) {
      throw new NotFoundException('Paciente ou profissional não encontrado.');
    }

    return {
      patientId: input.patientId,
      professionalId: input.professionalId,
      startsAt,
      endsAt,
      priceCents,
      patientName: patient.name,
      patientEmail: patient.email,
      professionalName: professional.name,
      professionalEmail: professional.email,
    };
  }
}
