import { PrismaService } from '@/prisma/index';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentCanceledBy, AppointmentStatus, Prisma, Role } from '@prisma/client';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { GoogleCalendarService } from '@/google-calendar/google-calendar.service';
import { CanJoinResponseDto } from './dto/can-join-appointment.dto';
import { CertificateService } from './certificate/certificate.service';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private googleCalendar: GoogleCalendarService,
    private certificate: CertificateService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    if (!createAppointmentDto.patientId) {
      throw new BadRequestException('O ID do paciente é obrigatório para agendar a consulta.');
    }

    const startsAt = new Date(createAppointmentDto.startsAt);
    const endsAt = new Date(createAppointmentDto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('A data de término deve ser posterior à data de início.');
    }

    const conflictAppointment = await this.prisma.appointment.findFirst({
      where: {
        professionalId: createAppointmentDto.professionalId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.RESCHEDULE_REQUESTED
          ],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictAppointment) {
      throw new ConflictException('O profissional possui uma consulta no mesmo horário.');
    }

    const price = createAppointmentDto.priceCents ?? 0;

    if (price < 0) {
      throw new BadRequestException('O preço não pode ser negativo.');
    }

    const [patient, professional] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: createAppointmentDto.patientId },
        select: { name: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: createAppointmentDto.professionalId },
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
      startsAt,
      endsAt,
      requestId: crypto.randomUUID(),
    });

    return this.prisma.appointment.create({
      data: {
        professionalId: createAppointmentDto.professionalId,
        patientId: createAppointmentDto.patientId,
        startsAt,
        endsAt,
        priceCents: price,
        googleCalendarEventId: calendarEvent.eventId,
        meetLink: calendarEvent.meetLink,
      },
    });
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
    const existsAppointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!existsAppointment) {
      throw new NotFoundException('Consulta não encontrada.');
    }

    return existsAppointment;
  }

  async getUpcomingAppointments(userId: string, userRole: Role) {
    const isPatient = userRole === Role.PATIENT;

    return this.prisma.appointment.findMany({
      where: {
        ...(isPatient ? { patientId: userId } : { professionalId: userId }),
        startsAt: { gte: new Date() },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULE_REQUESTED],
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      include: isPatient
        ? {
            professional: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
              select: { specialty: true }
            },
          }
        : {
            patient: {
              include: {
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
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
              select: { specialty: true },
            },
          }
        : {
            patient: {
              include: {
                user: { select: { name: true, avatarUrl: true } },
              },
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

    const isParticipant =
      appointment.patientId === userId ||
      appointment.professionalId === userId;

    if (!isParticipant) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta consulta.',
      );
    }

    const activeStatuses: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.RESCHEDULE_REQUESTED,
    ];

    if (!activeStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'Esta consulta não está disponível para acesso.',
      );
    }

    if (!appointment.meetLink) {
      throw new BadRequestException(
        'Esta consulta não possui link de videoconferência.',
      );
    }

    const now = new Date();
    const startsAt = new Date(appointment.startsAt);
    const endsAt = new Date(appointment.endsAt);

    const JOIN_TOLERANCE_MS = 10 * 60 * 1000;
    const earliestJoinTime = new Date(startsAt.getTime() - JOIN_TOLERANCE_MS);

    const minutesUntilStart = Math.round(
      (startsAt.getTime() - now.getTime()) / (1000 * 60),
    );

    if (now < earliestJoinTime) {
      throw new BadRequestException(
        `A consulta ainda não foi iniciada. Você poderá acessar a sala ${minutesUntilStart} minuto(s) antes do início.`,
      );
    }

    if (now > endsAt) {
      throw new BadRequestException(
        'O horário desta consulta já foi encerrado.',
      );
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

    // Apenas participantes podem baixar o certificado
    const isParticipant =
      appointment.patientId === userId ||
      appointment.professionalId === userId;

    if (!isParticipant) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este certificado.',
      );
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'O certificado só está disponível para consultas concluídas.',
      );
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
}